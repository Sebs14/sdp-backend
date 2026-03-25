import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('centros_escolares')
export class CentroEscolar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  codigo: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  clasificacion: string;

  @Column({ type: 'varchar', nullable: true })
  cluster: string;

  @Column({ type: 'varchar', nullable: true })
  correo: string;

  @Column({ type: 'varchar', nullable: true })
  municipio: string;

  @Column({ type: 'varchar', nullable: true })
  departamento: string;

  @Column({ type: 'varchar', nullable: true })
  distrito: string;

  @Column({ type: 'varchar', nullable: true })
  director: string;

  @Column({ type: 'varchar', nullable: true })
  dui_director: string;

  @Column({ type: 'varchar', nullable: true })
  telefono_director: string;

  @Column({ type: 'varchar', nullable: true })
  monitor_cluster: string;

  @Column({ type: 'varchar', nullable: true })
  dui_cluster: string;

  @Column({ type: 'varchar', nullable: true })
  telefono_monitor: string;

  @Column({ type: 'varchar', nullable: true })
  telefono_asignado: string;

  @Column({ type: 'varchar', nullable: true })
  telefono_1: string;

  @Column({ type: 'varchar', nullable: true })
  modalidad: string;

  @Column({ type: 'varchar', nullable: true })
  modalidad_atencion: string;

  @Column({ type: 'varchar', nullable: true })
  educacion_inicial: string;

  @Column({ type: 'varchar', nullable: true })
  turno: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitud: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitud: number;

  @Column({ type: 'varchar', nullable: true })
  sede_circulo_familia: string;

  @Column({ type: 'varchar', nullable: true })
  sede_enlaces_asociada: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
