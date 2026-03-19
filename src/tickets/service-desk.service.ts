import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ServiceDeskService {
  private readonly logger = new Logger(ServiceDeskService.name);
  private readonly url: string;
  private readonly apiToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.url = this.configService.get<string>('serviceDesk.url')!;
    this.apiToken = this.configService.get<string>('serviceDesk.apiToken')!;
  }

  async crearRequest(datos: Record<string, unknown>): Promise<void> {
    if (!this.apiToken) {
      this.logger.warn(
        'SERVICE_DESK_TOKEN no configurado — omitiendo envío a ManageEngine',
      );
      return;
    }

    const inputData = {
      request: {
        subject: `${(datos.tipification1 as string) ?? ''} - ${(datos.tipification2 as string) ?? ''}`,
        description: datos.description ?? '',
        requester: { name: datos.codigo_centro ?? '' },
        status: { name: 'CM Creado' },
        category: { name: datos.tipification1 ?? '' },
        subcategory: { name: datos.tipification2 ?? '' },
        item: { name: datos.tipification3 ?? '' },
        group: { name: 'CENTRO DE MONITOREO' },
        template: { name: 'Incidencias' },
        mode: { name: 'CHAT BOT' },
        udf_fields: {
          udf_sline_602: datos.codigo_centro ?? '',
          udf_sline_601: datos.nombre_centro ?? '',
          udf_sline_320: datos.nombre_docente ?? '',
          udf_sline_319: datos.nip ?? '',
          udf_sline_316: datos.nombre_estudiante ?? '',
          udf_sline_315: datos.nie ?? '',
          udf_sline_603: datos.departamento ?? '',
          udf_sline_604: datos.municipio ?? '',
          udf_sline_2485: datos.distrito ?? '',
          udf_sline_2702: datos.modalidad ?? '',
        },
      },
    };

    const formData = new URLSearchParams();
    formData.append('input_data', JSON.stringify(inputData));

    this.logger.log(
      `Enviando a ManageEngine: ${JSON.stringify(inputData, null, 2)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.url, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            authtoken: this.apiToken,
          },
        }),
      );
      this.logger.log(
        `ManageEngine respondió — status: ${response.status}, data: ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Error al enviar ticket a ManageEngine: ${msg}`);
    }
  }
}
