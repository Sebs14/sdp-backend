import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenteEspecializado } from './entities/agente-especializado.entity.js';
import { AgentesEspecializadosRepository } from './agentes-especializados.repository.js';
import { AgentesEspecializadosService } from './agentes-especializados.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AgenteEspecializado])],
  providers: [AgentesEspecializadosRepository, AgentesEspecializadosService],
  exports: [AgentesEspecializadosService],
})
export class AgentesEspecializadosModule {}
