import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  SupportAgentMessage,
  SupportAgentResponse,
} from './interfaces/grok-message.interface.js';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly chatUrl: string;
  private readonly completionsUrl: string;
  private readonly extractionModel: string;
  private readonly apiKey: string;
  private readonly supportAgentId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.chatUrl =
      this.configService.get<string>('xai.chatUrl', { infer: true }) ?? '';
    this.completionsUrl =
      this.configService.get<string>('xai.completionsUrl', { infer: true }) ??
      'https://api.x.ai/v1/chat/completions';
    this.extractionModel =
      this.configService.get<string>('xai.extractionModel', { infer: true }) ??
      'grok-3-mini';
    this.apiKey =
      this.configService.get<string>('xai.apiKey', { infer: true }) ?? '';
    this.supportAgentId =
      this.configService.get<string>('xai.supportAgentId', { infer: true }) ??
      '';
  }

  /**
   * Sends messages to the xAI Support Agent /chat endpoint.
   * Returns the raw SupportAgentResponse for the caller to handle tool calls.
   */
  async sendMessage(
    conversationId: string,
    messages: SupportAgentMessage[],
    overrideAgentId?: string,
  ): Promise<SupportAgentResponse> {
    const agentId = overrideAgentId || this.supportAgentId;
    this.logger.debug(
      `Sending ${messages.length} messages to Support Agent ${agentId} (conversation: ${conversationId})`,
    );

    const body = {
      support_agent_id: agentId,
      conversation_id: conversationId,
      environment: 'ENVIRONMENT_PROD',
      messages,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<SupportAgentResponse>(this.chatUrl, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.debug('Support Agent response received');
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error calling Support Agent API',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  /**
   * Call the standard xAI chat completions endpoint to extract structured
   * data from a conversation history. Returns parsed JSON or null on failure.
   */
  async extractFieldsFromConversation(
    conversationText: string,
    systemPrompt: string,
  ): Promise<Record<string, unknown> | null> {
    this.logger.log('Extracting fields via LLM completions API');

    const body = {
      model: this.extractionModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversationText },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          choices: Array<{ message: { content: string } }>;
        }>(this.completionsUrl, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
        }),
      );

      const text = response.data?.choices?.[0]?.message?.content ?? '';
      this.logger.debug(`Extraction LLM raw response: ${text.slice(0, 500)}`);

      // Parse JSON from response
      const trimmed = text.trim();
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start < 0 || end < 0) return null;

      return JSON.parse(trimmed.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
    } catch (error) {
      this.logger.error(
        'Error extracting fields via completions API',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}
