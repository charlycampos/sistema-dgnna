-- =============================================================================
-- Esquema GESTION_DATOS_DB — Microservicio de Gestión de Datos y Suite DSLD
-- Ejecutar como SYSTEM o SYS en XEPDB1.
--
-- Este script crea el usuario, sus privilegios y el catálogo general de datasets.
-- Las tablas de la Suite Analítica DSLD se crean con los scripts numerados, en
-- este orden (conectado como GESTION_DATOS_DB):
--   dsld_01_demuna_supervision.sql   padrón DEMUNA, supervisiones, ubigeo,
--                                    población, catálogos y registro de cargas
--   dsld_02_modo_ninez.sql           Ponte en Modo Niñez
--   dsld_03_pias.sql                 atenciones PIAS
--   dsld_04_capacitacion.sql         capacitación + parámetros del servicio
--   dsld_05_cconna.sql               CCONNA y conteos de integrantes
-- Cada uno se ejecuta UNA sola vez: renombra la tabla anterior del eje a *_V1.
--
-- El servicio también crea sus tablas al arrancar (Base.metadata.create_all),
-- pero sin índices, restricciones ni vistas; por eso conviene ejecutar los
-- scripts anteriores. Ver la sección 9.4 del MANUAL_DESPLIEGUE.md.
-- =============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- -----------------------------------------------------------------------------
-- PASO 1: Usuario
-- -----------------------------------------------------------------------------
CREATE USER gestion_datos_db IDENTIFIED BY "<CLAVE_SEGURA>"
  DEFAULT TABLESPACE TBS_DGNNA
  QUOTA UNLIMITED ON TBS_DGNNA;
-- En una instalación sin tablespace dedicado, reemplazar las dos últimas líneas por:
--   DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;

-- -----------------------------------------------------------------------------
-- PASO 2: Privilegios mínimos
-- NO usar GRANT DBA: le daría acceso a los esquemas de los demás microservicios.
-- Si el usuario ya existe con DBA, ejecutar dsld_00_permisos_minimos.sql.
-- -----------------------------------------------------------------------------
GRANT CREATE SESSION   TO gestion_datos_db;
GRANT CREATE TABLE     TO gestion_datos_db;
GRANT CREATE SEQUENCE  TO gestion_datos_db;
GRANT CREATE VIEW      TO gestion_datos_db;

-- -----------------------------------------------------------------------------
-- PASO 3: Catálogo general de datasets (módulo Gestión de Datos)
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.datasets (
    id VARCHAR2(36) PRIMARY KEY,
    codigo VARCHAR2(50) NOT NULL UNIQUE,
    nombre VARCHAR2(250) NOT NULL,
    descripcion VARCHAR2(1000),
    direccion_linea VARCHAR2(50) NOT NULL,
    tipo_fuente VARCHAR2(50) DEFAULT 'Sistema Interno',
    frecuencia_act VARCHAR2(50) DEFAULT 'Mensual',
    formato_salida VARCHAR2(50) DEFAULT 'Excel',
    responsable VARCHAR2(200),
    estado VARCHAR2(20) DEFAULT 'activo',
    creado_por VARCHAR2(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gestion_datos_db.diccionario_campos (
    id VARCHAR2(36) PRIMARY KEY,
    dataset_id VARCHAR2(36) NOT NULL,
    nombre_campo VARCHAR2(100) NOT NULL,
    tipo_dato VARCHAR2(50) NOT NULL,
    longitud_max NUMBER,
    es_obligatorio NUMBER DEFAULT 0,
    descripcion VARCHAR2(500),
    ejemplo VARCHAR2(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dataset_campo FOREIGN KEY (dataset_id) REFERENCES gestion_datos_db.datasets(id) ON DELETE CASCADE
);

COMMIT;

-- =============================================================================
-- NOTA SOBRE LA VERSIÓN ANTERIOR (hasta el 16/09/2026)
-- Este script creaba también las tablas DSLD_DEMUNAS, DSLD_SUPERVISIONES,
-- DSLD_CAPACITACIONES, DSLD_CCONNA, DSLD_MODO_NINEZ y DSLD_PIAS con una
-- estructura provisional (fechas como texto, conteos precalculados y sin
-- trazabilidad de cargas). Esas definiciones fueron reemplazadas por los
-- scripts dsld_01 a dsld_05, que reproducen las reglas del Power BI y no
-- almacenan datos personales. En las instalaciones existentes, las tablas
-- antiguas quedan como respaldo con el sufijo _V1 y pueden eliminarse una vez
-- validadas las cifras nuevas.
-- =============================================================================
