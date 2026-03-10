import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TransferirAgenteService {
  private readonly logger = new Logger(TransferirAgenteService.name);

  execute(args: Record<string, unknown>): string {
    // The xAI agent may send args as { payload: {...}, agente_destino: "..." }
    // or as flat fields directly. Handle both cases.
    const agente =
      (args.agente_destino as string) ?? 'no especificado';
    const payload =
      (args.payload as Record<string, unknown>) ?? args;

    this.logger.log(`Transfiriendo caso al agente: ${agente}`);
    this.logger.log(
      `Payload transferido: ${JSON.stringify(payload)}`,
    );

    return JSON.stringify({
      transferido: true,
      agente,
      mensaje: `Caso transferido exitosamente al agente ${agente}.`,
    });
  }
}
