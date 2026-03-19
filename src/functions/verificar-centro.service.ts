import { Injectable, Logger } from '@nestjs/common';
import { CentrosEscolaresService } from '../centros-escolares/centros-escolares.service.js';

@Injectable()
export class VerificarCentroService {
  private readonly logger = new Logger(VerificarCentroService.name);

  constructor(
    private readonly centrosEscolaresService: CentrosEscolaresService,
  ) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    this.logger.log(`verificar_centro_escolar args: ${JSON.stringify(args)}`);

    // The agent may use different field names — try all known ones,
    // then fall back to conversation context injected by ChatService
    const nombreOCodigo =
      (args.nombre_o_codigo as string) ??
      (args.codigo as string) ??
      (args.nombre as string) ??
      (args.query as string) ??
      (args.code as string) ??
      (args.centro as string) ??
      (args.nombre_centro as string) ??
      (args.centro_escolar as string) ??
      (args.dato as string) ??
      (args.input as string) ??
      (args._user_message as string) ??
      '';
    this.logger.log(`Verificando centro escolar: ${nombreOCodigo}`);
    const resultado =
      await this.centrosEscolaresService.verificar(nombreOCodigo);
    return JSON.stringify(resultado);
  }
}
