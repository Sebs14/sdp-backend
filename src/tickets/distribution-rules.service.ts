import { Injectable, Logger } from '@nestjs/common';

export interface DistributionInput {
  tipification1: string;
  clasificacion: string;
  modalidad: string;
  grupoPiloto: string;
  estadoInicial: string;
  afectacionClase?: string;
}

export interface DistributionResult {
  group: string;
  status: string;
  prioridad: string;
  reglaAplicada: string;
}

@Injectable()
export class DistributionRulesService {
  private readonly logger = new Logger(DistributionRulesService.name);

  calcular(input: DistributionInput): DistributionResult {
    const {
      tipification1,
      clasificacion,
      modalidad,
      grupoPiloto,
      estadoInicial,
      afectacionClase,
    } = input;

    this.logger.debug(
      `Calculando distribución: t1=${tipification1}, clas=${clasificacion}, mod=${modalidad}`,
    );

    // REGLA 1: Legal siempre abierto
    if (tipification1.toLowerCase() === 'legal') {
      return {
        group: 'LEGAL',
        status: 'LEG Creado',
        prioridad: 'ALTA',
        reglaAplicada: 'Legal → siempre abierto',
      };
    }

    // REGLA 4 (verificar antes que otras): Monitoreo siempre cerrado
    // EXCEPCIÓN: Infraestructura con afectación de clase = Si
    if (clasificacion === 'Monitoreo') {
      if (
        tipification1.toLowerCase() === 'infraestructura' &&
        afectacionClase === 'Si'
      ) {
        // Cae a las demás reglas, no aplica cierre
      } else {
        return {
          group: 'CENTRO DE MONITOREO',
          status: 'Cerrado',
          prioridad: 'BAJA',
          reglaAplicada: 'Monitoreo → cerrado automático',
        };
      }
    }

    // REGLA 2: Remediacion + Standard = cerrado
    if (
      tipification1.toLowerCase() === 'remediacion' &&
      modalidad.toLowerCase() === 'standard'
    ) {
      return {
        group: 'CENTRO DE MONITOREO',
        status: 'Cerrado',
        prioridad: 'BAJA',
        reglaAplicada: 'Remediación + Standard → cerrado',
      };
    }

    // REGLA 3: Piloto o Control + Incidencia = grupo resolutor específico
    if (
      ['piloto', 'control'].includes(modalidad.toLowerCase()) &&
      clasificacion === 'Incidencia'
    ) {
      return {
        group: grupoPiloto,
        status: estadoInicial,
        prioridad: 'MEDIA',
        reglaAplicada: `${modalidad} + Incidencia → ${grupoPiloto}`,
      };
    }

    // REGLA 5: Standard + Incidencia = Centro de Monitoreo
    if (
      modalidad.toLowerCase() === 'standard' &&
      clasificacion === 'Incidencia'
    ) {
      return {
        group: 'CENTRO DE MONITOREO',
        status: 'CM Creado',
        prioridad: 'MEDIA',
        reglaAplicada: 'Standard + Incidencia → Centro de Monitoreo',
      };
    }

    // DEFAULT: Centro de Monitoreo
    return {
      group: 'CENTRO DE MONITOREO',
      status: 'CM Creado',
      prioridad: 'MEDIA',
      reglaAplicada: 'Default → Centro de Monitoreo',
    };
  }
}
