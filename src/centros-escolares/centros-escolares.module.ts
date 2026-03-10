import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentroEscolar } from './entities/centro-escolar.entity.js';
import { CentrosEscolaresRepository } from './centros-escolares.repository.js';
import { CentrosEscolaresService } from './centros-escolares.service.js';
import { CentrosEscolaresController } from './centros-escolares.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CentroEscolar])],
  controllers: [CentrosEscolaresController],
  providers: [CentrosEscolaresRepository, CentrosEscolaresService],
  exports: [CentrosEscolaresService],
})
export class CentrosEscolaresModule { }
