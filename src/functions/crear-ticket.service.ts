import { Injectable, Logger } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service.js';

@Injectable()
export class CrearTicketService {
  private readonly logger = new Logger(CrearTicketService.name);

  constructor(private readonly ticketsService: TicketsService) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    this.logger.log('Creando ticket en SDP');

    // The agent may send { payload: {...} } or flat fields directly
    const p = (args.payload as Record<string, unknown>) ?? args;

    // Validate minimum required fields
    const nombre = p.nombre_solicitante as string;
    const codigo = p.codigo_centro as string;
    const tip1 = p.tipification1 ?? p.categoria;

    if (!nombre || !codigo || !tip1) {
      this.logger.warn(
        `Ticket missing required fields — nombre: ${nombre}, codigo: ${codigo}, tip1: ${String(tip1)}`,
      );
      return JSON.stringify({
        error: true,
        mensaje:
          'No se puede crear el ticket. Faltan datos obligatorios: ' +
          [
            !nombre && 'nombre del solicitante',
            !codigo && 'código del centro escolar',
            !tip1 && 'clasificación del problema',
          ]
            .filter(Boolean)
            .join(', ') +
          '.',
      });
    }

    // Construir datos para el ticket con campos de distribución
    const datos: Record<string, unknown> = {
      nombre_solicitante: p.nombre_solicitante,
      telefono_solicitante: p.telefono_solicitante,
      codigo_centro: p.codigo_centro ?? p.codigoCentroEducativo,
      nombre_centro: p.nombre_centro ?? p.nombreCentroEducativo,
      departamento: p.departamento,
      municipio: p.municipio,
      distrito: p.distrito,
      modalidad: p.modalidad,
      tipification1: p.tipification1 ?? p.categoria,
      tipification2: p.tipification2 ?? p.subcategoria,
      tipification3: p.tipification3 ?? p.item,
      description: p.description ?? p.descripcion,
      nombre_docente: p.nombre_docente ?? p.nombreDocente,
      nip: p.nip,
      nombre_estudiante: p.nombre_estudiante ?? p.nombreEstudiante,
      nie: p.nie,
      clasificacion: p.clasificacion,
      afectacion_clase: p.afectacion_clase ?? p.afectacionClase ?? 'No',
      modalidad_centro: p.modalidad_centro ?? p.modalidad,
      grupo_piloto: p.grupo_piloto ?? p.grupoPiloto,
      estado_inicial: p.estado_inicial ?? p.estadoInicial,
      prioridad: p.prioridad,
      canal_origen: p.canal_origen ?? 'CHAT BOT',
      session_id: p.session_id,
    };

    try {
      const resultado = await this.ticketsService.crearTicket(datos);
      return JSON.stringify(resultado);
    } catch (error) {
      this.logger.error(
        'Error al crear ticket',
        error instanceof Error ? error.message : error,
      );
      return JSON.stringify({
        error: true,
        mensaje:
          'Error al crear el ticket en la base de datos. Por favor intente nuevamente.',
      });
    }
  }
}
