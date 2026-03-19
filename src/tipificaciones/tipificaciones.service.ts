import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TipificacionesRepository } from './tipificaciones.repository.js';
import { Tipificacion } from './entities/tipificacion.entity.js';

@Injectable()
export class TipificacionesService {
  private readonly logger = new Logger(TipificacionesService.name);
  private readonly apiKey: string;

  constructor(
    private readonly repository: TipificacionesRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey =
      this.configService.get<string>('xai.apiKey', { infer: true }) ?? '';
  }

  async findAll(): Promise<Tipificacion[]> {
    return this.repository.findAll();
  }

  async clasificarPorDescripcion(
    descripcion: string,
  ): Promise<Tipificacion | null> {
    this.logger.debug(`Clasificando por descripción: ${descripcion}`);

    // 1. Try keyword matching first (fast, no API cost)
    const keywordMatch = await this.repository.findByKeyword(descripcion);
    if (keywordMatch) {
      this.logger.log(
        `Clasificado por keywords: ${keywordMatch.tipification1} > ${keywordMatch.tipification2} > ${keywordMatch.tipification3}`,
      );
      return keywordMatch;
    }

    // 2. Fallback: LLM-based classification
    this.logger.log('Keyword matching failed, usando clasificación por LLM...');
    return this.clasificarConLLM(descripcion);
  }

  /**
   * Uses the xAI Chat Completions API to classify a user description
   * against the full tipificaciones catalog.
   */
  private async clasificarConLLM(
    descripcion: string,
  ): Promise<Tipificacion | null> {
    const allTips = await this.repository.findAll();
    if (allTips.length === 0) return null;

    // Build numbered catalog
    const catalog = allTips
      .map(
        (t, i) =>
          `${i + 1}. ${t.tipification1} > ${t.tipification2} > ${t.tipification3}`,
      )
      .join('\n');

    const systemPrompt = `Eres un clasificador experto del Sistema de Despacho de Problemas (SDP) del Ministerio de Educación de El Salvador (MINED).
Tu tarea es seleccionar la clasificación más apropiada del catálogo de tipificaciones para el problema descrito.
Responde SOLAMENTE con el número de la opción seleccionada, sin texto adicional.`;

    const userPrompt = `Descripción del problema:
"${descripcion}"

Catálogo de tipificaciones:
${catalog}

Número de la opción más apropiada:`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.x.ai/v1/chat/completions',
          {
            model: 'grok-3-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const choice = (
        response.data as { choices?: { message?: { content?: string } }[] }
      )?.choices?.[0]?.message?.content?.trim();
      this.logger.log(`LLM classification response: "${choice}"`);

      // Extract the number from the response
      const match = choice?.match(/(\d+)/);
      if (!match) {
        this.logger.warn('LLM did not return a valid number');
        return null;
      }

      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= allTips.length) {
        this.logger.warn(`LLM returned out-of-range index: ${index + 1}`);
        return null;
      }

      const selected = allTips[index];
      this.logger.log(
        `LLM clasificó como: ${selected.tipification1} > ${selected.tipification2} > ${selected.tipification3}`,
      );
      return selected;
    } catch (error) {
      this.logger.error(
        'LLM classification failed',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  async findByTipificacion(
    t1: string,
    t2: string,
    t3: string,
  ): Promise<Tipificacion | null> {
    return this.repository.findByTipificacion(t1, t2, t3);
  }
}
