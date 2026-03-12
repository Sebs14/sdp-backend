import { Module } from '@nestjs/common';
import { FunctionsService } from './functions.service.js';
import { VerificarCentroService } from './verificar-centro.service.js';
import { ClasificarTipificacionService } from './clasificar-tipificacion.service.js';
import { CrearTicketService } from './crear-ticket.service.js';
import { TransferirAgenteService } from './transferir-agente.service.js';
import { EscalarHumanoService } from './escalar-humano.service.js';
import { CentrosEscolaresModule } from '../centros-escolares/centros-escolares.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { TipificacionesModule } from '../tipificaciones/tipificaciones.module.js';
import { AgentesEspecializadosModule } from '../agentes-especializados/agentes-especializados.module.js';

@Module({
  imports: [
    CentrosEscolaresModule,
    TicketsModule,
    TipificacionesModule,
    AgentesEspecializadosModule,
  ],
  providers: [
    FunctionsService,
    VerificarCentroService,
    ClasificarTipificacionService,
    CrearTicketService,
    TransferirAgenteService,
    EscalarHumanoService,
  ],
  exports: [FunctionsService],
})
export class FunctionsModule { }
