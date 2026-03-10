import { DataSource } from 'typeorm';
import { Tipificacion } from '../../tipificaciones/entities/tipificacion.entity';
import { seedTipificaciones } from './tipificaciones.seed';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sdp_mined',
  entities: [Tipificacion],
  synchronize: true,
});

async function run() {
  await AppDataSource.initialize();
  await seedTipificaciones(AppDataSource);
  await AppDataSource.destroy();
  console.log('Tipificaciones seed completed.');
}

run().catch((err) => {
  console.error('Tipificaciones seed failed:', err);
  process.exit(1);
});
