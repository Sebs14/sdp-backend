import { Injectable, Logger } from '@nestjs/common';
import { AgentesEspecializadosService } from '../agentes-especializados/agentes-especializados.service.js';

@Injectable()
export class TransferirAgenteService {
  private readonly logger = new Logger(TransferirAgenteService.name);

  constructor(private readonly agentesService: AgentesEspecializadosService) { }

  async execute(args: Record<string, unknown>): Promise<string> {
    const payload = (args.payload as Record<string, unknown>) ?? args;

    const tipification1 =
      (payload.tipification1 as string) ??
      (payload.categoria as string) ??
      'no especificado';

    this.logger.log(`Buscando agente especializado para: ${tipification1}`);

    const agente = await this.agentesService.findByTipification1(tipification1);

    if (!agente) {
      this.logger.warn(
        `No se encontró agente para tipification1: ${tipification1}`,
      );
      return JSON.stringify({
        transferido: false,
        mensaje: `No se encontró agente especializado para "${tipification1}".`,
      });
    }

    this.logger.log(
      `Transfiriendo a: ${agente.nombreAgente} (${agente.supportAgentId})`,
    );

    return JSON.stringify({
      transferido: true,
      support_agent_id: agente.supportAgentId,
      nombre_agente: agente.nombreAgente,
      tipification1,
      contexto: payload,
      mensaje: `Caso transferido al ${agente.nombreAgente}.`,
    });
  }
}
