import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiPropertyOptional({
    description: 'ID de sesión existente. Si no se envía, se genera uno nuevo.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'Mensaje del usuario',
    example: 'Hola, necesito reportar un problema',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío.' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Teléfono del llamante (para identificación automática en producción)',
    example: '7890-1234',
  })
  @IsOptional()
  @IsString()
  callerPhone?: string;
}
