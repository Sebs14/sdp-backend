import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity.js';
import { TicketsRepository } from './tickets.repository.js';
import { TicketsService } from './tickets.service.js';
import { TicketsController } from './tickets.controller.js';
import { DistributionRulesService } from './distribution-rules.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  controllers: [TicketsController],
  providers: [TicketsRepository, TicketsService, DistributionRulesService],
  exports: [TicketsService, DistributionRulesService],
})
export class TicketsModule { }
