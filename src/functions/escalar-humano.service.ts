import { Injectable, Logger } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service.js';

@Injectable()
export class EscalarHumanoService {
  private readonly logger = new Logger(EscalarHumanoService.name);

  constructor(private readonly ticketsService: TicketsService) { }

  async execute(args: Record<string, unknown>): Promise<string> {
    const razon = (args.razon as string) ?? 'No especificada';
    this.logger.warn(`Escalamiento a operador humano: ${razon}`);

    // Si hay datos suficientes, crear ticket con prioridad URGENTE y status ESCALADO
    const datos = (args.datos_recopilados as Record<string, unknown>) ?? {};
    if (datos.nombre_solicitante && datos.codigo_centro) {
      const resultado = await this.ticketsService.crearTicket({
        ...datos,
        status: 'ESCALADO',
        prioridad: 'URGENTE',
        description: datos.description || `Escalado: ${razon}`,
        tipification1: (datos.tipification1 as string) || 'PENDIENTE',
        tipification2: (datos.tipification2 as string) || 'PENDIENTE',
        tipification3: (datos.tipification3 as string) || 'PENDIENTE',
      });
      this.logger.warn(`Ticket escalado creado: ${resultado.ticket_id}`);
    }

    // TODO: Enviar notificación por email/Slack
    return JSON.stringify({
      escalado: true,
      razon,
      timestamp: new Date().toISOString(),
    });
  }
}
