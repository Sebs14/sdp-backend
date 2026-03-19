import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { ChatService } from '../chat/chat.service.js';
import { SessionService } from '../session/session.service.js';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf;

  /** Mapea chatId de Telegram → sessionId interno del SDP */
  private readonly chatSessionMap = new Map<number, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
  ) {
    const token = this.configService.get<string>('telegram.botToken');
    if (!token) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN no está configurado. Agrega la variable de entorno.',
      );
    }
    this.bot = new Telegraf(token);
  }

  onModuleInit() {
    this.registerHandlers();
    this.bot.launch().catch((err) => {
      this.logger.error('Error al iniciar Telegram bot', err);
    });
    this.logger.log('Telegram bot iniciado correctamente');
  }

  onModuleDestroy() {
    this.bot.stop('NestJS shutdown');
    this.logger.log('Telegram bot detenido');
  }

  private registerHandlers() {
    // /start — inicia o reinicia la sesión
    this.bot.start(async (ctx) => {
      const chatId = ctx.chat.id;
      const sessionId = this.sessionService.generateSessionId();
      this.chatSessionMap.set(chatId, sessionId);

      this.logger.log(
        `Nueva sesión Telegram: chatId=${chatId}, sessionId=${sessionId}`,
      );

      await ctx.reply(
        '¡Bienvenido al Sistema de Despacho de Problemas (SDP) del MINED! 🏫\n\n' +
        'Puedes escribirme tu consulta o problema y te ayudaré a canalizarlo.\n\n' +
        'Escribe /nueva para reiniciar la conversación en cualquier momento.',
      );
    });

    // /nueva — reinicia la sesión
    this.bot.command('nueva', async (ctx) => {
      const chatId = ctx.chat.id;
      const sessionId = this.sessionService.generateSessionId();
      this.chatSessionMap.set(chatId, sessionId);

      this.logger.log(
        `Sesión reiniciada: chatId=${chatId}, sessionId=${sessionId}`,
      );

      await ctx.reply('Sesión reiniciada. ¿En qué puedo ayudarte?');
    });

    // Mensajes de texto — se procesan a través del ChatService existente
    this.bot.on(message('text'), async (ctx) => {
      const chatId = ctx.chat.id;
      const userMessage = ctx.message.text;

      // Obtener o crear sessionId para este chat de Telegram
      let sessionId = this.chatSessionMap.get(chatId);
      if (!sessionId) {
        sessionId = this.sessionService.generateSessionId();
        this.chatSessionMap.set(chatId, sessionId);
      }

      try {
        // Indicador de "escribiendo..."
        await ctx.sendChatAction('typing');

        const response = await this.chatService.processMessage(
          sessionId,
          userMessage,
        );

        // Telegram tiene un límite de 4096 caracteres por mensaje
        const respText =
          response.message || 'No se pudo obtener una respuesta.';
        const chunks = this.splitMessage(respText, 4096);

        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      } catch (error) {
        this.logger.error(
          `Error procesando mensaje Telegram chatId=${chatId}`,
          error,
        );
        await ctx.reply(
          'Lo siento, ocurrió un error al procesar tu mensaje. Intenta nuevamente.',
        );
      }
    });
  }

  /**
   * Divide un mensaje largo en trozos respetando el límite de Telegram.
   */
  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      // Intentar cortar en un salto de línea
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        // Cortar en espacio si no hay buen salto de línea
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }
      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trimStart();
    }

    return chunks;
  }
}
