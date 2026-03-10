import { ApiProperty } from '@nestjs/swagger';

class ChatMetadataDto {
  @ApiProperty({
    description: 'Funciones ejecutadas durante el turno',
    example: ['verificar_centro_escolar'],
  })
  functionsCalled: string[];

  @ApiProperty({
    description: 'Timestamp ISO',
    example: '2026-03-09T10:00:00.000Z',
  })
  timestamp: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'ID de sesión',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Respuesta del agente',
    example: 'Bienvenido al Sistema de Despacho de Problemas...',
  })
  message: string;

  @ApiProperty({ description: 'Rol del mensaje', example: 'assistant' })
  role: string;

  @ApiProperty({
    description: 'Metadata de la respuesta',
    type: ChatMetadataDto,
  })
  metadata: ChatMetadataDto;
}
