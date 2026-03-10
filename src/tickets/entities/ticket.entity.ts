import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_numero: string;

  // Datos del solicitante
  @Column({ type: 'varchar', length: 255 })
  nombre_solicitante: string;

  @Column({ type: 'varchar', length: 20 })
  telefono_solicitante: string;

  // Datos del centro escolar
  @Column({ type: 'varchar', length: 20 })
  codigo_centro: string;

  @Column({ type: 'varchar', length: 255 })
  nombre_centro: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  departamento: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  municipio: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  distrito: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modalidad: string;

  // Tipificación
  @Column({ type: 'varchar', length: 255 })
  tipification1: string;

  @Column({ type: 'varchar', length: 255 })
  tipification2: string;

  @Column({ type: 'varchar', length: 255 })
  tipification3: string;

  // Descripción
  @Column({ type: 'text' })
  description: string;

  // Datos del docente (opcionales)
  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_docente: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nip: string;

  // Datos del estudiante (opcionales)
  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_estudiante: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nie: string;

  // Control del ticket
  @Column({ type: 'varchar', length: 50, default: 'CM Creado' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'MEDIA' })
  prioridad: string;

  @Column({ type: 'varchar', length: 50, default: 'CHAT BOT' })
  canal_origen: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  clasificacion: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  afectacion_clase: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  group_resolutor: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modalidad_centro: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  session_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
