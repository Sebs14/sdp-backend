import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tipificacion } from './entities/tipificacion.entity.js';

@Injectable()
export class TipificacionesRepository {
  constructor(
    @InjectRepository(Tipificacion)
    private readonly repo: Repository<Tipificacion>,
  ) { }

  async findAll(): Promise<Tipificacion[]> {
    return this.repo.find({ where: { activo: true } });
  }

  async findByKeyword(descripcion: string): Promise<Tipificacion | null> {
    if (!descripcion) return null;
    const all = await this.repo.find({ where: { activo: true } });
    const desc = descripcion.toLowerCase();

    for (const tip of all) {
      const matched = tip.keywords.some((kw) =>
        desc.includes(kw.toLowerCase()),
      );
      if (matched) return tip;
    }
    return null;
  }

  async findByTipificacion(
    t1: string,
    t2: string,
    t3: string,
  ): Promise<Tipificacion | null> {
    return this.repo.findOne({
      where: {
        tipification1: t1,
        tipification2: t2,
        tipification3: t3,
        activo: true,
      },
    });
  }
}
