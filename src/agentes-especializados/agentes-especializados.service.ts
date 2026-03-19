import { Injectable, Logger } from '@nestjs/common';
import { AgentesEspecializadosRepository } from './agentes-especializados.repository.js';
import { AgenteEspecializado } from './entities/agente-especializado.entity.js';

@Injectable()
export class AgentesEspecializadosService {
  private readonly logger = new Logger(AgentesEspecializadosService.name);

  constructor(private readonly repository: AgentesEspecializadosRepository) {}

  async findByTipification1(
    tipification1: string,
  ): Promise<AgenteEspecializado | null> {
    this.logger.debug(`Buscando agente para tipification1: ${tipification1}`);
    return this.repository.findByTipification1(tipification1);
  }

  async findAll(): Promise<AgenteEspecializado[]> {
    return this.repository.findAll();
  }
}
