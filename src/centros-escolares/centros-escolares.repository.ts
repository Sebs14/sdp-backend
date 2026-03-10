import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CentroEscolar } from './entities/centro-escolar.entity.js';

@Injectable()
export class CentrosEscolaresRepository {
  constructor(
    @InjectRepository(CentroEscolar)
    private readonly repo: Repository<CentroEscolar>,
  ) { }

  async findByCodigo(codigo: string): Promise<CentroEscolar | null> {
    return this.repo.findOne({ where: { codigo, activo: true } });
  }

  async findAll(): Promise<CentroEscolar[]> {
    return this.repo.find({ where: { activo: true } });
  }

  async findByNombre(nombre: string): Promise<CentroEscolar[]> {
    return this.repo.find({
      where: { nombre: ILike(`%${nombre}%`), activo: true },
      take: 5,
    });
  }
}
