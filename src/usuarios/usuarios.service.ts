import { Injectable, Logger } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository.js';
import { Usuario } from './entities/usuario.entity.js';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly repository: UsuariosRepository) { }

  async findAll(): Promise<Usuario[]> {
    return this.repository.findAll();
  }

  /**
   * Identifica un usuario por su número de teléfono.
   * Retorna los datos del usuario y su centro escolar asociado.
   */
  async identificarPorTelefono(
    telefono: string,
  ): Promise<Record<string, unknown>> {
    if (!telefono) {
      return { identificado: false, mensaje: 'No se proporcionó teléfono.' };
    }

    this.logger.debug(`Identificando usuario por teléfono: ${telefono}`);
    const usuario = await this.repository.findByTelefono(telefono);

    if (!usuario) {
      return {
        identificado: false,
        mensaje: 'No se encontró un usuario registrado con ese teléfono.',
      };
    }

    const ce = usuario.centro_escolar;

    return {
      identificado: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        telefono: usuario.telefono,
      },
      centro_escolar: ce
        ? {
          codigo: ce.codigo,
          nombre: ce.nombre,
          departamento: ce.departamento,
          municipio: ce.municipio,
          distrito: ce.distrito,
          director: ce.director,
          modalidad: ce.modalidad,
        }
        : null,
    };
  }
}
