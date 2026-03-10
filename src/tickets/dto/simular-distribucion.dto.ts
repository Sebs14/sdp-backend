import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimularDistribucionDto {
  @ApiProperty({ example: 'Infraestructura' })
  @IsString()
  tipification1: string;

  @ApiProperty({ example: 'Incidencia' })
  @IsString()
  clasificacion: string;

  @ApiProperty({ example: 'Standard' })
  @IsString()
  modalidad: string;

  @ApiPropertyOptional({
    example: 'No',
    description: 'Solo para Infraestructura',
  })
  @IsOptional()
  @IsString()
  afectacionClase?: string;

  @ApiPropertyOptional({ example: 'INFRAESTRUCTURA' })
  @IsOptional()
  @IsString()
  grupoPiloto?: string;

  @ApiPropertyOptional({ example: 'INFRA Creado' })
  @IsOptional()
  @IsString()
  estadoInicial?: string;
}
