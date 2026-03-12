import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Room,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  ParticipantKind,
  RoomEvent,
  TrackSource,
} from '@livekit/rtc-node';
import { llm, voice, initializeLogger } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { z } from 'zod';
import { FunctionsService } from '../functions/functions.service.js';
import type { WebhookPayload } from './interfaces/webhook-payload.interface.js';

// Voice-specific supplement to the Support Agent's built-in instructions.
// The main prompt (classification flow, phases, etc.) is configured in the
// xAI Console on the Support Agent itself.
const VOICE_INSTRUCTIONS = `
Estás atendiendo una llamada telefónica del Sistema de Despacho de Problemas
(SDP) del MINED El Salvador. Sé conciso y conversacional — estas son respuestas
habladas. No anuncies las herramientas antes de usarlas; simplemente úsalas y
responde con el resultado. Solicita los datos uno por uno.
Cuando necesites un código numérico (como código de centro escolar), dile al
usuario que puede dictarlo o marcarlo en el teclado de su teléfono.
`.trim();

@Injectable()
export class VoiceService implements OnModuleInit {
  private readonly logger = new Logger(VoiceService.name);

  private readonly apiKey: string;
  private readonly livekitHost: string;
  private readonly voiceApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly functionsService: FunctionsService,
  ) {
    this.apiKey = this.configService.get<string>('xai.apiKey', '');
    this.livekitHost = this.configService.get<string>(
      'voice.livekitHost',
      'wss://livekit-enterprise.grok.com',
    );
    this.voiceApiUrl = this.configService.get<string>(
      'voice.voiceApiUrl',
      'wss://api.x.ai/v1/support-agent/voice',
    );
  }

  onModuleInit() {
    initializeLogger({ pretty: true, level: 'debug' });
    this.patchRealtimeSessionForXai();

    if (!this.apiKey) {
      this.logger.warn('XAI_API_KEY not set — voice sessions will fail');
    }
    this.logger.log('Voice service ready');
    this.logger.log(`  LiveKit Host : ${this.livekitHost}`);
    this.logger.log(`  Voice API    : ${this.voiceApiUrl}`);
  }

  /**
   * Monkey-patch the beta RealtimeSession so that session.update events
   * sent over the WebSocket contain ONLY fields xAI's Support Agent API
   * understands.  The plugin defaults include OpenAI-specific values
   * (model: 'gpt-4o-realtime-preview-…', voice: 'alloy', temperature,
   * etc.) that xAI silently rejects, producing empty responses.
   */
  private patchRealtimeSessionForXai(): void {
    const proto = openai.realtime.beta.RealtimeSession
      .prototype as unknown as Record<string, unknown>;
    const origSendEvent = proto['sendEvent'] as (cmd: unknown) => void;
    if (!origSendEvent) return;

    const logger = this.logger;
    proto['sendEvent'] = function (event: Record<string, unknown>) {
      if (event?.type === 'session.update') {
        const s = event['session'] as Record<string, unknown> | undefined;
        // Keep only the fields xAI actually supports
        event = {
          type: 'session.update',
          session: {
            turn_detection: s?.['turn_detection'] ?? { type: 'server_vad' },
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            modalities: ['text', 'audio'],
          },
        };
        logger.debug(`Patched session.update → ${JSON.stringify(event)}`);
      }
      return origSendEvent.call(this, event);
    };
    this.logger.log('Patched beta RealtimeSession.sendEvent for xAI compatibility');
  }

  // ─── Webhook Parsing ────────────────────────────────────────────────────────

  parseWebhookPayload(raw: Record<string, unknown>): WebhookPayload {
    let bodyData: Record<string, unknown> = {};
    if (typeof raw.body === 'string') {
      try {
        bodyData = JSON.parse(raw.body) as Record<string, unknown>;
      } catch {
        /* ignore parse errors */
      }
    } else if (typeof raw.body === 'object' && raw.body !== null) {
      bodyData = raw.body as Record<string, unknown>;
    }

    return {
      token: (raw.token as string) ?? '',
      body: bodyData,
      supportAgentId: (raw.support_agent_id as string) ?? '',
      phoneNumber: (raw.phone_number as string) ?? '',
      conversationId: (raw.conversation_id as string) ?? '',
      teamId: (raw.team_id as string) ?? '',
      roomName: (raw.room_name as string) ?? '',
      dtmfEnabled: (raw.dtmf_enabled as boolean) ?? false,
      participant:
        (bodyData.participant as Record<string, unknown>) ?? {},
    };
  }

  // ─── Voice Session ──────────────────────────────────────────────────────────

  async handleVoiceSession(payload: WebhookPayload): Promise<void> {
    const {
      token,
      supportAgentId,
      conversationId,
      phoneNumber,
      teamId,
      roomName,
    } = payload;

    const tag = conversationId.slice(0, 8);

    // Build xAI Voice API URL with call metadata.
    // IMPORTANT: The OpenAI Realtime plugin appends "/realtime" to the last
    // query-param value via string concatenation before parsing.  We add a
    // disposable trailing "&_=x" so the real params stay intact.
    const params = new URLSearchParams({
      support_agent_id: supportAgentId,
      conversation_id: conversationId,
      team_id: teamId,
    });
    if (phoneNumber) params.set('phone_number', phoneNumber);
    if (roomName) params.set('room_name', roomName);
    params.set('_', 'x'); // absorbs the "/realtime" the plugin appends
    const xaiUrl = `${this.voiceApiUrl}?${params.toString()}`;

    this.logger.log(`[${tag}] Starting voice session`);
    this.logger.log(`[${tag}] xAI WS base URL: ${xaiUrl}`);

    const room = new Room();
    let session: voice.AgentSession | null = null;
    let dtmfTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      // ── Step 1: Connect to LiveKit room ──────────────────────────────────
      await room.connect(this.livekitHost, token, {
        autoSubscribe: true,
        dynacast: false,
      });
      this.logger.log(`[${tag}] Connected to LiveKit room: ${room.name}`);

      // ── Step 2: Wait for the SIP participant (the phone caller) ──────────
      const sipParticipant = await this.waitForSipParticipant(room);
      this.logger.log(
        `[${tag}] SIP participant joined: ${sipParticipant.identity}`,
      );

      // ── Step 2b: Wait for the audio track to be subscribed ───────────────
      await this.waitForTrackSubscription(room, sipParticipant, tag);
      this.logger.log(`[${tag}] Audio track subscribed`);

      // ── Step 3: Create RealtimeModel pointing to xAI Voice API ──────────
      // Use the BETA (older) Realtime API format.  The GA model sends a nested
      // session.update (audio.input.turn_detection) that xAI does not understand.
      // The beta model sends the flat format (turn_detection at session root)
      // which xAI's Support Agent voice endpoint expects.
      // Explicit server_vad keeps capabilities.turnDetection === true for
      // 'realtime_llm' mode and is the only type xAI accepts.
      this.logger.log(`[${tag}] RealtimeModel created`);

      // ── Step 4: Create Agent + Session, wire tools, and start ────────────
      const tools = this.createToolContext();

      // ── Accumulate data collected during the call ─────────────────────
      // This object survives across agent transfers (it lives in the
      // handleVoiceSession closure).  Tool wrappers below populate it;
      // the transfer tool and Agent 2's crear_ticket_sdp read from it
      // so no data is ever lost even if the xAI agent doesn't forward it.
      const collectedData: Record<string, unknown> = {
        telefono_solicitante: phoneNumber,
        session_id: conversationId,
      };

      // Wrap verificar_centro_escolar to capture centro data
      tools.verificar_centro_escolar = llm.tool({
        description: 'Verifica si existe un centro escolar por código o nombre',
        parameters: z.object({
          codigo_centro: z.string().optional().describe('Código del centro escolar'),
          nombre_centro: z.string().optional().describe('Nombre del centro escolar'),
        }).passthrough(),
        execute: async (args: Record<string, unknown>): Promise<string> => {
          this.logger.log(`Tool call: verificar_centro_escolar(${JSON.stringify(args)})`);
          const result = await this.functionsService.execute('verificar_centro_escolar', args);
          try {
            const parsed = JSON.parse(result);
            if (parsed.encontrado) {
              Object.assign(collectedData, {
                codigo_centro: parsed.codigo,
                nombre_centro: parsed.nombre,
                departamento: parsed.departamento,
                municipio: parsed.municipio,
                distrito: parsed.distrito,
                modalidad: parsed.modalidad,
              });
              this.logger.log(`[${tag}] Collected centro: ${JSON.stringify(collectedData)}`);
            }
          } catch { /* ignore */ }
          return result;
        },
      });

      // Wrap clasificar_tipificacion to capture classification data
      tools.clasificar_tipificacion = llm.tool({
        description: 'Clasifica la tipificación del problema reportado por el usuario',
        parameters: z.object({
          descripcion_problema: z.string().describe('Descripción del problema reportado'),
        }).passthrough(),
        execute: async (args: Record<string, unknown>): Promise<string> => {
          this.logger.log(`Tool call: clasificar_tipificacion(${JSON.stringify(args)})`);
          const result = await this.functionsService.execute('clasificar_tipificacion', args);
          try {
            const parsed = JSON.parse(result);
            if (parsed.clasificado) {
              Object.assign(collectedData, {
                tipification1: parsed.categoria,
                tipification2: parsed.subcategoria,
                tipification3: parsed.item,
                clasificacion: parsed.clasificacion,
                estado_inicial: parsed.estado_inicial,
                grupo_piloto: parsed.grupo_piloto,
                grupo_estandar: parsed.grupo_estandar,
              });
              const desc = (args as Record<string, unknown>).descripcion_problema;
              if (desc) {
                collectedData.descripcion = desc;
                collectedData.description = desc;
              }
              this.logger.log(`[${tag}] Collected classification: ${JSON.stringify(collectedData)}`);
            }
          } catch { /* ignore */ }
          return result;
        },
      });

      // Build a factory that creates a new Agent pointing to any xAI Support Agent.
      // Used both for the initial agent and for live transfers.
      const buildAgent = (agentUrl: string, agentTools: llm.ToolContext, instructions?: string) => {
        const m = new openai.realtime.beta.RealtimeModel({
          baseURL: agentUrl,
          apiKey: this.apiKey,
          turnDetection: {
            type: 'server_vad',
            threshold: 0.6,
            silence_duration_ms: 500,
            prefix_padding_ms: 300,
          },
          inputAudioTranscription: null,
        });
        return new voice.Agent({
          instructions: instructions ?? VOICE_INSTRUCTIONS,
          llm: m,
          tools: agentTools,
          turnDetection: 'realtime_llm',
        });
      };

      session = new voice.AgentSession({
        turnDetection: 'realtime_llm',
      });

      // Override the transfer tool BEFORE creating the initial agent.
      // The standard tool only returns JSON; this version also creates a new
      // RealtimeModel → Agent and calls session.updateAgent() so the call
      // physically moves to the target xAI Support Agent.
      tools.transferir_a_agente_especializado = llm.tool({
        description:
          'Transfiere la conversación a un agente especializado según la categoría. Incluye TODOS los datos ya recopilados.',
        parameters: z
          .object({
            categoria: z
              .string()
              .optional()
              .describe('Categoría del problema'),
            tipification1: z.string().optional().describe('Categoría'),
            tipification2: z.string().optional().describe('Subcategoría'),
            tipification3: z.string().optional().describe('Item'),
            descripcion: z.string().optional().describe('Descripción del problema'),
            codigo_centro: z.string().optional().describe('Código del centro escolar'),
            nombre_centro: z.string().optional().describe('Nombre del centro escolar'),
            departamento: z.string().optional().describe('Departamento'),
            municipio: z.string().optional().describe('Municipio'),
            distrito: z.string().optional().describe('Distrito'),
            modalidad: z.string().optional().describe('Modalidad'),
          })
          .passthrough(),
        execute: async (args: Record<string, unknown>): Promise<string> => {
          this.logger.log(
            `Tool call: transferir_a_agente_especializado(${JSON.stringify(args)})`,
          );
          const result = await this.functionsService.execute(
            'transferir_a_agente_especializado',
            args,
          );

          // Parse the result to get the target support_agent_id
          try {
            const parsed = JSON.parse(result) as Record<string, unknown>;
            if (parsed.transferido && parsed.support_agent_id) {
              const newAgentId = parsed.support_agent_id as string;
              this.logger.log(
                `[${tag}] Performing live agent swap → ${parsed.nombre_agente} (${newAgentId})`,
              );

              // Build new xAI Voice URL with the target agent's support_agent_id
              const transferParams = new URLSearchParams({
                support_agent_id: newAgentId,
                conversation_id: conversationId,
                team_id: teamId,
              });
              if (phoneNumber) transferParams.set('phone_number', phoneNumber);
              if (roomName) transferParams.set('room_name', roomName);
              transferParams.set('_', 'x');
              const newUrl = `${this.voiceApiUrl}?${transferParams.toString()}`;

              // Use collectedData (populated by tool wrappers) — reliable
              // regardless of what the xAI agent passes in args.
              this.logger.log(`[${tag}] Transfer collectedData: ${JSON.stringify(collectedData)}`);

              const transferInstructions = `${VOICE_INSTRUCTIONS}

CONTEXTO DE LA TRANSFERENCIA — Usa estos datos tal cual al crear el ticket.
NO los preguntes de nuevo ni intentes reclasificar:
- tipification1: ${collectedData.tipification1 ?? 'no especificado'}
- tipification2: ${collectedData.tipification2 ?? 'no especificado'}
- tipification3: ${collectedData.tipification3 ?? 'no especificado'}
- descripcion: ${collectedData.descripcion ?? 'no especificado'}
- codigo_centro: ${collectedData.codigo_centro ?? 'pendiente'}
- nombre_centro: ${collectedData.nombre_centro ?? 'pendiente'}
- departamento: ${collectedData.departamento ?? 'pendiente'}
- municipio: ${collectedData.municipio ?? 'pendiente'}
- distrito: ${collectedData.distrito ?? 'pendiente'}
- modalidad: ${collectedData.modalidad ?? 'pendiente'}
- telefono_solicitante: ${phoneNumber ?? 'pendiente'}
- clasificacion: ${collectedData.clasificacion ?? ''}
- estado_inicial: ${collectedData.estado_inicial ?? ''}
- grupo_piloto: ${collectedData.grupo_piloto ?? ''}

Ya fuiste transferido como agente especializado. Recopila SOLO:
1. Nombre del solicitante (nombre_solicitante)
2. Nombre del docente (nombre_docente) y NIP (nip)
3. Nombre del estudiante (nombre_estudiante) y NIE (nie)

Cuando llames a crear_ticket_sdp DEBES pasar CADA campo por separado:
  nombre_solicitante, nombre_docente, nip, nombre_estudiante, nie.
NO incluyas esos datos solo en la descripción — usa los parámetros individuales.
Los datos de centro escolar y clasificación ya están precargados.
`.trim();

              // Agent 2 tools: override crear_ticket_sdp to auto-fill
              // from collectedData so the ticket always has complete data.
              const newTools = this.createToolContext();
              newTools.crear_ticket_sdp = llm.tool({
                description: 'Crea un ticket en el SDP. OBLIGATORIO pasar cada campo recopilado por separado (nombre_solicitante, nombre_docente, nip, nombre_estudiante, nie). Centro y clasificación se llenan automáticamente.',
                parameters: z.object({
                  nombre_solicitante: z.string().describe('OBLIGATORIO: Nombre completo de quien reporta'),
                  nombre_docente: z.string().optional().describe('Nombre del docente involucrado — MUST pasar si fue recopilado'),
                  nip: z.string().optional().describe('NIP del docente — MUST pasar si fue recopilado'),
                  nombre_estudiante: z.string().optional().describe('Nombre del estudiante afectado — MUST pasar si fue recopilado'),
                  nie: z.string().optional().describe('NIE del estudiante — MUST pasar si fue recopilado'),
                }).passthrough(),
                execute: async (ticketArgs: Record<string, unknown>): Promise<string> => {
                  // collectedData is the source of truth for fields our
                  // backend captured directly from tool results.  The agent
                  // may send garbage ("no disponible") or re-classify wrongly,
                  // so we lock those fields and reject placeholder values.
                  const merged: Record<string, unknown> = { ...collectedData };
                  const lockedKeys = new Set([
                    'codigo_centro', 'nombre_centro', 'departamento',
                    'municipio', 'distrito', 'modalidad',
                    'tipification1', 'tipification2', 'tipification3',
                    'clasificacion', 'estado_inicial', 'grupo_piloto',
                    'grupo_estandar', 'descripcion', 'description',
                    'telefono_solicitante', 'session_id',
                  ]);
                  const junk = new Set([
                    'no disponible', 'no especificado', 'no proporcionado',
                    'pendiente', 'n/a', 'no aplica',
                  ]);
                  for (const [k, v] of Object.entries(ticketArgs)) {
                    if (v === undefined || v === null || v === '') continue;
                    if (junk.has(String(v).toLowerCase().trim())) continue;
                    if (lockedKeys.has(k) && merged[k] != null) continue;
                    merged[k] = v;
                  }

                  // Fallback: the xAI agent puts student/docente info in
                  // its "description" text instead of as separate fields
                  // (because the Console tool schema lacks those params).
                  // Try to extract nombre_estudiante from the agent's description.
                  if (!merged.nombre_estudiante) {
                    const agentDesc = String(ticketArgs.description ?? '');
                    const m = agentDesc.match(/(?:estudiante|alumno|alumna)\s+(.+?)[\.\,\s]*$/i);
                    if (m) merged.nombre_estudiante = m[1].trim();
                  }

                  this.logger.log(`[${tag}] Agent raw args: ${JSON.stringify(ticketArgs)}`);
                  this.logger.log(`[${tag}] crear_ticket_sdp merged: ${JSON.stringify(merged)}`);
                  return this.functionsService.execute('crear_ticket_sdp', merged);
                },
              });

              const newAgent = buildAgent(newUrl, newTools, transferInstructions);
              session!.updateAgent(newAgent);

              this.logger.log(`[${tag}] Agent swap initiated`);
            }
          } catch (err) {
            this.logger.warn(`[${tag}] Could not parse transfer result for agent swap: ${err}`);
          }

          return result;
        },
      });

      // Now create the initial agent with the overridden tools
      const agent = buildAgent(xaiUrl, tools);

      // Debug event listeners
      const Events = voice.AgentSessionEventTypes;
      session.on(Events.AgentStateChanged, (ev) => {
        this.logger.log(`[${tag}] Agent state: ${ev.oldState} → ${ev.newState}`);
      });
      session.on(Events.UserStateChanged, (ev) => {
        this.logger.log(`[${tag}] User state: ${ev.oldState} → ${ev.newState}`);
      });
      session.on(Events.Error, (ev) => {
        this.logger.error(`[${tag}] Agent error: ${(ev.error as Error)?.message ?? ev}`);
      });
      session.on(Events.Close, () => {
        this.logger.log(`[${tag}] AgentSession closed event`);
      });

      // ── Step 4b: Listen for DTMF tones (dialpad digits) ──────────────
      // DTMF is far more reliable than speech-to-text for numeric codes.
      // Buffer digits until 1.5 s of silence, then inject them into the
      // Realtime API as a user message so the AI can process them.
      let dtmfBuffer = '';
      const DTMF_FLUSH_MS = 1500;

      const flushDtmf = () => {
        if (!dtmfBuffer) return;
        const digits = dtmfBuffer;
        dtmfBuffer = '';
        this.logger.log(`[${tag}] DTMF digits received: ${digits}`);
        // Inject the digits into the realtime conversation
        const realtimeSession = (session as any)?.activity?.realtimeSession;
        if (realtimeSession?.sendEvent) {
          realtimeSession.sendEvent({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: digits }],
            },
          });
          realtimeSession.sendEvent({ type: 'response.create' });
        } else {
          this.logger.warn(`[${tag}] Cannot inject DTMF — realtimeSession not available`);
        }
      };

      room.on(RoomEvent.DtmfReceived, (code: number, digit: string) => {
        this.logger.log(`[${tag}] DTMF tone: ${digit} (code=${code})`);
        dtmfBuffer += digit;
        if (dtmfTimer) clearTimeout(dtmfTimer);
        dtmfTimer = setTimeout(flushDtmf, DTMF_FLUSH_MS);
      });

      await session.start({
        agent,
        room: room as any,
        inputOptions: {
          participantIdentity: sipParticipant.identity,
        },
      });
      this.logger.log(`[${tag}] Voice agent started with tools`);

      // ── Step 5: Wait for the call to end ─────────────────────────────────
      await this.waitForDisconnect(room, sipParticipant);
    } catch (error) {
      this.logger.error(`[${tag}] Session error: ${error}`);
    } finally {
      // Close the RealtimeSession's WebSocket to xAI.
      // Without this, xAI keeps sending responses every ~5 s after hangup.
      try {
        const rs = (session as any)?.activity?.realtimeSession;
        if (rs?.close) await rs.close();
      } catch {
        /* ignore — session may already be closed */
      }
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
      if (dtmfTimer) clearTimeout(dtmfTimer);
      this.logger.log(`[${tag}] Voice session ended`);
    }
  }

  // ─── LiveKit Helpers ────────────────────────────────────────────────────────

  private waitForSipParticipant(room: Room): Promise<RemoteParticipant> {
    return new Promise((resolve, reject) => {
      // Check participants already in the room
      for (const p of room.remoteParticipants.values()) {
        if (p.kind === ParticipantKind.SIP) {
          resolve(p);
          return;
        }
      }

      // Wait for the SIP participant to connect
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for SIP participant (30 s)'));
      }, 30_000);

      room.on(
        RoomEvent.ParticipantConnected,
        (participant: RemoteParticipant) => {
          if (participant.kind === ParticipantKind.SIP) {
            clearTimeout(timeout);
            resolve(participant);
          }
        },
      );
    });
  }

  private waitForTrackSubscription(
    room: Room,
    participant: RemoteParticipant,
    tag: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already subscribed
      for (const pub of participant.trackPublications.values()) {
        if (
          pub.source === TrackSource.SOURCE_MICROPHONE &&
          pub.track
        ) {
          this.logger.log(`[${tag}] Audio track already subscribed`);
          resolve();
          return;
        }
      }

      const timeout = setTimeout(() => {
        this.logger.warn(`[${tag}] Timeout waiting for audio track subscription`);
        // Resolve anyway — the agent library will subscribe via its own listener
        resolve();
      }, 10_000);

      const onSubscribed = (
        _track: RemoteTrack,
        publication: RemoteTrackPublication,
        p: RemoteParticipant,
      ) => {
        if (
          p.identity === participant.identity &&
          publication.source === TrackSource.SOURCE_MICROPHONE
        ) {
          clearTimeout(timeout);
          room.off(RoomEvent.TrackSubscribed, onSubscribed);
          resolve();
        }
      };

      room.on(RoomEvent.TrackSubscribed, onSubscribed);
    });
  }

  private waitForDisconnect(
    room: Room,
    sipParticipant: RemoteParticipant,
  ): Promise<void> {
    return new Promise((resolve) => {
      room.on(
        RoomEvent.ParticipantDisconnected,
        (p: RemoteParticipant) => {
          if (p.identity === sipParticipant.identity) {
            resolve();
          }
        },
      );
      room.on(RoomEvent.Disconnected, () => resolve());
    });
  }

  // ─── Tool Definitions ───────────────────────────────────────────────────────
  //
  // These mirror the tools configured on the xAI Support Agent.
  // When the AI decides to call a tool, the voice Agent dispatches it here,
  // we execute it via FunctionsService, and return the result to the AI.
  //
  // Parameters use .passthrough() so extra fields the AI sends are forwarded
  // to FunctionsService without being stripped.

  private createToolContext(): llm.ToolContext {
    const exec = (name: string) => {
      return async (args: Record<string, unknown>): Promise<string> => {
        this.logger.log(`Tool call: ${name}(${JSON.stringify(args)})`);
        return this.functionsService.execute(name, args);
      };
    };

    return {
      verificar_centro_escolar: llm.tool({
        description:
          'Verifica si existe un centro escolar por código o nombre',
        parameters: z
          .object({
            codigo_centro: z
              .string()
              .optional()
              .describe('Código del centro escolar'),
            nombre_centro: z
              .string()
              .optional()
              .describe('Nombre del centro escolar'),
          })
          .passthrough(),
        execute: exec('verificar_centro_escolar'),
      }),

      clasificar_tipificacion: llm.tool({
        description:
          'Clasifica la tipificación del problema reportado por el usuario',
        parameters: z
          .object({
            descripcion_problema: z
              .string()
              .describe('Descripción del problema reportado'),
          })
          .passthrough(),
        execute: exec('clasificar_tipificacion'),
      }),

      crear_ticket_sdp: llm.tool({
        description: 'Crea un ticket en el Sistema de Despacho de Problemas',
        parameters: z
          .object({
            nombre_solicitante: z
              .string()
              .optional()
              .describe('Nombre de quien reporta'),
            telefono_solicitante: z
              .string()
              .optional()
              .describe('Teléfono del solicitante'),
            nombre_docente: z
              .string()
              .optional()
              .describe('Nombre del docente'),
            nip: z.string().optional().describe('NIP del docente'),
            nombre_estudiante: z
              .string()
              .optional()
              .describe('Nombre del estudiante'),
            nie: z.string().optional().describe('NIE del estudiante'),
          })
          .passthrough(),
        execute: exec('crear_ticket_sdp'),
      }),

      transferir_a_agente_especializado: llm.tool({
        description:
          'Transfiere la conversación a un agente especializado según la categoría',
        parameters: z
          .object({
            categoria: z
              .string()
              .optional()
              .describe('Categoría del problema'),
          })
          .passthrough(),
        execute: exec('transferir_a_agente_especializado'),
      }),

      escalar_operador_humano: llm.tool({
        description:
          'Escala la conversación a un operador humano cuando el agente no puede resolver',
        parameters: z
          .object({
            motivo: z
              .string()
              .optional()
              .describe('Motivo de la escalación'),
          })
          .passthrough(),
        execute: exec('escalar_operador_humano'),
      }),

      end_call: llm.tool({
        description: 'Finaliza la llamada telefónica',
        parameters: z.object({}).passthrough(),
        execute: async (): Promise<string> => {
          this.logger.log('Tool call: end_call()');
          return JSON.stringify({ success: true, mensaje: 'Llamada finalizada' });
        },
      }),
    };
  }
}
