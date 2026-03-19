import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { SessionModule } from '../session/session.module.js';
import { TelegramBotService } from './telegram-bot.service.js';

@Module({
  imports: [ChatModule, SessionModule],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule { }
