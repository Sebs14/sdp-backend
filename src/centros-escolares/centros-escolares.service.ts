import { Injectable, Logger } from '@nestjs/common';
import { CentrosEscolaresRepository } from './centros-escolares.repository.js';
import { CentroEscolar } from './entities/centro-escolar.entity.js';

@Injectable()
export class CentrosEscolaresService {
  private readonly logger = new Logger(CentrosEscolaresService.name);

  constructor(private readonly repository: CentrosEscolaresRepository) { }

  async findAll(): Promise<CentroEscolar[]> {
    return this.repository.findAll();
  }

  async findByCodigo(codigo: string): Promise<CentroEscolar | null> {
    return this.repository.findByCodigo(codigo);
  }

  async findByTelefono(telefono: string): Promise<CentroEscolar | null> {
    return this.repository.findByTelefono(telefono);
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
      return this.buildResponse(porCodigo);
    }

    // Search by name
    const porNombre = await this.repository.findByNombre(nombreOCodigo);
    if (porNombre.length === 1) {
      return this.buildResponse(porNombre[0]);
    }

    if (porNombre.length > 1) {
      return {
        encontrado: false,
        multiples: true,
        resultados: porNombre.map((ce) => ({
          codigo: ce.codigo,
          nombre: ce.nombre,
          municipio: ce.municipio,
          departamento: ce.departamento,
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

  private buildResponse(ce: CentroEscolar): Record<string, unknown> {
    return {
      encontrado: true,
      codigo: ce.codigo,
      nombre: ce.nombre,
      departamento: ce.departamento,
      municipio: ce.municipio,
      distrito: ce.distrito,
      director: ce.director,
      telefono_director: ce.telefono_director,
      clasificacion: ce.clasificacion,
      cluster: ce.cluster,
      monitor_cluster: ce.monitor_cluster,
      telefono_asignado: ce.telefono_asignado,
      modalidad: ce.modalidad,
      turno: ce.turno,
      educacion_inicial: ce.educacion_inicial,
    };
  }
}
