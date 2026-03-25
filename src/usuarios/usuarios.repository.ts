import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity.js';

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) { }

  async findByTelefono(telefono: string): Promise<Usuario | null> {
    const digits = telefono.replace(/\D/g, '');
    if (digits.length < 8) return null;

    const suffix = digits.slice(-8);

    return this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.centro_escolar', 'ce')
      .where('u.activo = :activo', { activo: true })
      .andWhere('u.telefono LIKE :pattern', { pattern: `%${suffix}` })
      .getOne();
  }

  async findByDui(dui: string): Promise<Usuario | null> {
    const clean = dui.replace(/\D/g, '');
    if (clean.length < 8) return null;

    return this.repo.findOne({
      where: { dui: clean, activo: true },
    });
  }

  async findAll(): Promise<Usuario[]> {
    return this.repo.find({ where: { activo: true } });
  }

  async save(usuario: Partial<Usuario>): Promise<Usuario> {
    return this.repo.save(this.repo.create(usuario));
  }

  async findByNombreAndCentro(
    nombre: string,
    centroEscolarId: number,
  ): Promise<Usuario | null> {
    return this.repo.findOne({
      where: { nombre, centro_escolar_id: centroEscolarId },
    });
  }
}
