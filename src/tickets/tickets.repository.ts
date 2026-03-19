import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity.js';

@Injectable()
export class TicketsRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
  ) {}

  async save(ticket: Partial<Ticket>): Promise<Ticket> {
    const entity = this.repo.create(ticket);
    return this.repo.save(entity);
  }

  async findByTicketNumero(ticketNumero: string): Promise<Ticket | null> {
    return this.repo.findOne({ where: { ticket_numero: ticketNumero } });
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: Ticket[]; total: number }> {
    const [data, total] = await this.repo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getLastId(): Promise<number> {
    const result: { maxId: number | null } | undefined = await this.repo
      .createQueryBuilder('ticket')
      .select('MAX(ticket.id)', 'maxId')
      .getRawOne();
    return result?.maxId ?? 0;
  }
}
