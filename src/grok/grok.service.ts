import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  SupportAgentMessage,
  SupportAgentResponse,
} from './interfaces/grok-message.interface.js';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly chatUrl: string;
  private readonly apiKey: string;
  private readonly supportAgentId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.chatUrl =
      this.configService.get<string>('xai.chatUrl', { infer: true }) ?? '';
    this.apiKey =
      this.configService.get<string>('xai.apiKey', { infer: true }) ?? '';
    this.supportAgentId =
      this.configService.get<string>('xai.supportAgentId', { infer: true }) ??
      '';
  }

  /**
   * Sends messages to the xAI Support Agent /chat endpoint.
   * Returns the raw SupportAgentResponse for the caller to handle tool calls.
   */
  async sendMessage(
    conversationId: string,
    messages: SupportAgentMessage[],
  ): Promise<SupportAgentResponse> {
    this.logger.debug(
      `Sending ${messages.length} messages to Support Agent (conversation: ${conversationId})`,
    );

    const body = {
      support_agent_id: this.supportAgentId,
      conversation_id: conversationId,
      environment: 'ENVIRONMENT_PROD',
      messages,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<SupportAgentResponse>(this.chatUrl, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.debug('Support Agent response received');
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error calling Support Agent API',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }
}
