import { DataSource } from 'typeorm';
import { CentroEscolar } from './src/centros-escolares/entities/centro-escolar.entity.js';
import { Ticket } from './src/tickets/entities/ticket.entity.js';
import { Tipificacion } from './src/tipificaciones/entities/tipificacion.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sdp_mined',
  entities: [CentroEscolar, Ticket, Tipificacion],
  migrations: ['dist/migrations/*.js'],
});
