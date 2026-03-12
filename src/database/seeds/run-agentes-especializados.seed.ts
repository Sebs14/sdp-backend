import { DataSource } from 'typeorm';
import { AgenteEspecializado } from '../../agentes-especializados/entities/agente-especializado.entity';
import { seedAgentesEspecializados } from './agentes-especializados.seed';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sdp_mined',
  entities: [AgenteEspecializado],
  synchronize: true,
});

async function run() {
  await AppDataSource.initialize();
  await seedAgentesEspecializados(AppDataSource);
  await AppDataSource.destroy();
  console.log('Agentes especializados seed completed.');
}

run().catch((err) => {
  console.error('Agentes especializados seed failed:', err);
  process.exit(1);
});
