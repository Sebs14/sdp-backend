import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCentroEscolarColumns1710864000000
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE centros_escolares
        ADD COLUMN IF NOT EXISTS clasificacion varchar,
        ADD COLUMN IF NOT EXISTS cluster varchar,
        ADD COLUMN IF NOT EXISTS correo varchar,
        ADD COLUMN IF NOT EXISTS director varchar,
        ADD COLUMN IF NOT EXISTS dui_director varchar,
        ADD COLUMN IF NOT EXISTS dui_cluster varchar,
        ADD COLUMN IF NOT EXISTS telefono_director varchar,
        ADD COLUMN IF NOT EXISTS telefono_asignado varchar,
        ADD COLUMN IF NOT EXISTS telefono_1 varchar,
        ADD COLUMN IF NOT EXISTS telefono_monitor varchar,
        ADD COLUMN IF NOT EXISTS monitor_cluster varchar,
        ADD COLUMN IF NOT EXISTS modalidad_atencion varchar,
        ADD COLUMN IF NOT EXISTS educacion_inicial varchar,
        ADD COLUMN IF NOT EXISTS turno varchar,
        ADD COLUMN IF NOT EXISTS latitud decimal(10,6),
        ADD COLUMN IF NOT EXISTS longitud decimal(10,6),
        ADD COLUMN IF NOT EXISTS sede_circulo_familia varchar,
        ADD COLUMN IF NOT EXISTS sede_enlaces_asociada varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE centros_escolares
        DROP COLUMN IF EXISTS clasificacion,
        DROP COLUMN IF EXISTS cluster,
        DROP COLUMN IF EXISTS correo,
        DROP COLUMN IF EXISTS director,
        DROP COLUMN IF EXISTS dui_director,
        DROP COLUMN IF EXISTS dui_cluster,
        DROP COLUMN IF EXISTS telefono_director,
        DROP COLUMN IF EXISTS telefono_asignado,
        DROP COLUMN IF EXISTS telefono_1,
        DROP COLUMN IF EXISTS telefono_monitor,
        DROP COLUMN IF EXISTS monitor_cluster,
        DROP COLUMN IF EXISTS modalidad_atencion,
        DROP COLUMN IF EXISTS educacion_inicial,
        DROP COLUMN IF EXISTS turno,
        DROP COLUMN IF EXISTS latitud,
        DROP COLUMN IF EXISTS longitud,
        DROP COLUMN IF EXISTS sede_circulo_familia,
        DROP COLUMN IF EXISTS sede_enlaces_asociada
    `);
  }
}
