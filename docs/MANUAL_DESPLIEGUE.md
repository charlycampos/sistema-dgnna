# MANUAL DE DESPLIEGUE

## Sistema Integral DGNNA

**Dirección General de Niñas, Niños y Adolescentes**
**Ministerio de la Mujer y Poblaciones Vulnerables — MIMP**

---

### Control del documento

| Campo | Contenido |
| :--- | :--- |
| **Título** | Manual de Despliegue — Sistema Integral DGNNA |
| **Código** | MD-DGNNA-001 |
| **Versión** | 1.0 |
| **Fecha de emisión** | *(a completar)* |
| **Elaborado por** | Dirección General de Niñas, Niños y Adolescentes (DGNNA) |
| **Dirigido a** | Oficina General de Tecnologías de la Información (OGTI) |
| **Clasificación** | Uso interno — MIMP |
| **Estado** | Para revisión |

### Historial de versiones

| Versión | Fecha | Autor | Descripción del cambio |
| :---: | :--- | :--- | :--- |
| 1.0 | *(a completar)* | DGNNA | Versión inicial del manual de despliegue. |

### Aprobaciones

| Rol | Nombre | Cargo | Firma | Fecha |
| :--- | :--- | :--- | :--- | :--- |
| Elabora | | | | |
| Revisa | | | | |
| Aprueba | | | | |

---

## Tabla de contenido

1. [Objetivo](#1-objetivo)
2. [Alcance](#2-alcance)
3. [Audiencia y perfiles requeridos](#3-audiencia-y-perfiles-requeridos)
4. [Descripción general del sistema](#4-descripción-general-del-sistema)
5. [Arquitectura de despliegue](#5-arquitectura-de-despliegue)
6. [Inventario de servicios y puertos](#6-inventario-de-servicios-y-puertos)
7. [Requisitos previos](#7-requisitos-previos)
8. [Variables de entorno](#8-variables-de-entorno)
9. [Preparación de la base de datos Oracle](#9-preparación-de-la-base-de-datos-oracle)
10. [Procedimiento de despliegue](#10-procedimiento-de-despliegue)
11. [Verificación post-despliegue](#11-verificación-post-despliegue)
12. [Migración de datos desde el monolito](#12-migración-de-datos-desde-el-monolito)
13. [Operación y mantenimiento](#13-operación-y-mantenimiento)
14. [Actualización de versión](#14-actualización-de-versión)
15. [Rollback](#15-rollback)
16. [Respaldo y restauración](#16-respaldo-y-restauración)
17. [Consideraciones de seguridad](#17-consideraciones-de-seguridad)
18. [Solución de problemas](#18-solución-de-problemas)
19. [Anexos](#19-anexos)

---

## 1. Objetivo

Describir de forma detallada y reproducible el procedimiento de instalación, configuración, verificación y operación del **Sistema Integral DGNNA** sobre infraestructura de servidor administrada por la OGTI, de modo que un administrador de plataforma sin conocimiento previo del aplicativo pueda ejecutar el despliegue completo siguiendo este documento.

## 2. Alcance

Este manual cubre:

- El despliegue del sistema completo (13 contenedores) mediante **Docker Compose** sobre un servidor **Linux**.
- La configuración de la conectividad hacia la base de datos **Oracle Database XE 21c**.
- La inicialización de esquemas y la carga inicial de datos.
- La verificación funcional posterior al despliegue.
- Las tareas rutinarias de operación: arranque, parada, logs, respaldo, actualización y rollback.

Este manual **no** cubre:

- El uso funcional de los módulos por parte del usuario final (ver *Manual de Usuario*).
- El detalle de las decisiones arquitectónicas (ver *Documento de Arquitectura de Software*).
- La instalación del motor Oracle Database, que es responsabilidad de la unidad de base de datos de la OGTI.

## 3. Audiencia y perfiles requeridos

| Perfil | Responsabilidad en el despliegue |
| :--- | :--- |
| Administrador de servidores Linux | Aprovisionamiento del host, instalación de Docker, apertura de puertos. |
| Administrador de base de datos (DBA Oracle) | Creación de los 11 esquemas, otorgamiento de privilegios, respaldos. |
| Administrador de redes / seguridad | Reglas de firewall, publicación del servicio, certificados TLS. |
| Responsable funcional DGNNA | Validación de la verificación post-despliegue. |

## 4. Descripción general del sistema

El Sistema Integral DGNNA es una plataforma web modular que centraliza la gestión operativa, jurídica y administrativa de la Dirección General de Niñas, Niños y Adolescentes. Está construido bajo una **arquitectura de microservicios**: un frontend único, un API Gateway y once microservicios independientes, cada uno con su propio esquema de base de datos.

### 4.1. Módulos funcionales

| # | Módulo | Marco normativo / propósito |
| :-: | :--- | :--- |
| 1 | Recursos de apelación y triaje jurídico | Asignación ponderada de expedientes, control de SLA y balanceo de carga entre revisores. |
| 2 | Restitución y sustracción internacional de NNA | Convenio de La Haya 1980 / Directiva 006-2021-MIMP. |
| 3 | Seguimiento de proyectos de ley | Opiniones técnicas y alertas de plazos del Congreso. |
| 4 | Transparencia y acceso a la información | Ley 27806 — solicitudes SAIP y control de plazos legales. |
| 5 | Reserva de sala de reuniones | Disponibilidad y control de uso de la sala de la DGNNA. |
| 6 | POI y Programa Presupuestal 0117 | Carga masiva y seguimiento de la ejecución física y presupuestal. |
| 7 | Mapa de cobertura territorial | Georreferenciación de UPE, CAR y DEMUNA a nivel nacional. |
| 8 | Prevenir para Proteger | Intervenciones preventivas a nivel distrital y regional. |
| 9 | Auditoría y trazabilidad | Registro de actividades, comparador de cambios y reportes. |
| 10 | Consulta normativa y asistente RAG | Búsqueda sobre el DL 1297 y su Reglamento, con asistente Multi-LLM opcional. |
| 11 | Autenticación y control de accesos | Gestión de usuarios, roles y permisos por módulo (RBAC). |

### 4.2. Pila tecnológica

| Capa | Tecnología | Versión |
| :--- | :--- | :--- |
| Frontend | Next.js (App Router) + React | Next.js 16.1.1 / React 19.2.3 |
| Frontend — estilos | Tailwind CSS 4 + Radix UI + Lucide | — |
| Runtime frontend | Node.js (imagen `node:20-alpine`) | 20.x |
| API Gateway y microservicios | FastAPI + Uvicorn | FastAPI 0.111.0 |
| Runtime backend | Python (imagen `python:3.11-slim`) | 3.11 |
| ORM | SQLAlchemy | 2.0.x |
| Driver de base de datos | `oracledb` (modo thin) | 2.x |
| Base de datos | Oracle Database XE | 21c (PDB `XEPDB1`) |
| Autenticación | JWT HS256 (`PyJWT`) + `bcrypt` | — |
| Orquestación | Docker Engine + Docker Compose v2 | — |

> **Nota sobre el driver Oracle:** el paquete `oracledb` opera en **modo thin**, es decir, **no requiere la instalación de Oracle Instant Client** en el servidor ni dentro de los contenedores. Esto simplifica el despliegue de forma significativa.

---

## 5. Arquitectura de despliegue

### 5.1. Topología

```mermaid
flowchart TD
    subgraph Cliente["Estación de trabajo del usuario"]
        Nav["Navegador web"]
    end

    subgraph Host["Servidor Linux — OGTI"]
        subgraph Red["Red bridge Docker: dgnna-net"]
            FE["frontend<br/>Next.js 16<br/>:3000"]
            GW["gateway<br/>API Gateway FastAPI<br/>:8000"]
            AU["auth-service :8001"]
            AP["apelaciones-service :8002"]
            SU["sustracion-service :8003"]
            SA["sala-service :8004"]
            PL["proyectosley-service :8005"]
            TR["transparencia-service :8006"]
            PO["poi-service :8007"]
            MA["mapa-service :8008"]
            AD["auditoria-service :8009"]
            PR["prevenir-service :8010"]
            NO["normativa-service :8011"]
        end
    end

    subgraph BD["Servidor de base de datos"]
        OR[("Oracle Database XE 21c<br/>PDB XEPDB1 — puerto 1521<br/>11 esquemas dedicados")]
    end

    Nav -->|"HTTP/HTTPS :3000"| FE
    Nav -->|"HTTP/HTTPS :8000"| GW
    FE -->|"proxy interno http://gateway:8000"| GW

    GW --> AU
    GW --> AP
    GW --> SU
    GW --> SA
    GW --> PL
    GW --> TR
    GW --> PO
    GW --> MA
    GW --> AD
    GW --> PR
    GW --> NO

    AP -.->|"registro asíncrono"| AD
    SU -.->|"registro asíncrono"| AD
    PL -.->|"registro asíncrono"| AD
    TR -.->|"registro asíncrono"| AD
    NO -.->|"registro asíncrono"| AD

    AU --> OR
    AP --> OR
    SU --> OR
    SA --> OR
    PL --> OR
    TR --> OR
    PO --> OR
    MA --> OR
    AD --> OR
    PR --> OR
    NO --> OR
```

### 5.2. Principios de comunicación

1. **Red privada interna.** Los trece contenedores comparten la red bridge `dgnna-net`. El DNS interno de Docker resuelve cada servicio por su nombre (`http://gateway:8000`, `http://auth-service:8001`, etc.); no se usan direcciones IP fijas.

2. **Punto de entrada único.** El navegador nunca se comunica directamente con un microservicio. Todo tráfico funcional pasa por el **API Gateway** en el puerto `8000`, que valida el token JWT y reenvía la petición al microservicio correspondiente según el prefijo de la ruta.

3. **Conexión a base de datos.** Cada microservicio abre su propia conexión a Oracle usando una cadena `DATABASE_URL` independiente, con un usuario y un esquema exclusivos. No hay un esquema compartido entre servicios.

4. **Creación automática de tablas.** Al arrancar, cada microservicio ejecuta `Base.metadata.create_all()`, lo que crea las tablas que falten dentro de su propio esquema. **Los usuarios y esquemas de Oracle NO se crean solos**: deben existir previamente (sección 9).

---

## 6. Inventario de servicios y puertos

| # | Servicio Compose | Puerto host | Puerto interno | Esquema Oracle | Imagen base | Límite de memoria |
| :-: | :--- | :---: | :---: | :--- | :--- | :---: |
| 1 | `frontend` | 3000 | 3000 | — | `node:20-alpine` | 400 MB |
| 2 | `gateway` | 8000 | 8000 | — | `python:3.11-slim` | 200 MB |
| 3 | `auth-service` | 8001 | 8001 | `AUTH_DB` | `python:3.11-slim` | 200 MB |
| 4 | `apelaciones-service` | 8002 | 8002 | `APELACIONES_DB` | `python:3.11-slim` | 200 MB |
| 5 | `sustracion-service` | 8003 | 8003 | `SUSTRACION_DB` | `python:3.11-slim` | 200 MB |
| 6 | `sala-service` | 8004 | 8004 | `SALA_DB` | `python:3.11-slim` | 200 MB |
| 7 | `proyectosley-service` | 8005 | 8005 | `PROYECTOS_LEY_DB` | `python:3.11-slim` | 200 MB |
| 8 | `transparencia-service` | 8006 | 8006 | `TRANSPARENCIA_DB` | `python:3.11-slim` | 200 MB |
| 9 | `poi-service` | 8007 | 8007 | `POI_DB` | `python:3.11-slim` | 200 MB |
| 10 | `mapa-service` | 8008 | 8008 | `MAPA_DB` | `python:3.11-slim` | 200 MB |
| 11 | `auditoria-service` | 8009 | 8009 | `AUDITORIA_DB` | `python:3.11-slim` | 200 MB |
| 12 | `prevenir-service` | 8010 | 8010 | `PREVENIR_DB` | `python:3.11-slim` | 200 MB |
| 13 | `normativa-service` | 8011 | 8011 | `NORMATIVA_DB` | `python:3.11-slim` | 512 MB |

**Consumo total de memoria comprometido:** aproximadamente **3.1 GB** en límites declarados.

### 6.1. Mapa de enrutamiento del Gateway

El Gateway resuelve el microservicio destino por prefijo de ruta, en el orden en que aparece a continuación:

| Prefijo de ruta | Microservicio destino |
| :--- | :--- |
| `/api/auth`, `/api/usuarios` | `auth-service:8001` |
| `/api/apelaciones`, `/api/apelantes`, `/api/nna`, `/api/abogados`, `/api/complejidad`, `/api/extension`, `/api/dashboard`, `/api/reportes`, `/api/procedencia`, `/api/revisores` | `apelaciones-service:8002` |
| `/api/sustracion` | `sustracion-service:8003` |
| `/api/sala-reuniones` | `sala-service:8004` |
| `/api/proyectos-ley` | `proyectosley-service:8005` |
| `/api/transparencia` | `transparencia-service:8006` |
| `/api/poi-pp117` | `poi-service:8007` |
| `/api/mapa` | `mapa-service:8008` |
| `/api/auditoria` | `auditoria-service:8009` |
| `/api/prevenir-proteger` | `prevenir-service:8010` |
| `/api/normativa` | `normativa-service:8011` |

Rutas públicas que **no** exigen token JWT: `/`, `/health`, `/docs`, `/openapi.json`, `/api/auth/login`, `/api/auth/logout`.

---

## 7. Requisitos previos

### 7.1. Servidor de aplicaciones

| Recurso | Mínimo | Recomendado |
| :--- | :--- | :--- |
| Sistema operativo | Linux x86_64 con soporte vigente (RHEL/Oracle Linux 8+, Ubuntu Server 22.04 LTS o equivalente) | Igual |
| CPU | 4 vCPU | 8 vCPU |
| Memoria RAM | 8 GB | 16 GB |
| Disco | 60 GB libres | 120 GB libres |
| Docker Engine | 24.0 o superior | Última versión estable |
| Docker Compose | Plugin v2 (`docker compose`) | Última versión estable |

> El mínimo de 8 GB responde a los ~3.1 GB comprometidos por los contenedores más el sobrecosto de las compilaciones de imagen (`npm install` y `npm run build` del frontend son las etapas más exigentes).

### 7.2. Base de datos

| Requisito | Detalle |
| :--- | :--- |
| Motor | Oracle Database XE 21c u Oracle Database Enterprise/Standard 19c o superior |
| Base de datos pluggable (PDB) | `XEPDB1` o la que designe la OGTI |
| Puerto del listener | 1521/TCP |
| Juego de caracteres | `AL32UTF8` |
| Esquemas | 11 usuarios/esquemas dedicados (ver sección 9) |
| Acceso | Cuenta con privilegio para crear usuarios (`SYSTEM` o equivalente), únicamente durante la instalación inicial |

### 7.3. Conectividad y red

| Origen | Destino | Puerto | Protocolo | Propósito |
| :--- | :--- | :---: | :---: | :--- |
| Estaciones de la red MIMP | Servidor de aplicaciones | 3000 | TCP | Acceso a la interfaz web |
| Estaciones de la red MIMP | Servidor de aplicaciones | 8000 | TCP | Llamadas del navegador al API Gateway |
| Servidor de aplicaciones | Servidor Oracle | 1521 | TCP | Conexión de los 11 microservicios |
| Servidor de aplicaciones | Internet / repositorios | 443 | TCP | Descarga de imágenes base y dependencias (solo durante la compilación) |
| Servidor de aplicaciones | Proveedores LLM (opcional) | 443 | TCP | Asistente normativo con IA, si se habilita |

> **Importante:** los puertos 8001 a 8011 están publicados en el `docker-compose.yml` para facilitar el diagnóstico, pero **no deben exponerse fuera del servidor**. Ver la recomendación de la sección 17.3.

### 7.4. Acceso a internet durante la compilación

La construcción de las imágenes descarga:

- Imágenes base `python:3.11-slim` y `node:20-alpine` desde Docker Hub.
- Paquetes Python desde PyPI (`pypi.org`, `files.pythonhosted.org`).
- Paquetes Node desde el registro npm (`registry.npmjs.org`).

Si el servidor no tiene salida directa a internet, la OGTI debe habilitar un proxy o un repositorio espejo interno. Alternativa: compilar las imágenes en un equipo con acceso, exportarlas con `docker save` y transferirlas al servidor con `docker load` (ver anexo 19.3).

---

## 8. Variables de entorno

Todas las variables se declaran en un archivo `.env` ubicado en la **raíz del proyecto**, junto al `docker-compose.yml`. Docker Compose lo lee automáticamente.

### 8.1. Tabla de variables

| Variable | Obligatoria | Descripción | Valor de ejemplo | Sensible |
| :--- | :---: | :--- | :--- | :---: |
| `SESSION_SECRET` | **Sí** | Clave de firma de los tokens JWT (HS256). Debe ser idéntica en el Gateway y en todos los microservicios. | Cadena aleatoria de 64 caracteres | **Sí** |
| `DATABASE_URL_AUTH` | **Sí** | Cadena de conexión al esquema `AUTH_DB`. | `oracle+oracledb://auth_db:<clave>@<host-oracle>:1521/?service_name=XEPDB1` | **Sí** |
| `DATABASE_URL_APELACIONES` | **Sí** | Cadena de conexión a `APELACIONES_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_SUSTRACION` | **Sí** | Cadena de conexión a `SUSTRACION_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_SALA` | **Sí** | Cadena de conexión a `SALA_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_PROYECTOS_LEY` | **Sí** | Cadena de conexión a `PROYECTOS_LEY_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_TRANSPARENCIA` | **Sí** | Cadena de conexión a `TRANSPARENCIA_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_POI` | **Sí** | Cadena de conexión a `POI_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_MAPA` | **Sí** | Cadena de conexión a `MAPA_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_AUDITORIA` | **Sí** | Cadena de conexión a `AUDITORIA_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_PREVENIR` | **Sí** | Cadena de conexión a `PREVENIR_DB`. | *(mismo formato)* | **Sí** |
| `DATABASE_URL_NORMATIVA` | **Sí** | Cadena de conexión a `NORMATIVA_DB`. | *(mismo formato)* | **Sí** |
| `IA_HABILITADA` | No | Activa el asistente RAG del módulo normativo. `true` / `false`. | `false` | No |
| `LLM_DEFAULT_PROVIDER` | No | Proveedor LLM por defecto: `openai`, `gemini` o `anthropic`. | `openai` | No |
| `OPENAI_API_KEY` | No | Clave de API de OpenAI. Solo si `IA_HABILITADA=true`. | — | **Sí** |
| `GEMINI_API_KEY` | No | Clave de API de Google Gemini. | — | **Sí** |
| `ANTHROPIC_API_KEY` | No | Clave de API de Anthropic. | — | **Sí** |

### 8.2. Variables del frontend definidas en el `docker-compose.yml`

| Variable | Valor actual en el repositorio | Acción requerida en producción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Sin cambios. |
| `BACKEND_URL` | `http://gateway:8000` | Sin cambios (resolución interna de Docker). |
| `BACKEND_INTERNAL_URL` | `http://gateway:8000` | Sin cambios. |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8000` | **Debe modificarse.** Ver la advertencia siguiente. |

> ### ⚠ Punto crítico de configuración
>
> `NEXT_PUBLIC_BACKEND_URL` es la dirección que el **navegador del usuario** utiliza para llamar al API Gateway. El valor actual, `http://localhost:8000`, solo funciona cuando el navegador corre en el mismo equipo que los contenedores.
>
> En un despliegue de servidor debe reemplazarse por la dirección con la que los usuarios alcanzan el servidor, por ejemplo `http://10.x.x.x:8000` o `https://dgnna.mimp.gob.pe/api`. Si no se cambia, **la interfaz cargará pero ninguna operación funcionará** y el navegador reportará errores de conexión.
>
> Esta variable se incrusta durante la compilación de la imagen del frontend, por lo que un cambio exige **reconstruir** el contenedor (`docker compose up -d --build frontend`), no solo reiniciarlo.

### 8.3. Plantilla del archivo `.env`

Crear el archivo en la raíz del proyecto con el siguiente contenido, reemplazando cada marcador:

```dotenv
# ═══════════════════════════════════════════════════════════════
#  Sistema Integral DGNNA — Configuración de entorno
#  ATENCIÓN: este archivo contiene credenciales. NO versionar en Git.
#  Permisos recomendados: chmod 600 .env
# ═══════════════════════════════════════════════════════════════

# ── Seguridad ──────────────────────────────────────────────────
# Generar con: openssl rand -hex 32
SESSION_SECRET=<CLAVE_ALEATORIA_DE_64_CARACTERES>

# ── Conexiones a Oracle ────────────────────────────────────────
# Formato: oracle+oracledb://<usuario>:<clave>@<host>:1521/?service_name=<PDB>
DATABASE_URL_AUTH=oracle+oracledb://auth_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_APELACIONES=oracle+oracledb://apelaciones_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_SUSTRACION=oracle+oracledb://sustracion_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_SALA=oracle+oracledb://sala_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_PROYECTOS_LEY=oracle+oracledb://proyectos_ley_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_TRANSPARENCIA=oracle+oracledb://transparencia_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_POI=oracle+oracledb://poi_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_MAPA=oracle+oracledb://mapa_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_AUDITORIA=oracle+oracledb://auditoria_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_PREVENIR=oracle+oracledb://prevenir_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1
DATABASE_URL_NORMATIVA=oracle+oracledb://normativa_db:<CLAVE>@<HOST_ORACLE>:1521/?service_name=XEPDB1

# ── Asistente normativo con IA (opcional) ──────────────────────
IA_HABILITADA=false
LLM_DEFAULT_PROVIDER=openai
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

> **Advertencia sobre valores por defecto.** El `docker-compose.yml` incluye credenciales de respaldo (`${DATABASE_URL_AUTH:-oracle+oracledb://auth_db:Auth2026@...}`) que se aplican si la variable no está definida. Esas credenciales corresponden al entorno de desarrollo, son públicas por estar versionadas en el repositorio y **no deben usarse en producción bajo ninguna circunstancia**. Definir todas las variables del `.env` es lo que garantiza que no se activen.

> **Caracteres especiales en las contraseñas.** Si una contraseña contiene `@`, `:`, `/`, `?` o `#`, debe codificarse en formato URL dentro de la cadena de conexión (por ejemplo `@` → `%40`). Para evitar incidencias, se recomienda usar contraseñas alfanuméricas.

---

## 9. Preparación de la base de datos Oracle

Esta sección la ejecuta el **DBA de la OGTI**, antes del primer arranque de los contenedores.

### 9.1. Consideración previa

Los microservicios crean automáticamente **sus tablas**, pero **no crean los usuarios ni los esquemas**. Si un esquema no existe, el microservicio correspondiente fallará al arrancar.

### 9.2. Creación de esquemas

Conectarse a la PDB con una cuenta administrativa y ejecutar:

```sql
-- Conectarse a la PDB (ajustar el nombre del servicio si difiere)
ALTER SESSION SET CONTAINER = XEPDB1;

-- ── Tablespace dedicado (recomendado) ────────────────────────
CREATE TABLESPACE TBS_DGNNA
  DATAFILE 'tbs_dgnna01.dbf'
  SIZE 500M AUTOEXTEND ON NEXT 100M MAXSIZE 20G;
```

Repetir el bloque siguiente para cada uno de los once esquemas, sustituyendo `&usuario` y `&clave`:

```sql
CREATE USER auth_db IDENTIFIED BY "<CLAVE_SEGURA>"
  DEFAULT TABLESPACE TBS_DGNNA
  QUOTA UNLIMITED ON TBS_DGNNA;

GRANT CREATE SESSION      TO auth_db;
GRANT CREATE TABLE        TO auth_db;
GRANT CREATE SEQUENCE     TO auth_db;
GRANT CREATE VIEW         TO auth_db;
GRANT CREATE PROCEDURE    TO auth_db;
GRANT CREATE TRIGGER      TO auth_db;
```

Lista completa de usuarios a crear:

| Usuario / esquema | Microservicio que lo consume |
| :--- | :--- |
| `auth_db` | `auth-service` |
| `apelaciones_db` | `apelaciones-service` |
| `sustracion_db` | `sustracion-service` |
| `sala_db` | `sala-service` |
| `proyectos_ley_db` | `proyectosley-service` |
| `transparencia_db` | `transparencia-service` |
| `poi_db` | `poi-service` |
| `mapa_db` | `mapa-service` |
| `auditoria_db` | `auditoria-service` |
| `prevenir_db` | `prevenir-service` |
| `normativa_db` | `normativa-service` |

### 9.3. Verificación de los esquemas

```sql
SELECT username, account_status, default_tablespace
FROM   dba_users
WHERE  username IN (
  'AUTH_DB','APELACIONES_DB','SUSTRACION_DB','SALA_DB',
  'PROYECTOS_LEY_DB','TRANSPARENCIA_DB','POI_DB','MAPA_DB',
  'AUDITORIA_DB','PREVENIR_DB','NORMATIVA_DB'
)
ORDER BY username;
```

**Resultado esperado:** once filas, todas con `ACCOUNT_STATUS = OPEN`.

### 9.4. Política de expiración de contraseñas

Por defecto, el perfil `DEFAULT` de Oracle expira las contraseñas a los 180 días, lo que dejaría el sistema fuera de servicio sin previo aviso. Se recomienda asignar a estas cuentas un perfil de servicio sin expiración automática, o incorporar la rotación de estas claves al procedimiento de mantenimiento programado de la OGTI.

---

## 10. Procedimiento de despliegue

### Paso 1 — Verificar los prerrequisitos del host

```bash
docker --version
docker compose version
df -h /var/lib/docker
free -h
```

**Resultado esperado:** Docker 24.0 o superior, Compose v2, al menos 60 GB libres y 8 GB de RAM.

### Paso 2 — Ubicar el código fuente

```bash
sudo mkdir -p /opt/dgnna
sudo chown "$USER":"$USER" /opt/dgnna
cd /opt/dgnna
```

Copiar el contenido del proyecto en este directorio (mediante `git clone`, `scp` o el medio que disponga la OGTI).

Verificar la estructura:

```bash
ls -1
```

**Resultado esperado:** deben figurar al menos `docker-compose.yml`, `frontend/`, `servicios/` y `normativa/`.

### Paso 3 — Crear el archivo `.env`

```bash
cd /opt/dgnna
nano .env          # pegar la plantilla de la sección 8.3 y completar los valores
chmod 600 .env
```

Generar la clave de sesión:

```bash
openssl rand -hex 32
```

Confirmar que el archivo no quedará versionado:

```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

### Paso 4 — Ajustar `NEXT_PUBLIC_BACKEND_URL`

Editar el `docker-compose.yml` y reemplazar, en el servicio `frontend`:

```yaml
      - NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

por la dirección real del servidor, por ejemplo:

```yaml
      - NEXT_PUBLIC_BACKEND_URL=http://10.20.30.40:8000
```

### Paso 5 — Verificar la conectividad hacia Oracle

Antes de construir nada, confirmar que el servidor alcanza la base de datos:

```bash
nc -zv <HOST_ORACLE> 1521
```

**Resultado esperado:** `succeeded` o `Connection to <HOST_ORACLE> 1521 port [tcp/*] succeeded!`

Si el comando `nc` no está disponible:

```bash
timeout 5 bash -c "cat < /dev/null > /dev/tcp/<HOST_ORACLE>/1521" && echo "Conectividad OK" || echo "FALLO de conectividad"
```

> **Nota sobre `host.docker.internal`.** El `docker-compose.yml` incluye `extra_hosts: ["host.docker.internal:host-gateway"]` en cada microservicio, lo que permite alcanzar una base de datos instalada en el **mismo** servidor. Si Oracle reside en un servidor distinto —el escenario habitual en OGTI—, basta con indicar el nombre o la IP real en las cadenas `DATABASE_URL`; la directiva `extra_hosts` puede permanecer sin efecto adverso.

### Paso 6 — Construir las imágenes

```bash
cd /opt/dgnna
docker compose build
```

**Duración estimada:** entre 10 y 25 minutos en la primera ejecución, según el ancho de banda. La etapa más lenta es `npm install` seguida de `npm run build` en el frontend.

**Resultado esperado:** la salida finaliza sin errores y las 13 imágenes quedan registradas:

```bash
docker images | grep dgnna
```

### Paso 7 — Levantar el ecosistema

```bash
docker compose up -d
```

### Paso 8 — Confirmar el estado de los contenedores

```bash
docker compose ps
```

**Resultado esperado:** trece filas con estado `Up`. Ningún contenedor debe aparecer como `Restarting` o `Exited`.

Esperar entre 30 y 60 segundos antes de la verificación funcional: cada microservicio necesita ese margen para conectar con Oracle y crear sus tablas.

### Paso 9 — Revisar los registros de arranque

```bash
docker compose logs --tail 40 auth-service
```

**Resultado esperado:** la línea de arranque de Uvicorn (`Application startup complete`) sin trazas de error de conexión.

Para revisar todos los servicios a la vez:

```bash
docker compose logs --tail 15 | grep -iE "error|traceback|refused|ORA-"
```

**Resultado esperado:** salida vacía.

### Paso 10 — Ejecutar la verificación post-despliegue

Continuar con la sección 11.

---

## 11. Verificación post-despliegue

### 11.1. Salud del ecosistema

```bash
curl -s http://localhost:8000/health
```

**Resultado esperado:** un objeto JSON en el que `gateway` sea `"ok"` y **los once microservicios** figuren como `"ok"`:

```json
{
  "gateway": "ok",
  "servicios": {
    "auth": "ok",
    "apelaciones": "ok",
    "sustracion": "ok",
    "sala": "ok",
    "proyectos-ley": "ok",
    "transparencia": "ok",
    "poi-pp117": "ok",
    "mapa": "ok",
    "auditoria": "ok",
    "prevenir-proteger": "ok",
    "normativa": "ok"
  }
}
```

Un servicio marcado como `"caído"` o `"error"` indica que ese contenedor no arrancó o no logró conectar con su esquema Oracle. Revisar sus logs con `docker compose logs <servicio>`.

### 11.2. Verificación individual de cada microservicio

```bash
for p in 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8011; do
  printf "Puerto %s: " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:$p/health"
done
```

**Resultado esperado:** once respuestas `200`.

### 11.3. Verificación del frontend

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

**Resultado esperado:** `200`.

### 11.4. Verificación de la persistencia en Oracle

Confirmar que cada microservicio creó sus tablas. Conectado como DBA:

```sql
SELECT owner, COUNT(*) AS tablas
FROM   dba_tables
WHERE  owner IN (
  'AUTH_DB','APELACIONES_DB','SUSTRACION_DB','SALA_DB',
  'PROYECTOS_LEY_DB','TRANSPARENCIA_DB','POI_DB','MAPA_DB',
  'AUDITORIA_DB','PREVENIR_DB','NORMATIVA_DB'
)
GROUP BY owner
ORDER BY owner;
```

**Resultado esperado:** once filas, cada una con al menos una tabla.

### 11.5. Prueba funcional de autenticación

```bash
curl -s -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"<USUARIO_ADMIN>","password":"<CLAVE>"}'
```

**Resultado esperado:** respuesta HTTP 200 con un token JWT.

Comprobar que el token es aceptado en una ruta protegida:

```bash
TOKEN="<pegar el token obtenido>"
curl -s -o /dev/null -w "%{http_code}\n" \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/usuarios
```

**Resultado esperado:** `200`. Un `401` indica que `SESSION_SECRET` difiere entre el Gateway y el servicio de autenticación.

### 11.6. Verificación desde el navegador

Desde una estación de la red institucional:

| Comprobación | URL | Resultado esperado |
| :--- | :--- | :--- |
| Aplicación principal | `http://<IP_SERVIDOR>:3000` | Carga la pantalla de inicio de sesión. |
| Inicio de sesión | `http://<IP_SERVIDOR>:3000` | Ingresa al panel principal sin errores en la consola del navegador. |
| Módulo de auditoría | `http://<IP_SERVIDOR>:3000/auditoria` | Muestra el registro de actividades. |
| Módulo normativo | `http://<IP_SERVIDOR>:3000/normativa` | Devuelve resultados en una búsqueda de prueba. |
| Documentación de la API | `http://<IP_SERVIDOR>:8000/docs` | Muestra la interfaz Swagger del Gateway. |

> Si la interfaz carga pero las operaciones fallan con errores de red en la consola del navegador, la causa casi siempre es `NEXT_PUBLIC_BACKEND_URL` (ver sección 8.2).

### 11.7. Acta de verificación

| # | Verificación | Resultado esperado | Conforme | Observación |
| :-: | :--- | :--- | :---: | :--- |
| 1 | 13 contenedores en estado `Up` | `docker compose ps` sin fallos | ☐ | |
| 2 | `/health` del Gateway | 11 servicios en `ok` | ☐ | |
| 3 | Health individual de cada microservicio | 11 respuestas `200` | ☐ | |
| 4 | Frontend responde | HTTP `200` en :3000 | ☐ | |
| 5 | Tablas creadas en los 11 esquemas | 11 esquemas con tablas | ☐ | |
| 6 | Inicio de sesión con usuario administrador | Token JWT emitido | ☐ | |
| 7 | Ruta protegida acepta el token | HTTP `200` | ☐ | |
| 8 | Acceso desde estación de la red | Panel principal operativo | ☐ | |
| 9 | Módulo de auditoría registra eventos | Aparece un registro nuevo | ☐ | |
| 10 | Módulo normativo devuelve resultados | Búsqueda con coincidencias | ☐ | |

---

## 12. Migración de datos desde el monolito

> Esta sección aplica **únicamente** si se migra desde la versión monolítica previa del sistema (esquema `SYSTEM`). En una instalación nueva debe omitirse.

El repositorio incluye el script `servicios/migrar_a_microservicios.py`, que traslada los datos del esquema `SYSTEM` a los esquemas `AUTH_DB`, `APELACIONES_DB`, `SUSTRACION_DB` y `SALA_DB`.

### 12.1. Consideraciones antes de ejecutarlo

1. El script **borra** el contenido de las tablas destino antes de insertar (`DELETE FROM ...`). Ejecutarlo sobre una base con datos productivos causa pérdida de información.
2. Las credenciales de conexión están **codificadas dentro del script**, apuntando a `localhost:1521/XEPDB1`. Deben ajustarse a los valores reales antes de ejecutarlo.
3. Debe ejecutarse **después** del primer arranque de los contenedores, para que las tablas destino ya existan.

### 12.2. Procedimiento

```bash
# 1. Respaldar la base de datos completa antes de continuar (sección 16)

# 2. Ajustar las credenciales del script
cd /opt/dgnna/servicios
nano migrar_a_microservicios.py    # bloque de conexiones SRC / AUTH / APEL / SUST / SALA

# 3. Ejecutar dentro de un contenedor efímero con el driver disponible
docker run --rm -it \
  -v /opt/dgnna/servicios:/work \
  -w /work \
  python:3.11-slim \
  sh -c "pip install --no-cache-dir oracledb && python migrar_a_microservicios.py"
```

**Resultado esperado:** el script imprime los conteos por tabla y finaliza con `✓ Migración completada.`

### 12.3. Después de migrar

```bash
docker compose restart
```

Repetir la verificación de la sección 11.

---

## 13. Operación y mantenimiento

Todos los comandos se ejecutan desde `/opt/dgnna`.

### 13.1. Comandos de ciclo de vida

| Acción | Comando |
| :--- | :--- |
| Levantar todo el ecosistema | `docker compose up -d` |
| Ver el estado de los contenedores | `docker compose ps` |
| Detener sin eliminar contenedores | `docker compose stop` |
| Reanudar contenedores detenidos | `docker compose start` |
| Detener y eliminar contenedores | `docker compose down` |
| Reiniciar todo | `docker compose restart` |
| Reiniciar un servicio | `docker compose restart <servicio>` |
| Reconstruir y reiniciar un servicio | `docker compose up -d --build <servicio>` |
| Consumo de recursos en vivo | `docker stats` |

> `docker compose down` **no** borra datos: toda la información reside en Oracle, fuera de los contenedores. No obstante, nunca debe usarse la opción `-v`, que sí eliminaría volúmenes.

### 13.2. Consulta de registros

| Acción | Comando |
| :--- | :--- |
| Logs en vivo de un servicio | `docker compose logs -f <servicio>` |
| Últimas 100 líneas de un servicio | `docker compose logs --tail 100 <servicio>` |
| Logs de todos los servicios | `docker compose logs --tail 50` |
| Filtrar errores en todo el sistema | `docker compose logs --tail 200 \| grep -iE "error\|ORA-\|traceback"` |
| Logs desde una hora determinada | `docker compose logs --since 2026-01-15T08:00:00 <servicio>` |

### 13.3. Rotación de logs

Docker no rota los registros por defecto, lo que puede llenar el disco del servidor. Configurar la rotación en `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

Aplicar el cambio:

```bash
sudo systemctl restart docker
cd /opt/dgnna && docker compose up -d
```

### 13.4. Arranque automático con el servidor

Los servicios están declarados con `restart: unless-stopped`, por lo que Docker los levanta automáticamente cuando el demonio arranca. Basta con habilitar Docker en el inicio del sistema:

```bash
sudo systemctl enable docker
```

### 13.5. Mantenimiento periódico sugerido

| Frecuencia | Tarea |
| :--- | :--- |
| Diaria | Verificar `/health` del Gateway y revisar el espacio en disco. |
| Semanal | Revisar los logs en busca de errores recurrentes; validar que el respaldo de Oracle se ejecutó. |
| Mensual | `docker image prune -f` para liberar imágenes huérfanas; revisar el crecimiento de los esquemas. |
| Semestral | Rotar `SESSION_SECRET` y las contraseñas de los esquemas; actualizar las imágenes base por parches de seguridad. |

---

## 14. Actualización de versión

```bash
cd /opt/dgnna

# 1. Registrar la versión actual para poder revertir
git rev-parse HEAD > /opt/dgnna/version_anterior.txt

# 2. Respaldar la base de datos (sección 16)

# 3. Obtener la nueva versión del código
git pull origin main          # o el método de distribución que use la OGTI

# 4. Reconstruir las imágenes
docker compose build

# 5. Aplicar el despliegue
docker compose up -d

# 6. Verificar
curl -s http://localhost:8000/health
```

**Ventana de indisponibilidad estimada:** de 1 a 3 minutos durante el paso 5. La compilación del paso 4 no interrumpe el servicio, ya que los contenedores en ejecución siguen atendiendo hasta que se reemplazan.

Para actualizar un solo módulo sin afectar al resto:

```bash
docker compose up -d --build <servicio>
```

---

## 15. Rollback

### 15.1. Rollback de aplicación

```bash
cd /opt/dgnna

# 1. Volver a la versión anterior del código
git checkout $(cat /opt/dgnna/version_anterior.txt)

# 2. Reconstruir y desplegar
docker compose build
docker compose up -d

# 3. Verificar
curl -s http://localhost:8000/health
```

**Tiempo estimado:** de 10 a 25 minutos, dominado por la reconstrucción de las imágenes.

### 15.2. Rollback rápido mediante etiquetado de imágenes

Para reducir el tiempo de reversión, se recomienda etiquetar las imágenes antes de cada actualización:

```bash
# Antes de actualizar: etiquetar la versión en producción
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^dgnna'); do
  docker tag "$img" "${img%:*}:respaldo"
done
```

Con las imágenes etiquetadas, revertir consiste en reetiquetar `:respaldo` como `:latest` y ejecutar `docker compose up -d`, sin necesidad de reconstruir.

### 15.3. Rollback de base de datos

Si la nueva versión introdujo cambios de estructura incompatibles, se requiere restaurar el respaldo de Oracle (sección 16.2) **antes** de levantar la versión anterior de la aplicación. Esta operación la ejecuta el DBA de la OGTI.

---

## 16. Respaldo y restauración

### 16.1. Elementos a respaldar

| Elemento | Ubicación | Frecuencia | Responsable |
| :--- | :--- | :--- | :--- |
| Esquemas Oracle (11) | Servidor de base de datos | Diaria | DBA — OGTI |
| Archivo `.env` | `/opt/dgnna/.env` | Ante cada cambio | Administrador de plataforma |
| `docker-compose.yml` modificado | `/opt/dgnna/docker-compose.yml` | Ante cada cambio | Administrador de plataforma |
| Corpus normativo | `/opt/dgnna/normativa/` | Ante cada cambio | Administrador de plataforma |
| Código fuente | Repositorio Git institucional | Continua | DGNNA |

> El archivo `.env` contiene credenciales: su respaldo debe almacenarse cifrado y con acceso restringido.

### 16.2. Respaldo de la base de datos

```bash
# Ejecutar en el servidor Oracle, como usuario oracle
expdp system/<clave>@XEPDB1 \
  schemas=AUTH_DB,APELACIONES_DB,SUSTRACION_DB,SALA_DB,PROYECTOS_LEY_DB,TRANSPARENCIA_DB,POI_DB,MAPA_DB,AUDITORIA_DB,PREVENIR_DB,NORMATIVA_DB \
  directory=DATA_PUMP_DIR \
  dumpfile=dgnna_$(date +%Y%m%d).dmp \
  logfile=dgnna_$(date +%Y%m%d).log
```

### 16.3. Restauración de la base de datos

```bash
impdp system/<clave>@XEPDB1 \
  schemas=AUTH_DB,APELACIONES_DB,SUSTRACION_DB,SALA_DB,PROYECTOS_LEY_DB,TRANSPARENCIA_DB,POI_DB,MAPA_DB,AUDITORIA_DB,PREVENIR_DB,NORMATIVA_DB \
  directory=DATA_PUMP_DIR \
  dumpfile=dgnna_<AAAAMMDD>.dmp \
  logfile=impdp_dgnna_<AAAAMMDD>.log \
  table_exists_action=replace
```

Detener los contenedores antes de restaurar y volver a levantarlos después:

```bash
cd /opt/dgnna && docker compose stop     # antes
cd /opt/dgnna && docker compose start    # después
```

### 16.4. Respaldo de la configuración

```bash
sudo tar czf /respaldo/dgnna_config_$(date +%Y%m%d).tar.gz \
  -C /opt/dgnna .env docker-compose.yml normativa/
sudo chmod 600 /respaldo/dgnna_config_$(date +%Y%m%d).tar.gz
```

---

## 17. Consideraciones de seguridad

Esta sección consigna las observaciones de seguridad detectadas en la configuración actual del repositorio, junto con la acción correctiva requerida antes de la puesta en producción. Se incluyen de forma explícita para que la OGTI las evalúe y disponga las medidas que correspondan.

### 17.1. Credenciales por defecto en el `docker-compose.yml`

**Situación.** El archivo `docker-compose.yml` incluye credenciales de respaldo en línea, por ejemplo `oracle+oracledb://auth_db:Auth2026@...` y `SESSION_SECRET=dgnna-sistema-dgnna-secret-2026`. Al estar versionadas, esas credenciales son conocidas por cualquiera con acceso al repositorio.

**Acción requerida.**
1. Definir todas las variables en el archivo `.env`, de modo que los valores por defecto nunca se apliquen.
2. Establecer contraseñas distintas para los once esquemas Oracle en el momento de crearlos.
3. Generar un `SESSION_SECRET` aleatorio propio del entorno de producción.
4. Evaluar la eliminación de los valores por defecto del `docker-compose.yml`, de modo que una variable ausente provoque un fallo visible en lugar de un arranque con credenciales conocidas.

### 17.2. Archivos `.env` versionados

**Situación.** Existen archivos `.env` con valores reales dentro del árbol del repositorio (`backend/.env`, `servicios/api-gateway/.env`, `servicios/servicio-normativa/.env`, entre otros), y el `.gitignore` actual no los excluye.

**Acción requerida.**
1. Añadir `.env` y `**/.env` al `.gitignore`.
2. Retirar esos archivos del control de versiones (`git rm --cached`).
3. Considerar comprometidas todas las credenciales que hayan estado versionadas y **rotarlas**, tanto en Oracle como en las claves de API de los proveedores LLM.
4. Depurar el historial del repositorio si este va a compartirse fuera del equipo.

### 17.3. Puertos de microservicios expuestos

**Situación.** El `docker-compose.yml` publica los puertos 8001 a 8011 en el host. Los microservicios no validan el token JWT por sí mismos: esa validación la realiza el Gateway. En consecuencia, cualquier equipo con acceso de red a esos puertos podría invocar los microservicios directamente, evadiendo la autenticación.

**Acción requerida.** Una de las dos opciones:

- **Opción A (recomendada).** Eliminar la sección `ports:` de los once microservicios en el `docker-compose.yml`. Seguirán siendo alcanzables por el Gateway a través de la red `dgnna-net`, y dejarán de estarlo desde fuera del servidor.
- **Opción B.** Publicarlos únicamente en la interfaz de bucle local, cambiando `"8001:8001"` por `"127.0.0.1:8001:8001"` en cada servicio.

### 17.4. Política de CORS permisiva

**Situación.** El Gateway y los microservicios están configurados con `allow_origin_regex=r"^https?://.*"` junto con `allow_credentials=True`, lo que acepta peticiones autenticadas desde cualquier origen.

**Acción requerida.** Restringir el origen permitido al dominio institucional desde el que se sirve el frontend, por ejemplo `allow_origins=["https://dgnna.mimp.gob.pe"]`.

### 17.5. Documentación de la API accesible sin autenticación

**Situación.** Las rutas `/docs` y `/openapi.json` figuran entre las rutas públicas del Gateway, por lo que la especificación completa de la API es consultable sin credenciales.

**Acción requerida.** Deshabilitar la documentación interactiva en producción, o protegerla tras autenticación.

### 17.6. Ausencia de cifrado en tránsito

**Situación.** El sistema se sirve por HTTP en los puertos 3000 y 8000. Las credenciales de inicio de sesión y los tokens JWT viajan sin cifrar por la red.

**Acción requerida.** Publicar el sistema detrás de un proxy inverso (Nginx, Apache o el estándar de la OGTI) con certificado TLS institucional, redirigiendo el tráfico HTTP a HTTPS. Ver el anexo 19.2 para una configuración de referencia.

### 17.7. Contenedores ejecutándose como `root`

**Situación.** Ninguno de los `Dockerfile` declara una instrucción `USER`, por lo que los procesos corren como `root` dentro del contenedor.

**Acción requerida.** Considerar la creación de un usuario sin privilegios en cada imagen. Es una mejora de defensa en profundidad, de prioridad menor frente a los puntos anteriores.

### 17.8. Resumen de acciones previas a la producción

| # | Acción | Prioridad | Responsable |
| :-: | :--- | :---: | :--- |
| 1 | Rotar todas las credenciales versionadas | **Alta** | DGNNA / OGTI |
| 2 | Definir el `.env` completo con valores propios de producción | **Alta** | OGTI |
| 3 | Retirar la publicación de los puertos 8001-8011 | **Alta** | OGTI |
| 4 | Habilitar HTTPS mediante proxy inverso | **Alta** | OGTI |
| 5 | Excluir los archivos `.env` del control de versiones | **Alta** | DGNNA |
| 6 | Restringir la política de CORS | Media | DGNNA |
| 7 | Proteger o deshabilitar `/docs` en producción | Media | DGNNA |
| 8 | Ejecutar los contenedores con usuario sin privilegios | Baja | DGNNA |

---

## 18. Solución de problemas

### 18.1. Tabla de diagnóstico

| Síntoma | Causa probable | Acción correctiva |
| :--- | :--- | :--- |
| Un contenedor queda en `Restarting` | El microservicio no logra conectar con su esquema Oracle. | `docker compose logs <servicio>`; verificar la `DATABASE_URL` correspondiente y que el usuario exista y esté `OPEN`. |
| `ORA-01017: invalid username/password` | Credencial incorrecta o contraseña expirada. | Verificar la clave en el `.env`; comprobar `ACCOUNT_STATUS` en `dba_users`. |
| `ORA-12541: TNS:no listener` | El listener de Oracle no responde o el host es incorrecto. | Comprobar con `nc -zv <HOST_ORACLE> 1521`; validar el nombre de host en la cadena de conexión. |
| `ORA-12514: service name not known` | El `service_name` de la cadena no coincide con la PDB. | Confirmar con `lsnrctl services` en el servidor Oracle y ajustar `?service_name=`. |
| `/health` reporta un servicio como `caído` | El contenedor no está en ejecución o no responde. | `docker compose ps`; `docker compose restart <servicio>`. |
| El frontend carga pero ninguna acción funciona | `NEXT_PUBLIC_BACKEND_URL` apunta a `localhost`. | Corregir la variable y **reconstruir**: `docker compose up -d --build frontend`. |
| Error 401 en todas las rutas protegidas | `SESSION_SECRET` distinto entre el Gateway y el servicio de autenticación. | Verificar que la variable esté definida una sola vez en el `.env` y reiniciar todo el ecosistema. |
| Error 503 "Servicio no disponible" | El Gateway no alcanza al microservicio destino. | Confirmar que el contenedor está `Up` y que ambos comparten la red `dgnna-net`. |
| Error 504 en operaciones largas | El microservicio superó los 30 segundos de espera del Gateway. | Revisar el rendimiento de la consulta Oracle involucrada; considerar índices. |
| `port is already allocated` al levantar | Otro proceso ocupa el puerto en el host. | `sudo ss -tlnp \| grep <puerto>`; liberar el puerto o reasignar en el `docker-compose.yml`. |
| El módulo normativo responde pero sin datos reales | El servicio recurrió a su respaldo local en SQLite al fallar la conexión a Oracle. | Revisar `docker compose logs normativa-service`, buscar la línea "Usando fallback SQLite" y corregir `DATABASE_URL_NORMATIVA`. |
| El asistente de IA no responde | `IA_HABILITADA=false`, clave de API ausente o sin salida a internet. | Verificar las variables de IA y la conectividad hacia el proveedor. |
| El disco del servidor se llena | Logs de Docker sin rotación e imágenes huérfanas. | Aplicar la sección 13.3; ejecutar `docker system prune -f`. |
| La compilación falla en `npm install` | Sin acceso a `registry.npmjs.org`. | Configurar proxy o repositorio espejo; alternativamente, usar imágenes preconstruidas (anexo 19.3). |

### 18.2. Comandos de diagnóstico

```bash
# Estado consolidado
docker compose ps

# Inspeccionar por qué se detuvo un contenedor
docker inspect <contenedor> --format '{{.State.Status}} — {{.State.Error}}'

# Verificar la red interna
docker network inspect dgnna_dgnna-net

# Probar la resolución DNS interna entre contenedores
docker compose exec gateway sh -c "getent hosts auth-service"

# Verificar las variables de entorno efectivas de un contenedor
docker compose exec auth-service env | grep -E "PORT|DATABASE_URL" | sed -E 's#//[^:]+:[^@]+@#//<usuario>:<oculto>@#'

# Probar la conectividad a Oracle desde dentro de un contenedor
docker compose exec auth-service python -c "
import os
from sqlalchemy import create_engine, text
e = create_engine(os.environ['DATABASE_URL'])
with e.connect() as c:
    print('Conexión correcta:', c.execute(text('SELECT 1 FROM DUAL')).scalar())
"

# Uso de recursos
docker stats --no-stream
```

### 18.3. Escalamiento

| Naturaleza del incidente | Responsable |
| :--- | :--- |
| Contenedores, red del host, recursos del servidor | Administración de plataforma — OGTI |
| Errores `ORA-`, rendimiento de consultas, respaldos | DBA — OGTI |
| Publicación del servicio, certificados, firewall | Redes y seguridad — OGTI |
| Comportamiento funcional de un módulo, errores de aplicación | DGNNA |

---

## 19. Anexos

### Anexo 19.1 — Resumen de puertos

| Puerto | Servicio | Exposición requerida |
| :---: | :--- | :--- |
| 3000 | Frontend | Red institucional |
| 8000 | API Gateway | Red institucional |
| 8001 | auth-service | Solo interna |
| 8002 | apelaciones-service | Solo interna |
| 8003 | sustracion-service | Solo interna |
| 8004 | sala-service | Solo interna |
| 8005 | proyectosley-service | Solo interna |
| 8006 | transparencia-service | Solo interna |
| 8007 | poi-service | Solo interna |
| 8008 | mapa-service | Solo interna |
| 8009 | auditoria-service | Solo interna |
| 8010 | prevenir-service | Solo interna |
| 8011 | normativa-service | Solo interna |
| 1521 | Oracle Listener | Solo desde el servidor de aplicaciones |

### Anexo 19.2 — Configuración de referencia para proxy inverso con TLS

Configuración Nginx de ejemplo, a adaptar por el equipo de la OGTI:

```nginx
server {
    listen 80;
    server_name dgnna.mimp.gob.pe;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dgnna.mimp.gob.pe;

    ssl_certificate     /etc/ssl/certs/mimp.crt;
    ssl_certificate_key /etc/ssl/private/mimp.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Interfaz web
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Con esta configuración, `NEXT_PUBLIC_BACKEND_URL` debe establecerse en `https://dgnna.mimp.gob.pe` y el frontend debe reconstruirse.

### Anexo 19.3 — Despliegue en servidor sin acceso a internet

En un equipo con acceso a internet y la misma arquitectura de procesador:

```bash
# 1. Construir las imágenes
cd /ruta/al/proyecto
docker compose build

# 2. Exportarlas a un archivo
docker save $(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^dgnna') \
  -o dgnna_imagenes.tar

# 3. Transferir dgnna_imagenes.tar y el proyecto completo al servidor destino
```

En el servidor destino:

```bash
# 4. Importar las imágenes
docker load -i dgnna_imagenes.tar

# 5. Levantar sin reconstruir
cd /opt/dgnna
docker compose up -d --no-build
```

### Anexo 19.4 — Lista de verificación del despliegue

**Antes del despliegue**

- ☐ Servidor aprovisionado con los recursos mínimos de la sección 7.1
- ☐ Docker Engine y Compose v2 instalados y operativos
- ☐ Los 11 esquemas Oracle creados y verificados
- ☐ Conectividad confirmada entre el servidor de aplicaciones y Oracle en el puerto 1521
- ☐ Reglas de firewall solicitadas y aplicadas
- ☐ Archivo `.env` creado, completo y con permisos `600`
- ☐ `SESSION_SECRET` generado aleatoriamente para este entorno
- ☐ `NEXT_PUBLIC_BACKEND_URL` ajustado a la dirección real del servidor
- ☐ Respaldo previo de la base de datos realizado (si aplica)

**Durante el despliegue**

- ☐ `docker compose build` finalizado sin errores
- ☐ `docker compose up -d` ejecutado
- ☐ 13 contenedores en estado `Up`
- ☐ Logs de arranque sin errores de conexión

**Después del despliegue**

- ☐ Acta de verificación de la sección 11.7 completa y conforme
- ☐ Rotación de logs configurada
- ☐ Docker habilitado en el arranque del servidor
- ☐ Respaldo de la configuración almacenado de forma segura
- ☐ Acciones de seguridad de la sección 17.8 atendidas o formalmente aceptadas
- ☐ Documento de conformidad suscrito por DGNNA y OGTI

### Anexo 19.5 — Información pendiente de definir por la OGTI

Los siguientes valores no pueden determinarse desde el código fuente y deben ser provistos por la OGTI para completar la configuración:

| # | Dato | Requerido para |
| :-: | :--- | :--- |
| 1 | Nombre o IP del servidor de aplicaciones | `NEXT_PUBLIC_BACKEND_URL`, publicación del servicio |
| 2 | Nombre o IP del servidor Oracle | Las once cadenas `DATABASE_URL` |
| 3 | Nombre del servicio de la PDB, si difiere de `XEPDB1` | Las once cadenas `DATABASE_URL` |
| 4 | Contraseñas de los once esquemas | Archivo `.env` |
| 5 | Nombre de dominio institucional y certificado TLS | Configuración del proxy inverso |
| 6 | Ruta de respaldo y política de retención | Procedimiento de respaldo |
| 7 | Estándar de proxy inverso de la institución | Anexo 19.2 |
| 8 | Política de rotación de credenciales | Sección 13.5 |
| 9 | Cuentas de usuario administrador inicial del sistema | Verificación 11.5 |
| 10 | Decisión sobre la habilitación del asistente de IA y las claves correspondientes | Variables de IA |

---

*Fin del documento.*
