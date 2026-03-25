import { DataSource } from 'typeorm';
import { CentroEscolar } from '../../centros-escolares/entities/centro-escolar.entity';
import * as fs from 'node:fs';
import * as path from 'node:path';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sdp_mined',
  entities: [CentroEscolar],
  synchronize: true,
});

function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function mapRowToCentro(row: Record<string, string>): Partial<CentroEscolar> {
  const lat = parseFloat(row['LATITUD']);
  const lng = parseFloat(row['LONGITUD']);

  return {
    codigo: row['CODIGO CE'] || '',
    nombre: row['CENTRO ESCOLAR'] || '',
    clasificacion: row['CLASIFICACION'] || undefined,
    cluster: row['CLUSTER'] || undefined,
    correo: row['CORREO'] || undefined,
    departamento: row['DEPARTAMENTO'] || undefined,
    director: row['DIRECTOR'] || undefined,
    distrito: row['DISTRITO'] || undefined,
    dui_cluster: row['DUI CLUSTER'] || undefined,
    dui_director: row['DUI DIRECTOR'] || undefined,
    educacion_inicial: row['EDUCACION INICIAL'] || undefined,
    latitud: isNaN(lat) ? undefined : lat,
    longitud: isNaN(lng) ? undefined : lng,
    modalidad: row['MODALIDAD'] || undefined,
    modalidad_atencion: row['MODALIDAD ATENCION'] || undefined,
    monitor_cluster: row['MONITOR DE CLUSTER'] || undefined,
    municipio: row['MUNICIPIO'] || undefined,
    sede_circulo_familia: row['SEDE SE CIRCULO DE FAMILIA'] || undefined,
    telefono_asignado: row['TELEFONO ASIGNADO'] || undefined,
    telefono_director: row['TELEFONO DIRECTOR'] || undefined,
    telefono_1: row['TELEFONO_1'] || undefined,
    turno: row['TURNO'] || undefined,
    telefono_monitor: row['TELEFONO MONITOR'] || undefined,
    sede_enlaces_asociada: row['SEDE ENLACES ASOCIADA'] || undefined,
    activo: true,
  };
}

async function seed() {
  const csvPath = path.resolve(
    __dirname,
    '../../../listado G1 y G2 para BOT.csv',
  );

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`Parsed ${rows.length} rows from CSV`);

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(CentroEscolar);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const centro = mapRowToCentro(row);
    if (!centro.codigo) {
      skipped++;
      continue;
    }

    const exists = await repo.findOne({ where: { codigo: centro.codigo } });
    if (!exists) {
      await repo.save(repo.create(centro));
      created++;
      console.log(`Created: ${centro.codigo} - ${centro.nombre}`);
    } else {
      await repo.update(exists.id, centro);
      updated++;
      console.log(`Updated: ${centro.codigo} - ${centro.nombre}`);
    }
  }

  await AppDataSource.destroy();
  console.log(
    `\nSeed completed. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`,
  );
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
