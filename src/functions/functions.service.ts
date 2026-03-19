import { Injectable, Logger } from '@nestjs/common';
import { VerificarCentroService } from './verificar-centro.service.js';
import { ClasificarTipificacionService } from './clasificar-tipificacion.service.js';
import { CrearTicketService } from './crear-ticket.service.js';
import { TransferirAgenteService } from './transferir-agente.service.js';

@Injectable()
export class FunctionsService {
  private readonly logger = new Logger(FunctionsService.name);

  constructor(
    private readonly verificarCentro: VerificarCentroService,
    private readonly clasificarTipificacion: ClasificarTipificacionService,
    private readonly crearTicket: CrearTicketService,
    private readonly transferirAgente: TransferirAgenteService,
  ) {}

  async execute(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    this.logger.log(`Executing function: ${functionName}`);

    switch (functionName) {
      case 'verificar_centro_escolar':
        return this.verificarCentro.execute(args);

      case 'clasificar_tipificacion':
        return this.clasificarTipificacion.execute(args);

      case 'crear_ticket_sdp':
        return this.crearTicket.execute(args);

      case 'transferir_a_agente_especializado':
        return this.transferirAgente.execute(args);

      default:
        this.logger.error(`Unknown function: ${functionName}`);
        return JSON.stringify({
          error: true,
          mensaje: `Función desconocida: ${functionName}`,
        });
    }
  }
}
