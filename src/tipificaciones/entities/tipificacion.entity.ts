import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tipificaciones')
export class Tipificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  tipification1: string;

  @Column({ type: 'varchar', length: 255 })
  tipification2: string;

  @Column({ type: 'varchar', length: 255 })
  tipification3: string;

  @Column({ type: 'varchar', length: 50 })
  clasificacion: string;

  @Column({ type: 'varchar', length: 50, name: 'estado_inicial' })
  estadoInicial: string;

  @Column({ type: 'varchar', length: 100, name: 'grupo_piloto' })
  grupoPiloto: string;

  @Column({ type: 'varchar', length: 100, name: 'grupo_estandar' })
  grupoEstandar: string;

  @Column({ type: 'simple-array' })
  keywords: string[];

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}
