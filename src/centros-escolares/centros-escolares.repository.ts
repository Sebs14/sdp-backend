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
          ![
            'centro',
            'escolar',
            'complejo',
            'educativo',
            'del',
            'los',
            'las',
            'de',
          ].includes(w),
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

  /**
   * Search for a centro escolar by any associated phone number.
   * Strips non-digit characters and matches against telefono_asignado,
   * telefono_director, telefono_1, and telefono_monitor.
   */
  async findByTelefono(telefono: string): Promise<CentroEscolar | null> {
    const digits = telefono.replace(/\D/g, '');
    if (digits.length < 8) return null;

    // Match the last 8 digits (local number without country code)
    const suffix = digits.slice(-8);

    const result = await this.repo
      .createQueryBuilder('ce')
      .where('ce.activo = :activo', { activo: true })
      .andWhere(
        `(
          ce.telefono_director LIKE :pattern OR
          ce.telefono_asignado LIKE :pattern OR
          ce.telefono_1 LIKE :pattern OR
          ce.telefono_monitor LIKE :pattern
        )`,
        { pattern: `%${suffix}` },
      )
      .getOne();

    return result;
  }
}
