import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tipificacion } from './entities/tipificacion.entity.js';
import { TipificacionesRepository } from './tipificaciones.repository.js';
import { TipificacionesService } from './tipificaciones.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tipificacion])],
  providers: [TipificacionesRepository, TipificacionesService],
  exports: [TipificacionesService],
})
export class TipificacionesModule { }
