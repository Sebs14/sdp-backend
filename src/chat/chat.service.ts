import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrokService } from '../grok/grok.service.js';
import { SessionService } from '../session/session.service.js';
import { FunctionsService } from '../functions/functions.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
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

  private readonly isProduction: boolean;

  constructor(
    private readonly grokService: GrokService,
    private readonly sessionService: SessionService,
    private readonly functionsService: FunctionsService,
    private readonly usuariosService: UsuariosService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
  }

  /**
   * Convert internal history messages to xAI Support Agent format.
   * Only user/assistant messages are sent (no system/tool — tools are
   * handled inline during the tool-call loop).
   */
  private toXaiFormat(msg: GrokMessage): SupportAgentMessage {
    const role = msg.role === 'user' ? 'ROLE_USER' : 'ROLE_ASSISTANT';
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

  /**
   * Use the LLM to extract ALL ticket-relevant fields from the full
   * conversation history. This replaces regex/Q&A pairing with a single
   * structured extraction call via the standard chat completions API.
   */
  private async extractFieldsViaLLM(
    history: GrokMessage[],
  ): Promise<Record<string, unknown>> {
    // Build conversation text
    const conversationText = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map(
        (m) =>
          `${m.role === 'user' ? 'Usuario' : 'Agente'}: ${m.content ?? ''}`,
      )
      .join('\n');

    const systemPrompt = `Eres un extractor de datos estructurados. Dada una conversación entre un usuario y un agente del Sistema de Despacho de Problemas (SDP) del MINED El Salvador, extrae los siguientes campos.

Responde SOLO con un JSON válido con estos campos:
{
  "nombre_solicitante": "nombre completo de quien llama/reporta (la primera persona que se identifica al inicio)",
  "telefono_solicitante": "teléfono en formato XXXX-XXXX",
  "nombre_docente": "nombre completo del docente o directivo reportante (se pide después de la transferencia al agente especializado)",
  "nip": "Número de Identificación Personal del docente",
  "nombre_estudiante": "nombre completo del estudiante involucrado",
  "nie": "Número de Identificación Estudiantil del estudiante"
}

REGLAS:
- Extrae SOLO datos que el usuario proporcionó explícitamente en la conversación.
- Si un dato no fue proporcionado o el usuario dijo "no disponible" / "no tengo" / "no aplica", usa null.
- El nombre_solicitante es quien se identifica al INICIO de la conversación (Fase 1).
- El nombre_docente es quien se identifica DESPUÉS de la transferencia al agente especializado.
- Pueden ser la misma persona o personas diferentes.
- NO inventes datos. Si no están en la conversación, pon null.
- Responde SOLO con el JSON, sin texto adicional.`;

    const result = await this.grokService.extractFieldsFromConversation(
      conversationText,
      systemPrompt,
    );

    if (!result) {
      this.logger.warn(
        'LLM field extraction returned null — falling back to empty',
      );
      return {};
    }

    // Clean up null strings
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result)) {
      if (value === null || value === 'null' || value === '') continue;
      if (
        typeof value === 'string' &&
        /^no\s+(disponible|tengo|aplica)/i.test(value)
      )
        continue;
      cleaned[key] = value;
    }

    this.logger.log(`LLM extracted fields: ${JSON.stringify(cleaned)}`);
    return cleaned;
  }

  async processMessage(
    sessionId: string | undefined,
    userMessage: string,
    callerPhone?: string,
  ): Promise<ChatResponseDto> {
    // Generate session ID / conversation ID if not provided
    if (!sessionId) {
      sessionId = this.sessionService.generateSessionId();
    }

    // 1. Get conversation history (internal format)
    const history = this.sessionService.getHistory(sessionId);

    // Production-only: on first message, identify caller by phone
    if (this.isProduction && callerPhone && history.length === 0) {
      const identificacion =
        await this.usuariosService.identificarPorTelefono(callerPhone);

      if (identificacion.identificado) {
        const usuario = identificacion.usuario as Record<string, unknown>;
        const ce = identificacion.centro_escolar as Record<
          string,
          unknown
        > | null;

        this.logger.log(
          `Caller identified: ${usuario.nombre} (${usuario.rol}) — ${ce?.nombre ?? 'sin CE'}`,
        );

        // Pre-fill case data
        if (ce) {
          this.sessionService.mergeCaseData(sessionId, {
            codigo_centro: ce.codigo,
            nombre_centro: ce.nombre,
            departamento: ce.departamento,
            municipio: ce.municipio,
            distrito: ce.distrito,
            modalidad: ce.modalidad,
          });
        }

        // Inject context as a system-level user message so the agent
        // knows who is calling and can confirm instead of asking
        const ceInfo = ce
          ? `Centro Escolar: ${ce.nombre} (código ${ce.codigo}), ${ce.municipio}, ${ce.departamento}.`
          : 'Sin centro escolar asociado.';

        const contextMsg =
          `[CONTEXTO DEL SISTEMA — NO mostrar al usuario de manera literal]\n` +
          `Se ha identificado al llamante por su número de teléfono.\n` +
          `Nombre: ${usuario.nombre}\n` +
          `Rol: ${usuario.rol}\n` +
          `${ceInfo}\n` +
          `INSTRUCCIÓN: Saluda al usuario por su nombre y confirma que llama desde su centro escolar. ` +
          `Pide que confirme sus datos como capa de seguridad antes de continuar. ` +
          `NO solicites datos que ya tienes — solo pide confirmación.`;

        history.push({ role: 'user', content: contextMsg });
      }
    }

    // 2. Add user message to internal history
    history.push({ role: 'user', content: userMessage });

    // 3. Build xAI messages from full history (user + assistant only)
    const xaiMessages: SupportAgentMessage[] = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => this.toXaiFormat(m));

    const functionsCalled: string[] = [];

    // 4. Send to Support Agent API (use active agent if session was transferred)
    const activeAgentId = this.sessionService.getActiveAgent(sessionId);
    let data: SupportAgentResponse;
    try {
      data = await this.grokService.sendMessage(
        sessionId,
        xaiMessages,
        activeAgentId,
      );
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
        ? (agentMsg.content as Array<{ text: string }>).filter((item) =>
          item.text?.trim(),
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
        this.logger.log(`Raw tool_call: ${JSON.stringify(toolCall)}`);
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}') as Record<
            string,
            unknown
          >;
        } catch {
          this.logger.warn(`Failed to parse tool arguments for ${fnName}`);
        }

        this.logger.log(`Executing tool: ${fnName}`);
        this.logger.log(`Tool args: ${JSON.stringify(fnArgs)}`);
        functionsCalled.push(fnName);

        // xAI Support Agent API sends empty arguments for client-side tools.
        // Inject conversation context so functions can extract the data they need.
        if (Object.keys(fnArgs).length === 0) {
          this.logger.log(
            'Empty tool args detected — injecting conversation context',
          );
          const lastUserMsg = [...history]
            .reverse()
            .find((m) => m.role === 'user');
          const lastAssistantText = answer || '';
          fnArgs = {
            _user_message: lastUserMsg?.content ?? userMessage,
            _assistant_context: lastAssistantText,
          };
        }

        // If this is a transfer call, inject the stored classification
        // so we use the real DB categoria — not what the agent hallucinated.
        if (fnName === 'transferir_a_agente_especializado') {
          const stored = this.sessionService.getCaseData(sessionId);
          if (stored.tipification1) {
            this.logger.log(
              `Injecting stored classification into transfer args`,
            );
            fnArgs = { ...fnArgs, ...stored };
          }
        }

        // For crear_ticket_sdp, inject ALL accumulated case data
        // (centro escolar, classification, description, session_id)
        if (fnName === 'crear_ticket_sdp') {
          const caseData = this.sessionService.getCaseData(sessionId);

          // Use LLM extraction to pull ALL ticket-relevant fields from
          // the full conversation in one structured call.
          const llmFields = await this.extractFieldsViaLLM(history);
          Object.assign(caseData, llmFields);

          this.logger.log(
            `Injecting case data into ticket: ${JSON.stringify(caseData)}`,
          );
          // caseData takes priority over agent-supplied args for key fields,
          // because the agent may hallucinate values like "su nombre como".
          fnArgs = { ...fnArgs, ...caseData, session_id: sessionId };
        }

        const result = await this.functionsService.execute(fnName, fnArgs);

        // Store successful classification for later use by transfer & ticket
        if (fnName === 'clasificar_tipificacion') {
          try {
            const classResult = JSON.parse(result) as Record<string, unknown>;
            if (classResult.clasificado) {
              this.sessionService.mergeCaseData(sessionId, {
                tipification1: classResult.categoria,
                tipification2: classResult.subcategoria,
                tipification3: classResult.item,
                clasificacion: classResult.clasificacion,
                estado_inicial: classResult.estado_inicial,
                grupo_piloto: classResult.grupo_piloto,
                description:
                  fnArgs.descripcion_problema ?? fnArgs._user_message,
              });
            }
          } catch {
            /* ignore parse errors */
          }
        }

        // Store verified centro escolar data
        if (fnName === 'verificar_centro_escolar') {
          try {
            const centroResult = JSON.parse(result) as Record<string, unknown>;
            if (centroResult.encontrado) {
              this.sessionService.mergeCaseData(sessionId, {
                codigo_centro: centroResult.codigo,
                nombre_centro: centroResult.nombre,
                departamento: centroResult.departamento,
                municipio: centroResult.municipio,
                distrito: centroResult.distrito,
                modalidad: centroResult.modalidad,
              });
            }
          } catch {
            /* ignore parse errors */
          }
        }

        // Detect agent transfer — switch session to new agent
        if (fnName === 'transferir_a_agente_especializado') {
          try {
            const transferResult = JSON.parse(result) as Record<
              string,
              unknown
            >;
            if (
              transferResult.transferido &&
              transferResult.support_agent_id &&
              typeof transferResult.support_agent_id === 'string' &&
              !transferResult.support_agent_id.startsWith('PENDIENTE')
            ) {
              this.logger.log(
                `Switching session ${sessionId} to agent: ${transferResult.support_agent_id}`,
              );
              this.sessionService.setActiveAgent(
                sessionId,
                transferResult.support_agent_id,
              );
            }
          } catch {
            this.logger.warn('Failed to parse transfer result');
          }
        }

        requeueMessages.push({
          role: 'ROLE_TOOL',
          content: [{ text: result }],
          tool_call_id: toolCall.id,
        });
      }

      // Re-query: if an agent transfer happened this iteration,
      // start a fresh conversation with the specialised agent, providing
      // a context summary so it knows the full situation.
      const currentAgentId = this.sessionService.getActiveAgent(sessionId);
      const agentWasSwitched =
        currentAgentId !== undefined && currentAgentId !== activeAgentId;

      let reQueryMessages: SupportAgentMessage[];

      if (agentWasSwitched) {
        this.logger.log(
          `Agent transferred — building context handoff for ${currentAgentId}`,
        );

        // Build a summary from the conversation history for the new agent
        const contextLines: string[] = [];
        for (const m of history) {
          if (m.role === 'user') {
            contextLines.push(`Usuario: ${m.content}`);
          } else if (m.role === 'assistant' && m.content) {
            contextLines.push(`Agente anterior: ${m.content}`);
          }
        }

        // Include classification / tool results from this iteration
        const toolResultTexts = requeueMessages
          .filter((m) => m.role === 'ROLE_TOOL')
          .map((m) =>
            Array.isArray(m.content)
              ? m.content.map((c) => c.text).join(' ')
              : '',
          )
          .filter(Boolean);

        // Include structured case data (tipificaciones + centro escolar)
        const caseData = this.sessionService.getCaseData(sessionId);
        const caseDataLines: string[] = [];
        if (caseData.tipification1)
          caseDataLines.push(
            `- Categoría (tipification1): ${caseData.tipification1 as string}`,
          );
        if (caseData.tipification2)
          caseDataLines.push(
            `- Subcategoría (tipification2): ${caseData.tipification2 as string}`,
          );
        if (caseData.tipification3)
          caseDataLines.push(
            `- Item (tipification3): ${caseData.tipification3 as string}`,
          );
        if (caseData.clasificacion)
          caseDataLines.push(
            `- Clasificación: ${caseData.clasificacion as string}`,
          );
        if (caseData.estado_inicial)
          caseDataLines.push(
            `- Estado inicial: ${caseData.estado_inicial as string}`,
          );
        if (caseData.grupo_piloto)
          caseDataLines.push(
            `- Grupo piloto: ${caseData.grupo_piloto as string}`,
          );
        if (caseData.codigo_centro)
          caseDataLines.push(
            `- Código centro escolar: ${caseData.codigo_centro as string}`,
          );
        if (caseData.nombre_centro)
          caseDataLines.push(
            `- Nombre centro escolar: ${caseData.nombre_centro as string}`,
          );
        if (caseData.departamento)
          caseDataLines.push(
            `- Departamento: ${caseData.departamento as string}`,
          );
        if (caseData.municipio)
          caseDataLines.push(`- Municipio: ${caseData.municipio as string}`);
        if (caseData.distrito)
          caseDataLines.push(`- Distrito: ${caseData.distrito as string}`);
        if (caseData.description)
          caseDataLines.push(
            `- Descripción del problema: ${caseData.description as string}`,
          );

        const caseDataBlock =
          caseDataLines.length > 0
            ? `Datos del caso (tipificaciones y centro escolar):\n${caseDataLines.join('\n')}\n\n`
            : '';

        const handoff =
          `[TRANSFERENCIA DE CASO]\n` +
          `Resumen de la conversación previa:\n${contextLines.join('\n')}\n\n` +
          `${caseDataBlock}` +
          `Resultados de herramientas:\n${toolResultTexts.join('\n')}\n\n` +
          `INSTRUCCIONES IMPORTANTES PARA RECOPILAR DATOS:\n` +
          `- Preséntate brevemente y continúa atendiendo el caso.\n` +
          `- Solicita los datos adicionales UNO POR UNO, en este orden:\n` +
          `  1. Primero pregunta SOLO el nombre completo del docente o directivo reportante.\n` +
          `  2. Después de recibir la respuesta, pregunta SOLO su NIP.\n` +
          `  3. Después pregunta SOLO el nombre completo del estudiante involucrado.\n` +
          `  4. Después pregunta SOLO el NIE del estudiante (indicando que puede decir "no disponible").\n` +
          `  5. Finalmente, confirma todos los datos y procede a crear el ticket.\n` +
          `- NUNCA pidas múltiples datos en un solo mensaje.\n` +
          `- NUNCA inventes datos que el usuario no proporcionó.\n` +
          `- Si algún dato no aplica al tipo de caso, omítelo y continúa con el siguiente.`;

        reQueryMessages = [{ role: 'ROLE_USER', content: [{ text: handoff }] }];
      } else {
        reQueryMessages = requeueMessages;
      }

      try {
        data = await this.grokService.sendMessage(
          sessionId,
          reQueryMessages,
          currentAgentId,
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
