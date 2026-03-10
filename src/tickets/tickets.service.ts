import { Injectable, Logger } from '@nestjs/common';
import { TicketsRepository } from './tickets.repository.js';
import { Ticket } from './entities/ticket.entity.js';
import {
  DistributionRulesService,
  DistributionInput,
  DistributionResult,
} from './distribution-rules.service.js';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly distributionRules: DistributionRulesService,
  ) { }

  async crearTicket(datos: Record<string, unknown>): Promise<{
    ticket_id: string;
    status: string;
    group: string;
    prioridad: string;
    mensaje: string;
  }> {
    // Calcular distribución si hay datos suficientes
    let distribution: DistributionResult | null = null;
    if (datos.tipification1 && datos.clasificacion && datos.modalidad_centro) {
      const input: DistributionInput = {
        tipification1: datos.tipification1 as string,
        clasificacion: datos.clasificacion as string,
        modalidad: datos.modalidad_centro as string,
        grupoPiloto: (datos.grupo_piloto as string) ?? 'CENTRO DE MONITOREO',
        estadoInicial: (datos.estado_inicial as string) ?? 'CM Creado',
        afectacionClase: (datos.afectacion_clase as string) ?? 'No',
      };
      distribution = this.distributionRules.calcular(input);
      this.logger.log(`Distribución calculada: ${distribution.reglaAplicada}`);
    }

    const lastId = await this.ticketsRepository.getLastId();
    const nextId = lastId + 1;
    const year = new Date().getFullYear();
    const ticketNumero = `SDP-${year}-${String(nextId).padStart(6, '0')}`;

    const ticket = await this.ticketsRepository.save({
      ticket_numero: ticketNumero,
      nombre_solicitante: datos.nombre_solicitante as string,
      telefono_solicitante: datos.telefono_solicitante as string,
      codigo_centro: datos.codigo_centro as string,
      nombre_centro: datos.nombre_centro as string,
      departamento: (datos.departamento as string) ?? null,
      municipio: (datos.municipio as string) ?? null,
      distrito: (datos.distrito as string) ?? null,
      modalidad: (datos.modalidad as string) ?? null,
      tipification1: datos.tipification1 as string,
      tipification2: datos.tipification2 as string,
      tipification3: datos.tipification3 as string,
      description: datos.description as string,
      nombre_docente: (datos.nombre_docente as string) ?? null,
      nip: (datos.nip as string) ?? null,
      nombre_estudiante: (datos.nombre_estudiante as string) ?? null,
      nie: (datos.nie as string) ?? null,
      status: distribution?.status ?? (datos.status as string) ?? 'CM Creado',
      prioridad:
        distribution?.prioridad ?? (datos.prioridad as string) ?? 'MEDIA',
      canal_origen: (datos.canal_origen as string) ?? 'CHAT BOT',
      clasificacion: (datos.clasificacion as string) ?? null,
      afectacion_clase: (datos.afectacion_clase as string) ?? null,
      group_resolutor:
        distribution?.group ?? (datos.group_resolutor as string) ?? null,
      modalidad_centro: (datos.modalidad_centro as string) ?? null,
      session_id: (datos.session_id as string) ?? null,
    });

    this.logger.log(`Ticket creado: ${ticket.ticket_numero}`);

    return {
      ticket_id: ticket.ticket_numero,
      status: distribution?.status ?? 'CM Creado',
      group: distribution?.group ?? 'CENTRO DE MONITOREO',
      prioridad: distribution?.prioridad ?? 'MEDIA',
      mensaje: 'Ticket creado exitosamente',
    };
  }

  simularDistribucion(input: DistributionInput): DistributionResult {
    return this.distributionRules.calcular(input);
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: Ticket[]; total: number; page: number; limit: number }> {
    const { data, total } = await this.ticketsRepository.findAll(page, limit);
    return { data, total, page, limit };
  }

  async findByTicketNumero(ticketNumero: string): Promise<Ticket | null> {
    return this.ticketsRepository.findByTicketNumero(ticketNumero);
  }

  async actualizarStatus(
    ticketNumero: string,
    status: string,
    prioridad?: string,
  ): Promise<Ticket | null> {
    const ticket =
      await this.ticketsRepository.findByTicketNumero(ticketNumero);
    if (!ticket) return null;

    ticket.status = status;
    if (prioridad) ticket.prioridad = prioridad;

    return this.ticketsRepository.save(ticket);
  }
}
