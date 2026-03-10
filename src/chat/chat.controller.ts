import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service.js';
import { ChatMessageDto } from './dto/chat-message.dto.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';
import { SessionService } from '../session/session.service.js';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensaje al agente clasificador' })
  @ApiResponse({
    status: 200,
    description: 'Respuesta del agente',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Error interno' })
  async chat(@Body() body: ChatMessageDto): Promise<ChatResponseDto> {
    try {
      return await this.chatService.processMessage(
        body.sessionId,
        body.message,
      );
    } catch (error) {
      this.logger.error('Error processing chat message', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Error al procesar el mensaje. Por favor, intente nuevamente.',
        error: 'Internal Server Error',
      });
    }
  }

  @Get(':sessionId/history')
  @ApiOperation({ summary: 'Obtener historial de una sesión de chat' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Historial de mensajes' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  getHistory(@Param('sessionId') sessionId: string) {
    const history = this.sessionService.getHistory(sessionId);
    if (!history || history.length === 0) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }
    return { sessionId, messages: history };
  }
}
