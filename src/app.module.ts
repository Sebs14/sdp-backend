import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration.js';
import { ChatModule } from './chat/chat.module.js';
import { GrokModule } from './grok/grok.module.js';
import { SessionModule } from './session/session.module.js';
import { FunctionsModule } from './functions/functions.module.js';
import { CentrosEscolaresModule } from './centros-escolares/centros-escolares.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { CentroEscolar } from './centros-escolares/entities/centro-escolar.entity.js';
import { Ticket } from './tickets/entities/ticket.entity.js';
import { Tipificacion } from './tipificaciones/entities/tipificacion.entity.js';
import { TipificacionesModule } from './tipificaciones/tipificaciones.module.js';
import { AgenteEspecializado } from './agentes-especializados/entities/agente-especializado.entity.js';
import { AgentesEspecializadosModule } from './agentes-especializados/agentes-especializados.module.js';
import { VoiceModule } from './voice/voice.module.js';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [CentroEscolar, Ticket, Tipificacion, AgenteEspecializado],
        synchronize: config.get<string>('nodeEnv') === 'development',
      }),
    }),
    ChatModule,
    GrokModule,
    SessionModule,
    FunctionsModule,
    CentrosEscolaresModule,
    TicketsModule,
    TipificacionesModule,
    AgentesEspecializadosModule,
    TelegramBotModule,
    VoiceModule,
  ],
})
export class AppModule { }
