import { DataSource } from 'typeorm';
import { CentroEscolar } from '../../centros-escolares/entities/centro-escolar.entity';

/**
 * Inline entity definition for seed script — avoids the .js extension
 * import issue that the main entity has for ESM compatibility.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('usuarios')
class UsuarioSeed {
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

  @ManyToOne(() => CentroEscolar, { nullable: true })
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

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sdp_mined',
  entities: [UsuarioSeed, CentroEscolar],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();

  const centroRepo = AppDataSource.getRepository(CentroEscolar);
  const usuarioRepo = AppDataSource.getRepository(UsuarioSeed);

  const centros = await centroRepo.find({ where: { activo: true } });
  console.log(`Found ${centros.length} centros escolares`);

  let created = 0;
  let skipped = 0;

  for (const ce of centros) {
    // Director
    if (ce.director) {
      const exists = await usuarioRepo.findOne({
        where: { nombre: ce.director, centro_escolar_id: ce.id },
      });
      if (!exists) {
        await usuarioRepo.save(
          usuarioRepo.create({
            nombre: ce.director,
            telefono: ce.telefono_director || undefined,
            dui: ce.dui_director?.replace(/-/g, '') || undefined,
            rol: 'director',
            centro_escolar_id: ce.id,
            activo: true,
          }),
        );
        created++;
        console.log(`Created director: ${ce.director} (${ce.nombre})`);
      } else {
        skipped++;
      }
    }

    // Monitor de cluster
    if (ce.monitor_cluster) {
      const exists = await usuarioRepo.findOne({
        where: { nombre: ce.monitor_cluster, rol: 'monitor_cluster' },
      });
      if (!exists) {
        await usuarioRepo.save(
          usuarioRepo.create({
            nombre: ce.monitor_cluster,
            telefono: ce.telefono_monitor || undefined,
            dui: ce.dui_cluster?.replace(/-/g, '') || undefined,
            rol: 'monitor_cluster',
            centro_escolar_id: ce.id,
            activo: true,
          }),
        );
        created++;
        console.log(`Created monitor: ${ce.monitor_cluster} (${ce.nombre})`);
      } else {
        skipped++;
      }
    }
  }

  await AppDataSource.destroy();
  console.log(
    `\nSeed completed. Created: ${created}, Skipped: ${skipped}`,
  );
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
