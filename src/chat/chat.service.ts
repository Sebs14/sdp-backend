import { Injectable, Logger } from '@nestjs/common';
import { GrokService } from '../grok/grok.service.js';
import { SessionService } from '../session/session.service.js';
import { FunctionsService } from '../functions/functions.service.js';
import {
  GrokMessage,
  SupportAgentMessage,
  SupportAgentResponse,
} from '../grok/interfaces/grok-message.interface.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';

const MAX_TOOL_ITERATIONS = 10;
const FALLBACK_RESPONSE =
  'Lo siento, ha ocurrido un error. Por favor, intente nuevamente.';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly grokService: GrokService,
    private readonly sessionService: SessionService,
    private readonly functionsService: FunctionsService,
  ) { }

  /**
   * Convert internal history messages to xAI Support Agent format.
   * Only user/assistant messages are sent (no system/tool — tools are
   * handled inline during the tool-call loop).
   */
  private toXaiFormat(msg: GrokMessage): SupportAgentMessage {
    const role =
      msg.role === 'user' ? 'ROLE_USER' : 'ROLE_ASSISTANT';
    return {
      role,
      content: [{ text: msg.content ?? '' }],
    };
  }

  /**
   * Extract the text answer from a Support Agent response.
   */
  private extractAnswer(data: SupportAgentResponse): string {
    const content = data.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content) && content.length > 0) {
      return content[0]?.text ?? '';
    }
    return '';
  }

  async processMessage(
    sessionId: string | undefined,
    userMessage: string,
  ): Promise<ChatResponseDto> {
    // Generate session ID / conversation ID if not provided
    if (!sessionId) {
      sessionId = this.sessionService.generateSessionId();
    }

    // 1. Get conversation history (internal format)
    const history = this.sessionService.getHistory(sessionId);

    // 2. Add user message to internal history
    history.push({ role: 'user', content: userMessage });

    // 3. Build xAI messages from full history (user + assistant only)
    const xaiMessages: SupportAgentMessage[] = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => this.toXaiFormat(m));

    const functionsCalled: string[] = [];

    // 4. Send to Support Agent API
    let data: SupportAgentResponse;
    try {
      data = await this.grokService.sendMessage(sessionId, xaiMessages);
    } catch (error) {
      this.logger.error('Support Agent API call failed', error);
      history.push({ role: 'assistant', content: FALLBACK_RESPONSE });
      this.sessionService.saveHistory(sessionId, history);
      return {
        sessionId,
        message: FALLBACK_RESPONSE,
        role: 'assistant',
        metadata: { functionsCalled, timestamp: new Date().toISOString() },
      };
    }

    // 5. Tool call loop (same pattern as the FastAPI app)
    let answer = '';

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const agentMsg = data.message ?? {};
      const toolCalls = agentMsg.tool_calls ?? [];
      answer = this.extractAnswer(data);

      // No tool calls → final response
      if (toolCalls.length === 0) {
        this.logger.debug(
          `Final response at iteration ${iteration}, length=${answer.length}`,
        );
        break;
      }

      // Process tool calls
      this.logger.log(
        `Iteration ${iteration}: ${toolCalls.length} tool call(s): ${toolCalls.map((tc) => tc.function.name).join(', ')}`,
      );

      // Build re-query messages: assistant entry + tool results
      const assistantContent = Array.isArray(agentMsg.content)
        ? (agentMsg.content as Array<{ text: string }>).filter(
          (item) => item.text?.trim(),
        )
        : typeof agentMsg.content === 'string' && agentMsg.content.trim()
          ? [{ text: agentMsg.content }]
          : [];

      const assistantEntry: SupportAgentMessage = {
        role: 'ROLE_ASSISTANT',
        tool_calls: toolCalls,
      };
      if (assistantContent.length > 0) {
        assistantEntry.content = assistantContent;
      }

      const requeueMessages: SupportAgentMessage[] = [assistantEntry];

      for (const toolCall of toolCalls) {
        const fnName = toolCall.function.name;
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}') as Record<
            string,
            unknown
          >;
        } catch {
          this.logger.warn(
            `Failed to parse tool arguments for ${fnName}`,
          );
        }

        this.logger.log(`Executing tool: ${fnName}`);
        this.logger.log(`Tool args: ${JSON.stringify(fnArgs)}`);
        functionsCalled.push(fnName);

        const result = await this.functionsService.execute(fnName, fnArgs);

        requeueMessages.push({
          role: 'ROLE_TOOL',
          content: [{ text: result }],
          tool_call_id: toolCall.id,
        });
      }

      // Re-query with only the tool turn messages
      try {
        data = await this.grokService.sendMessage(
          sessionId,
          requeueMessages,
        );
      } catch (error) {
        this.logger.error('Re-query after tool calls failed', error);
        answer = FALLBACK_RESPONSE;
        break;
      }
    }

    // If loop exhausted, try extracting the last answer
    if (!answer) {
      answer = this.extractAnswer(data) || FALLBACK_RESPONSE;
    }

    // 6. Add assistant response to internal history
    history.push({ role: 'assistant', content: answer, functionsCalled });
    this.sessionService.saveHistory(sessionId, history);

    return {
      sessionId,
      message: answer,
      role: 'assistant',
      metadata: {
        functionsCalled,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
