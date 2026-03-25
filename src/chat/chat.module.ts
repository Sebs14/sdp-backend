import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { GrokModule } from '../grok/grok.module.js';
import { SessionModule } from '../session/session.module.js';
import { FunctionsModule } from '../functions/functions.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';

@Module({
  imports: [GrokModule, SessionModule, FunctionsModule, UsuariosModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule { }
