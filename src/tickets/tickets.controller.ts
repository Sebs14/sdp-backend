import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service.js';
import { SimularDistribucionDto } from './dto/simular-distribucion.dto.js';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(private readonly ticketsService: TicketsService) { }

  @Get()
  @ApiOperation({ summary: 'Listar tickets paginados' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página',
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'Lista de tickets paginada' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));
    return this.ticketsService.findAll(p, l);
  }

  @Get(':ticketNumero')
  @ApiOperation({ summary: 'Obtener ticket por número' })
  @ApiParam({
    name: 'ticketNumero',
    description: 'Número del ticket',
    example: 'SDP-2026-000001',
  })
  @ApiResponse({ status: 200, description: 'Ticket encontrado' })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  async findOne(@Param('ticketNumero') ticketNumero: string) {
    const ticket = await this.ticketsService.findByTicketNumero(ticketNumero);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumero} no encontrado`);
    }
    return ticket;
  }

  @Post('simular-distribucion')
  @ApiOperation({
    summary: 'Simular reglas de distribución de tickets (solo pruebas)',
  })
  @ApiResponse({ status: 200, description: 'Resultado de la simulación' })
  simularDistribucion(@Body() body: SimularDistribucionDto) {
    return this.ticketsService.simularDistribucion({
      tipification1: body.tipification1,
      clasificacion: body.clasificacion,
      modalidad: body.modalidad,
      grupoPiloto: body.grupoPiloto ?? 'CENTRO DE MONITOREO',
      estadoInicial: body.estadoInicial ?? 'CM Creado',
      afectacionClase: body.afectacionClase ?? 'No',
    });
  }
}
