import { DataSource } from 'typeorm';
import { CentroEscolar } from '../../centros-escolares/entities/centro-escolar.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sdp_mined',
  entities: [CentroEscolar],
  synchronize: false,
});

const CENTROS_SEED = [
  {
    codigo: '11001',
    nombre: 'Centro Escolar Dr. Darío González',
    municipio: 'San Salvador',
    departamento: 'San Salvador',
    distrito: '06-01',
    modalidad: 'Piloto',
    activo: true,
  },
  {
    codigo: '11002',
    nombre: 'Complejo Educativo Dolores C. de Arias',
    municipio: 'Soyapango',
    departamento: 'San Salvador',
    distrito: '06-02',
    modalidad: 'Control',
    activo: true,
  },
  {
    codigo: '11003',
    nombre: 'Centro Escolar Cantón El Palmar',
    municipio: 'Santa Ana',
    departamento: 'Santa Ana',
    distrito: '01-01',
    modalidad: 'Standard',
    activo: true,
  },
];

async function seed() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(CentroEscolar);

  for (const centro of CENTROS_SEED) {
    const exists = await repo.findOne({ where: { codigo: centro.codigo } });
    if (!exists) {
      await repo.save(repo.create(centro));
      console.log(`Seeded: ${centro.codigo} - ${centro.nombre}`);
    } else {
      console.log(`Already exists: ${centro.codigo} - ${centro.nombre}`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seed completed.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
