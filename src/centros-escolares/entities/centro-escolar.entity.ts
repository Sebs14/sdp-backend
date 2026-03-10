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
  municipio: string;

  @Column({ type: 'varchar', nullable: true })
  departamento: string;

  @Column({ type: 'varchar', nullable: true })
  distrito: string;

  @Column({ type: 'varchar', nullable: true })
  modalidad: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
