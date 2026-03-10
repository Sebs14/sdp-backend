import { Injectable, Logger } from '@nestjs/common';
import { TipificacionesRepository } from './tipificaciones.repository.js';
import { Tipificacion } from './entities/tipificacion.entity.js';

@Injectable()
export class TipificacionesService {
  private readonly logger = new Logger(TipificacionesService.name);

  constructor(private readonly repository: TipificacionesRepository) { }

  async findAll(): Promise<Tipificacion[]> {
    return this.repository.findAll();
  }

  async clasificarPorDescripcion(
    descripcion: string,
  ): Promise<Tipificacion | null> {
    this.logger.debug(`Clasificando por descripción: ${descripcion}`);
    return this.repository.findByKeyword(descripcion);
  }

  async findByTipificacion(
    t1: string,
    t2: string,
    t3: string,
  ): Promise<Tipificacion | null> {
    return this.repository.findByTipificacion(t1, t2, t3);
  }
}
