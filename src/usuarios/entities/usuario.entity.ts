import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CentroEscolar } from '../../centros-escolares/entities/centro-escolar.entity.js';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  telefono: string;

  @Column({ type: 'varchar', nullable: true })
  dui: string;

  @Column({ type: 'varchar' })
  rol: string;

  @ManyToOne(() => CentroEscolar, { nullable: true, eager: true })
  @JoinColumn({ name: 'centro_escolar_id' })
  centro_escolar: CentroEscolar;

  @Column({ type: 'int', nullable: true })
  centro_escolar_id: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
