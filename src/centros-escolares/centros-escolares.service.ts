import { Injectable, Logger } from '@nestjs/common';
import { CentrosEscolaresRepository } from './centros-escolares.repository.js';
import { CentroEscolar } from './entities/centro-escolar.entity.js';

@Injectable()
export class CentrosEscolaresService {
  private readonly logger = new Logger(CentrosEscolaresService.name);

  constructor(private readonly repository: CentrosEscolaresRepository) {}

  async findAll(): Promise<CentroEscolar[]> {
    return this.repository.findAll();
  }

  async findByCodigo(codigo: string): Promise<CentroEscolar | null> {
    return this.repository.findByCodigo(codigo);
  }

  async verificar(nombreOCodigo: string): Promise<Record<string, unknown>> {
    if (!nombreOCodigo) {
      return {
        encontrado: false,
        mensaje: 'No se proporcionó nombre o código del centro escolar.',
      };
    }
    this.logger.debug(`Verificando centro escolar: ${nombreOCodigo}`);

    // Try exact code match first
    const porCodigo = await this.repository.findByCodigo(nombreOCodigo);
    if (porCodigo) {
      return {
        encontrado: true,
        codigo: porCodigo.codigo,
        nombre: porCodigo.nombre,
        municipio: porCodigo.municipio,
        departamento: porCodigo.departamento,
        distrito: porCodigo.distrito,
        modalidad: porCodigo.modalidad,
      };
    }

    // Search by name
    const porNombre = await this.repository.findByNombre(nombreOCodigo);
    if (porNombre.length === 1) {
      const ce = porNombre[0];
      return {
        encontrado: true,
        codigo: ce.codigo,
        nombre: ce.nombre,
        municipio: ce.municipio,
        departamento: ce.departamento,
        distrito: ce.distrito,
        modalidad: ce.modalidad,
      };
    }

    if (porNombre.length > 1) {
      return {
        encontrado: false,
        multiples: true,
        resultados: porNombre.map((ce) => ({
          codigo: ce.codigo,
          nombre: ce.nombre,
          municipio: ce.municipio,
        })),
        mensaje:
          'Se encontraron múltiples centros escolares. Por favor, confirme cuál es el correcto.',
      };
    }

    return {
      encontrado: false,
      mensaje:
        'Centro escolar no encontrado. Verifique el nombre o código e intente nuevamente.',
    };
  }
}
