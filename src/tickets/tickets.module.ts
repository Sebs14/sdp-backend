import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Ticket } from './entities/ticket.entity.js';
import { TicketsRepository } from './tickets.repository.js';
import { TicketsService } from './tickets.service.js';
import { TicketsController } from './tickets.controller.js';
import { DistributionRulesService } from './distribution-rules.service.js';
import { ServiceDeskService } from './service-desk.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), HttpModule],
  controllers: [TicketsController],
  providers: [
    TicketsRepository,
    TicketsService,
    DistributionRulesService,
    ServiceDeskService,
  ],
  exports: [TicketsService, DistributionRulesService],
})
export class TicketsModule {}
