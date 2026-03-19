import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgenteEspecializado } from './entities/agente-especializado.entity.js';

@Injectable()
export class AgentesEspecializadosRepository {
  constructor(
    @InjectRepository(AgenteEspecializado)
    private readonly repo: Repository<AgenteEspecializado>,
  ) {}

  async findByTipification1(
    tipification1: string,
  ): Promise<AgenteEspecializado | null> {
    return this.repo.findOne({
      where: { tipification1, activo: true },
    });
  }

  async findAll(): Promise<AgenteEspecializado[]> {
    return this.repo.find({ where: { activo: true } });
  }
}
