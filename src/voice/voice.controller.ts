import { Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { VoiceService } from './voice.service.js';

/**
 * Webhook controller that xAI calls when a phone call arrives via Twilio/SIP.
 *
 * Configure this URL in the xAI Console → Support Agent →
 * "Connect your own phone numbers" → Webhook URL:
 *   POST https://<your-domain>/api/voice/webhook
 */
@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voiceService: VoiceService) { }

  @Post('webhook')
  @ApiOperation({
    summary: 'xAI Voice incoming call webhook',
    description: `Recibe notificaciones de llamadas entrantes desde xAI.

Cuando una llamada llega vía **Twilio → SIP → xAI LiveKit**, el dispatcher de xAI
envía un POST a este endpoint con un token de LiveKit. El servidor usa ese token
para unirse a la sala y hacer el bridge de audio con la IA.

**Flujo:** Phone → Twilio → SIP → xAI LiveKit → POST /api/voice/webhook → NestJS Server

**Configuración en xAI Console:**
1. Support Agent → "Connect your own phone numbers"
2. Webhook URL: \`https://<tu-dominio>/api/voice/webhook\``,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'LiveKit room token para unirse a la llamada',
        },
        body: {
          type: 'string',
          description: 'JSON string del evento webhook de LiveKit',
        },
        support_agent_id: {
          type: 'string',
          description: 'ID del Support Agent de xAI',
          example: 'support_agent_abc123',
        },
        phone_number: {
          type: 'string',
          description: 'Número de teléfono del llamante (E.164)',
          example: '+50312345678',
        },
        conversation_id: {
          type: 'string',
          description: 'ID único de la conversación',
        },
        team_id: { type: 'string', description: 'Team ID de xAI Console' },
        room_name: { type: 'string', description: 'Nombre de la sala LiveKit' },
        dtmf_enabled: {
          type: 'boolean',
          description: 'Si los tonos DTMF están habilitados',
        },
      },
      required: ['token', 'support_agent_id', 'conversation_id'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook recibido — la sesión de voz se inicia en background',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        conversation_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido o token faltante',
  })
  webhook(@Req() req: Request, @Res() res: Response): void {
    this.logger.log('Incoming call webhook');

    try {
      const payload = this.voiceService.parseWebhookPayload(
        req.body as Record<string, unknown>,
      );

      this.logger.log(`  Phone Number    : ${payload.phoneNumber}`);
      this.logger.log(`  Conversation ID : ${payload.conversationId}`);
      this.logger.log(`  Room Name       : ${payload.roomName}`);

      // Validate SIP participant
      const participant = payload.participant;
      if (participant.kind !== 'SIP') {
        this.logger.warn('Ignoring non-SIP participant');
        res.status(200).json({ status: 'ok', message: 'ignored non-SIP' });
        return;
      }

      if (!payload.token) {
        this.logger.error('No LiveKit token in payload');
        res.status(400).json({ status: 'error', message: 'missing token' });
        return;
      }

      // Respond immediately — handle the call in the background
      res.status(200).json({
        status: 'ok',
        conversation_id: payload.conversationId,
      });

      // Spawn voice session (fire-and-forget)
      this.voiceService.handleVoiceSession(payload).catch((err: unknown) => {
        this.logger.error(
          `Voice session error [${payload.conversationId}]: ${String(err)}`,
        );
      });
    } catch (error) {
      this.logger.error(`Failed to parse webhook: ${String(error)}`);
      res.status(400).json({ status: 'error', message: 'invalid payload' });
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Voice service health check' })
  @ApiResponse({
    status: 200,
    description: 'Servicio de voz activo',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-03-11T12:00:00.000Z' },
      },
    },
  })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
