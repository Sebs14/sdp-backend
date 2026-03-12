import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CentroEscolar } from './entities/centro-escolar.entity.js';

/** Remove accents and normalize for search. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Injectable()
export class CentrosEscolaresRepository {
  constructor(
    @InjectRepository(CentroEscolar)
    private readonly repo: Repository<CentroEscolar>,
  ) { }

  async findByCodigo(codigo: string): Promise<CentroEscolar | null> {
    return this.repo.findOne({ where: { codigo, activo: true } });
  }

  async findAll(): Promise<CentroEscolar[]> {
    return this.repo.find({ where: { activo: true } });
  }

  async findByNombre(nombre: string): Promise<CentroEscolar[]> {
    const needle = normalize(nombre);
    const all = await this.repo.find({ where: { activo: true } });

    // Extract significant words (skip short/common ones)
    const words = needle
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .filter(
        (w) =>
          !['centro', 'escolar', 'complejo', 'educativo', 'del', 'los', 'las', 'de'].includes(w),
      );

    if (words.length === 0) {
      // Fallback: search all words including common ones
      const allWords = needle.split(/\s+/).filter((w) => w.length > 2);
      return all
        .filter((ce) => {
          const n = normalize(ce.nombre);
          return allWords.some((w) => n.includes(w));
        })
        .slice(0, 5);
    }

    // Score each centro by how many significant words match (partial match: 4+ char prefix)
    const scored = all
      .map((ce) => {
        const n = normalize(ce.nombre);
        const matchCount = words.filter((w) => {
          if (n.includes(w)) return true;
          // Partial prefix match (min 4 chars) to tolerate typos like gonzales/gonzalez
          if (w.length >= 4) {
            const prefix = w.slice(0, -1);
            return n.includes(prefix);
          }
          return false;
        }).length;
        return { ce, matchCount };
      })
      .filter((s) => s.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    return scored.slice(0, 5).map((s) => s.ce);
  }
}
