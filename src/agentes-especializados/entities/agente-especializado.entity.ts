import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('agentes_especializados')
export class AgenteEspecializado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  tipification1: string;

  @Column({ type: 'varchar', length: 255, name: 'nombre_agente' })
  nombreAgente: string;

  @Column({ type: 'varchar', length: 255, name: 'support_agent_id' })
  supportAgentId: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}
