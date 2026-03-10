import { Injectable, Logger } from '@nestjs/common';
import { TipificacionesService } from '../tipificaciones/tipificaciones.service.js';

@Injectable()
export class ClasificarTipificacionService {
  private readonly logger = new Logger(ClasificarTipificacionService.name);

  constructor(private readonly tipificacionesService: TipificacionesService) { }

  async execute(args: Record<string, unknown>): Promise<string> {
    // The agent may use different field names
    const descripcion =
      (args.descripcion_problema as string) ??
      (args.descripcion as string) ??
      (args.description as string) ??
      (args.query as string) ??
      (args.problema as string) ??
      '';
    this.logger.log(`Clasificando tipificación: ${descripcion}`);

    const tip = await this.tipificacionesService.clasificarPorDescripcion(
      descripcion,
    );

    if (tip) {
      return JSON.stringify({
        clasificado: true,
        categoria: tip.tipification1,
        subcategoria: tip.tipification2,
        item: tip.tipification3,
        clasificacion: tip.clasificacion,
        estado_inicial: tip.estadoInicial,
        grupo_piloto: tip.grupoPiloto,
        grupo_estandar: tip.grupoEstandar,
      });
    }

    return JSON.stringify({
      clasificado: false,
      mensaje:
        'No se pudo clasificar automáticamente. Se requiere revisión manual o más detalles del problema.',
    });
  }
}
