import {
  Controller,
  Get,
  Param,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CentrosEscolaresService } from './centros-escolares.service.js';

@ApiTags('Centros Escolares')
@Controller('centros-escolares')
export class CentrosEscolaresController {
  private readonly logger = new Logger(CentrosEscolaresController.name);

  constructor(private readonly centrosService: CentrosEscolaresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los centros escolares activos' })
  @ApiResponse({ status: 200, description: 'Lista de centros escolares' })
  findAll() {
    return this.centrosService.findAll();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener centro escolar por código' })
  @ApiParam({
    name: 'codigo',
    description: 'Código del centro escolar',
    example: '11001',
  })
  @ApiResponse({ status: 200, description: 'Centro escolar encontrado' })
  @ApiResponse({ status: 404, description: 'Centro escolar no encontrado' })
  async findOne(@Param('codigo') codigo: string) {
    const centro = await this.centrosService.findByCodigo(codigo);
    if (!centro) {
      throw new NotFoundException(
        `Centro escolar con código ${codigo} no encontrado`,
      );
    }
    return centro;
  }
}
