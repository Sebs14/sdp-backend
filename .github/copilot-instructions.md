# Instrucciones del Proyecto SDP Backend

## Stack Tecnológico

- **Framework**: NestJS 11 con TypeScript (target ES2023, módulos ESM con nodenext)
- **Base de datos**: PostgreSQL con TypeORM 0.3
- **Gestor de paquetes**: pnpm
- **Runtime**: Node.js
- **Documentación API**: Swagger/OpenAPI

## Convenciones de Nombres

- **Idioma del dominio**: Español para nombres de entidades, columnas de BD, módulos de negocio y variables de dominio (ej. `CentroEscolar`, `tipificacion`, `nombre_solicitante`)
- **Idioma del framework**: Inglés para patrones de NestJS (ej. `Service`, `Controller`, `Module`, `Repository`)
- **Clases**: PascalCase — `TicketsService`, `AgenteEspecializado`, `CentroEscolar`
- **Métodos**: camelCase — `crearTicket()`, `verificarCentro()`, `processMessage()`
- **Columnas de BD**: snake_case — `nombre_solicitante`, `telefono_solicitante`, `ticket_numero`
- **Constantes**: SCREAMING_SNAKE_CASE — `MAX_TOOL_ITERATIONS`, `FALLBACK_RESPONSE`
- **Tablas**: snake_case en plural — `@Entity('tickets')`, `@Entity('centros_escolares')`
- **Archivos y carpetas**: kebab-case en español — `centros-escolares/`, `agentes-especializados.service.ts`

## Estructura de Módulos

Cada módulo de dominio sigue esta estructura:

```
nombre-modulo/
  nombre-modulo.module.ts
  nombre-modulo.service.ts
  nombre-modulo.controller.ts      # si expone endpoints
  nombre-modulo.repository.ts      # si accede a BD
  dto/
    nombre-accion.dto.ts
  entities/
    nombre-entidad.entity.ts
```

## Patrones de Código

### Servicios

```typescript
@Injectable()
export class NombreService {
  private readonly logger = new Logger(NombreService.name);

  constructor(
    private readonly dependencia1: Servicio1,
    private readonly dependencia2: Servicio2,
  ) {}

  async metodo(params): Promise<TipoRetorno> {
    // lógica
  }
}
```

- Siempre usar `private readonly` para dependencias inyectadas en el constructor
- Siempre inicializar `Logger` con el nombre de la clase: `new Logger(NombreClase.name)`
- Operaciones no bloqueantes usar fire-and-forget con `.catch()`:
  ```typescript
  this.servicio.operacionExterna(datos).catch((err) => {
    this.logger.error('Error en operación', err);
  });
  ```

### Controladores

```typescript
@ApiTags('NombreDominio')
@Controller('ruta')
export class NombreController {
  private readonly logger = new Logger(NombreController.name);

  constructor(private readonly service: NombreService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Descripción de la operación' })
  @ApiResponse({ status: 200, description: 'Descripción', type: DtoRespuesta })
  async metodo(@Body() dto: NombreDto): Promise<TipoRespuesta> {
    try {
      return await this.service.metodo(dto);
    } catch (error) {
      this.logger.error('Mensaje descriptivo', error);
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Mensaje de error',
        error: error.message,
      });
    }
  }
}
```

- Siempre agregar decoradores de Swagger: `@ApiTags`, `@ApiOperation`, `@ApiResponse`
- Manejo de errores con excepciones de NestJS (`InternalServerErrorException`, `NotFoundException`, etc.)
- Respuestas de error estructuradas: `{ statusCode, message, error }`

### Entidades (TypeORM)

```typescript
@Entity('nombre_tabla')
export class NombreEntidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre_campo: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- Usar `@CreateDateColumn()` y `@UpdateDateColumn()` para timestamps automáticos
- Claves primarias con `@PrimaryGeneratedColumn()` (auto-increment)
- Especificar `type`, `length`, `nullable`, `unique` y `default` en `@Column()` cuando aplique

### DTOs

```typescript
export class NombreDto {
  @ApiProperty({ description: 'Descripción del campo' })
  @IsString()
  @IsNotEmpty()
  campo: string;

  @ApiPropertyOptional({ description: 'Campo opcional' })
  @IsOptional()
  @IsString()
  campoOpcional?: string;
}
```

- Siempre incluir decoradores de `class-validator` para validación
- Siempre incluir decoradores de Swagger (`@ApiProperty` / `@ApiPropertyOptional`)

### Repositorios

```typescript
@Injectable()
export class NombreRepository {
  constructor(
    @InjectRepository(NombreEntidad)
    private readonly repository: Repository<NombreEntidad>,
  ) {}

  async save(entidad: Partial<NombreEntidad>): Promise<NombreEntidad> {
    return this.repository.save(entidad);
  }

  async findAll(): Promise<NombreEntidad[]> {
    return this.repository.find();
  }
}
```

## Configuración

- Variables de entorno centralizadas en `src/config/configuration.ts` como factory function
- Acceso vía `ConfigService.get<Type>(key)` — nunca `process.env` directo en servicios
- Prefijo global de API: `/api`
- Swagger disponible en `/api/docs`
- Validación global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`

## Regla Obligatoria de Continuación

Al final de **CADA respuesta** (SIN EXCEPCIÓN), debes ejecutar este comando en terminal usando la tool "Run [zsh] command":

```bash
printf "¿En qué más te puedo ayudar? (escribe 'salir' para terminar): "
```

Así mantendrás la conversación activa para seguir asistiendo. No importa si realizaste la pregunta anteriormente o no, **SIEMPRE** debes ejecutar este comando al finalizar tu respuesta.

> **IMPORTANTE**: No confundir con preguntas al usuario. Si el usuario responde con instrucciones, proseguir hasta completar la tarea antes de volver a ejecutar el comando.
