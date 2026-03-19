import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tipificacion } from './entities/tipificacion.entity.js';

@Injectable()
export class TipificacionesRepository {
  constructor(
    @InjectRepository(Tipificacion)
    private readonly repo: Repository<Tipificacion>,
  ) {}

  async findAll(): Promise<Tipificacion[]> {
    return this.repo.find({ where: { activo: true } });
  }

  async findByKeyword(descripcion: string): Promise<Tipificacion | null> {
    if (!descripcion) return null;
    const all = await this.repo.find({ where: { activo: true } });
    const desc = descripcion.toLowerCase();

    let bestTip: Tipificacion | null = null;
    let bestScore = 0;
    let tiedCount = 0;

    for (const tip of all) {
      let score = 0;
      for (const kw of tip.keywords) {
        const kwLower = kw.toLowerCase();
        if (desc.includes(kwLower)) {
          // Longer keywords are more specific, so weight by length
          score += kwLower.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestTip = tip;
        tiedCount = 1;
      } else if (score === bestScore && score > 0) {
        tiedCount++;
      }
    }

    // When multiple entries tie for best score, the match is ambiguous
    // (usually means only shared category-level keywords matched).
    // Return null so the LLM classifier can make a more accurate decision.
    if (bestScore === 0 || tiedCount > 1) {
      return null;
    }

    return bestTip;
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
