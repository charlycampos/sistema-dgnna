# Catálogo de tablas — Sistema DGNNA

**Última verificación:** 28 de agosto de 2026

**Fuente:** `USER_TABLES` y `USER_TAB_COLUMNS` de Oracle, consultados mediante los contenedores activos.

**Alcance:** 9 esquemas funcionales, 35 tablas físicas. No se consultaron ni modificaron registros de negocio.

> Este documento describe el estado actualmente desplegado. Los modelos SQLAlchemy y los scripts de creación pueden contener definiciones históricas que no coincidan completamente con Oracle.

## Resumen por esquema

| Esquema | Servicio propietario | Tablas | Estado |
|---|---|---:|---|
| `AUTH_DB` | `auth-service` | 2 | Activo |
| `APELACIONES_DB` | `apelaciones-service` | 10 | Activo; contiene 2 tablas POI por revisar |
| `SALA_DB` | `sala-service` | 1 | Activo |
| `SUSTRACION_DB` | `sustracion-service` | 6 | Activo; contiene 2 variantes de Proceso Operativo |
| `TRANSPARENCIA_DB` | `transparencia-service` | 1 | Activo |
| `PROYECTOS_LEY_DB` | `proyectosley-service` | 9 | Activo |
| `POI_DB` | `poi-service` | 2 | Activo |
| `MAPA_DB` | `mapa-service` | 3 | Activo |
| `PREVENIR_DB` | `prevenir-service` | 1 | Activo |

## AUTH_DB — Autenticación y usuarios

| Tabla | Columnas | Propósito |
|---|---:|---|
| `USUARIOS` | 8 | Cuenta, credenciales, rol global y estado del usuario |
| `USUARIO_MODULOS` | 4 | Acceso y nivel asignado por usuario y módulo |

Este esquema será el punto inicial de los cambios de gestión de usuarios. Las primeras fases no deben modificar las tablas funcionales de Apelaciones ni Sala.

## APELACIONES_DB — Apelaciones

| Tabla | Columnas | Propósito |
|---|---:|---|
| `APELACIONES` | 26 | Expediente principal de apelación |
| `APELANTES_DETALLE` | 8 | Personas o instituciones apelantes asociadas al expediente |
| `NNA_DETALLE` | 8 | NNA asociados al expediente |
| `ABOGADOS` | 5 | Catálogo de abogados |
| `REVISORES` | 5 | Catálogo de revisores |
| `PROCEDENCIAS` | 3 | Catálogo de procedencias |
| `COMPLEJIDADES_JURIDICAS` | 4 | Catálogo y puntaje de complejidad jurídica |
| `EXTENSION_RANGOS` | 6 | Rangos de folios y puntaje por extensión |
| `POI_CARGAS` | 7 | Tabla POI presente dentro del esquema de Apelaciones; propiedad pendiente de confirmar |
| `POI_DATOS` | 41 | Tabla POI histórica/ampliada; propiedad pendiente de confirmar |

### Columnas confirmadas de Apelaciones

| Tabla | Columnas |
|---|---|
| `APELACIONES` | `ID`, `NUMEROEXPEDIENTE`, `FECHAINGRESO`, `FECHAINGRESOMIMP`, `PLAZOVENCIMIENTO`, `APELANTE`, `NNACAR`, `PROCEDENCIA`, `DOCUMENTO`, `ASUNTO`, `FOLIOS`, `PUNTOSEXTENSION`, `COMPLEJIDADID`, `PUNTOSCOMPLEJIDAD`, `PUNTOSTOTAL`, `ABOGADOID`, `FECHAASIGNACION`, `ESTADO`, `NUMERORESOLUCION`, `DOCUMENTOATENCION`, `CARGOS`, `OBSERVACIONES`, `CREATEDAT`, `UPDATEDAT`, `REVISORID`, `FECHAREVISOR` |
| `APELANTES_DETALLE` | `ID`, `APELACION_ID`, `TIPO`, `NOMBRES`, `APELLIDO_PATERNO`, `APELLIDO_MATERNO`, `INSTITUCION`, `DOCUMENTO` |
| `NNA_DETALLE` | `ID`, `APELACION_ID`, `TIPO`, `NOMBRES`, `PRIMER_APELLIDO`, `SEGUNDO_APELLIDO`, `EDAD`, `INSTITUCION` |
| `ABOGADOS` | `ID`, `NOMBRE`, `ACTIVO`, `CREATEDAT`, `UPDATEDAT` |
| `REVISORES` | `ID`, `NOMBRE`, `ACTIVO`, `CREATEDAT`, `UPDATEDAT` |
| `PROCEDENCIAS` | `ID`, `NOMBRE`, `ACTIVO` |
| `COMPLEJIDADES_JURIDICAS` | `ID`, `NOMBRE`, `PUNTOS`, `ACTIVO` |
| `EXTENSION_RANGOS` | `ID`, `DESCRIPCION`, `MINFOLIOS`, `MAXFOLIOS`, `PUNTOS`, `ACTIVO` |

### Observación de propiedad

`POI_CARGAS` y `POI_DATOS` también existen en `POI_DB`. No deben eliminarse de `APELACIONES_DB` hasta revisar referencias, endpoints, jobs y registros. La presencia en ambos esquemas se considera deuda de migración, no autorización para borrar.

## SALA_DB — Sala de Reuniones

| Tabla | Columnas | Propósito |
|---|---:|---|
| `RESERVAS_SALA` | 13 | Reservas y responsables de las salas de reuniones |

Columnas confirmadas:

`ID`, `FECHA`, `TITULO`, `HORAINICIO`, `HORAFIN`, `CATEGORIA`, `ESTADO`, `DESCRIPCION`, `CREADOPOR`, `CREATEDAT`, `UPDATEDAT`, `DIRECCIONRESPONSABLE`, `NOMBRERESPONSABLE`.

Este módulo es el candidato recomendado para introducir primero la autorización por módulo, antes de Apelaciones.

## SUSTRACION_DB — Sustracción Internacional

| Tabla | Columnas | Propósito |
|---|---:|---|
| `CASOS_SUSTRACION` | 40 | Expediente principal de sustracción internacional |
| `NNA_SUSTRACION` | 10 | NNA relacionados con el caso |
| `BITACORA_SUSTRACION` | 6 | Historial operativo del caso |
| `HISTORIAL_JUDICIAL` | 7 | Actuaciones e hitos judiciales |
| `PROCESO_OPERATIVO_SUSTRACION` | 29 | Proceso operativo; variante con una sola `C` |
| `PROCESO_OPERATIVO_SUSTRACCION` | 21 | Proceso operativo; variante con doble `C` |

### Observación de nomenclatura

Las dos tablas de Proceso Operativo coexisten físicamente. Antes de consolidarlas se debe identificar cuál consumen los endpoints actuales, comparar estructura y registros, y preparar una migración con reversión. No eliminar ninguna por coincidencia de nombre.

## TRANSPARENCIA_DB — Transparencia

| Tabla | Columnas | Propósito |
|---|---:|---|
| `TRANSPARENCIA` | 16 | Solicitudes y seguimiento de transparencia |

## PROYECTOS_LEY_DB — Proyectos de Ley

| Tabla | Columnas | Propósito |
|---|---:|---|
| `PROYECTOS_LEY` | 15 | Expediente principal del proyecto de ley |
| `PL_EVENTOS` | 16 | Eventos e hitos del proyecto |
| `PL_EVENTO_DIRECCIONES` | 3 | Relación evento-dirección |
| `PL_EVENTO_PROFESIONALES` | 3 | Relación evento-profesional |
| `PL_COMISIONES` | 4 | Catálogo de comisiones |
| `PL_CONGRESISTAS` | 5 | Catálogo de congresistas |
| `PL_TIPOS_OPINION` | 4 | Catálogo de tipos de opinión |
| `PL_DIRECCIONES` | 4 | Catálogo de direcciones |
| `PL_PROFESIONALES` | 4 | Catálogo de profesionales |

## POI_DB — POI / PP117

| Tabla | Columnas | Propósito |
|---|---:|---|
| `POI_CARGAS` | 7 | Cabecera y metadatos de cada carga POI |
| `POI_DATOS` | 10 | Datos procesados asociados a la carga |

La estructura de `POI_DATOS` en este esquema tiene 10 columnas, mientras la tabla homónima de `APELACIONES_DB` tiene 41. No deben considerarse copias equivalentes sin una comparación de columnas y uso funcional.

## MAPA_DB — Mapa de Cobertura

| Tabla | Columnas | Propósito |
|---|---:|---|
| `MAPA_UBIGEO` | 5 | Catálogo territorial/ubigeo |
| `MAPA_INSTITUCIONES` | 14 | Instituciones y ubicación |
| `MAPA_COBERTURA` | 3 | Relación de cobertura territorial |

## PREVENIR_DB — Prevenir para Proteger

| Tabla | Columnas | Propósito |
|---|---:|---|
| `ACTIVIDADES_PREVENIR` | 20 | Actividades del módulo Prevenir para Proteger |

## Códigos de módulo para autorización

Los valores de `USUARIO_MODULOS.MODULO` deben normalizarse contra un catálogo único. Códigos propuestos:

| Código canónico | Servicio / esquema |
|---|---|
| `apelaciones` | `apelaciones-service` / `APELACIONES_DB` |
| `sala-reuniones` | `sala-service` / `SALA_DB` |
| `sustraccion` | `sustracion-service` / `SUSTRACION_DB` |
| `transparencia` | `transparencia-service` / `TRANSPARENCIA_DB` |
| `proyectos-ley` | `proyectosley-service` / `PROYECTOS_LEY_DB` |
| `poi-pp117` | `poi-service` / `POI_DB` |
| `mapa` | `mapa-service` / `MAPA_DB` |
| `prevenir-proteger` | `prevenir-service` / `PREVENIR_DB` |

## Reglas de mantenimiento

1. Actualizar este documento después de toda migración de esquema.
2. Registrar fecha, script de migración y responsable del cambio.
3. Consultar `USER_TABLES`, `USER_TAB_COLUMNS`, claves y restricciones desde el esquema propietario.
4. No asumir que `Base.metadata.create_all()` representa una migración versionada.
5. No eliminar tablas duplicadas o históricas sin análisis de referencias, respaldo y plan de reversión.
6. Mantener Apelaciones y Sala sin cambios destructivos durante la migración de gestión de usuarios.
