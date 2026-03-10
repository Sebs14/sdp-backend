import { Injectable, Logger } from '@nestjs/common';
import { CentrosEscolaresService } from '../centros-escolares/centros-escolares.service.js';

@Injectable()
export class VerificarCentroService {
  private readonly logger = new Logger(VerificarCentroService.name);

  constructor(
    private readonly centrosEscolaresService: CentrosEscolaresService,
  ) { }

  async execute(args: Record<string, unknown>): Promise<string> {
    // The agent may use different field names
    const nombreOCodigo =
      (args.nombre_o_codigo as string) ??
      (args.codigo as string) ??
      (args.nombre as string) ??
      (args.query as string) ??
      (args.code as string) ??
      '';
    this.logger.log(`Verificando centro escolar: ${nombreOCodigo}`);
    const resultado = await this.centrosEscolaresService.verificar(
      nombreOCodigo,
    );
    return JSON.stringify(resultado);
  }
}
