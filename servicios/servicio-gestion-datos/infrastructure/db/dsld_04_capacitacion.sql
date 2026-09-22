-- =============================================================================
-- DSLD · Paso 4 · Esquema Oracle para Capacitación a defensores DEMUNA
-- Esquema: GESTION_DATOS_DB  (XEPDB1)
-- Requiere: dsld_01_demuna_supervision.sql (usa DSLD_CARGAS)
-- Origen: CAPACITACION_20214-2026 NOMINAL.xlsx → tabla de Excel TB_CAPA_DEMUNA
--
-- Una fila por participación (persona en un curso), SIN datos personales:
--   * No hay columna para el DNI. En su lugar, PERSONA_ID guarda un código
--     irreversible (HMAC-SHA256) que solo sirve para contar personas distintas.
--     La clave se toma de la variable DSLD_CLAVE_SEUDONIMO si está configurada;
--     si no, el servicio genera una al azar la primera vez y la guarda en
--     DSLD_PARAMETROS, de modo que no hay nada que configurar a mano.
--   * No hay columnas para nombres, teléfono, correo, nota, profesión, función,
--     fecha de ingreso ni observaciones.
--   * Se guarda el sexo (H/M).
-- Si se cambia esa clave hay que volver a importar el Excel.
--
-- El script NO borra datos: la tabla anterior DSLD_CAPACITACIONES (v1) se
-- renombra a DSLD_CAPACITACIONES_V1 como respaldo.
-- =============================================================================

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE gestion_datos_db.dsld_capacitaciones RENAME TO dsld_capacitaciones_v1';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

-- Parámetros internos del servicio (aquí se guarda la clave de seudonimización)
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE gestion_datos_db.dsld_parametros (
      clave          VARCHAR2(50)  PRIMARY KEY,
      valor          VARCHAR2(200) NOT NULL,
      fecha_creacion TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;   -- -955: ya existe
END;
/

CREATE TABLE gestion_datos_db.dsld_capacitaciones (
    id                 NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio               NUMBER(4)      NOT NULL,   -- YEAR(FECHA INICIO CURSO) (Año_Capacitacion del Power BI)
    mes                NUMBER(2)      NOT NULL,
    anio_registro      NUMBER(4),                 -- columna AÑO del Excel
    fecha_inicio       DATE           NOT NULL,   -- FECHA INICIO CURSO
    fecha_fin          DATE,                      -- FECHA CULMINA CURSO
    codigo_demuna      VARCHAR2(10),              -- CÓDIGO (sin FK: puede no estar en el padrón)
    ubigeo             VARCHAR2(6),               -- ubigeo de la DEMUNA (padrón DNA.mdb)
    ccdd               VARCHAR2(2),               -- departamento (también para filas sin ubigeo)
    departamento       VARCHAR2(100),
    provincia          VARCHAR2(100),
    distrito           VARCHAR2(100),
    departamento_mod   VARCHAR2(100),
    curso              VARCHAR2(250),
    siglas_curso       VARCHAR2(20),
    sede               VARCHAR2(100),
    tipo_capacitacion  VARCHAR2(12),              -- VIRTUAL / PRESENCIAL / MIXTA
    tipo_asistente     VARCHAR2(30),              -- DEMUNA, DEPANA, MIMP, ...
    estado             VARCHAR2(20)   NOT NULL,   -- APROBADO / DESAPROBADO / BAJA / ...
    persona_id         CHAR(64),                  -- seudónimo del DNI (vacío si no hay DNI)
    sexo               CHAR(1),                   -- H / M
    carga_id           NUMBER         NOT NULL,
    CONSTRAINT ck_dsld_capa_tipo CHECK (tipo_capacitacion IS NULL OR tipo_capacitacion IN ('VIRTUAL', 'PRESENCIAL', 'MIXTA')),
    CONSTRAINT ck_dsld_capa_sexo CHECK (sexo IS NULL OR sexo IN ('H', 'M')),
    CONSTRAINT fk_dsld_capa_carga FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);
CREATE INDEX gestion_datos_db.ix_dsld_capa_estado ON gestion_datos_db.dsld_capacitaciones (estado, anio, mes);
CREATE INDEX gestion_datos_db.ix_dsld_capa_geo    ON gestion_datos_db.dsld_capacitaciones (departamento_mod, provincia);
CREATE INDEX gestion_datos_db.ix_dsld_capa_demuna ON gestion_datos_db.dsld_capacitaciones (codigo_demuna);
CREATE INDEX gestion_datos_db.ix_dsld_capa_pers   ON gestion_datos_db.dsld_capacitaciones (persona_id);

-- Resumen por departamento y año (solo aprobados, como el Power BI)
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_capacitacion_departamento AS
SELECT departamento_mod,
       anio,
       COUNT(*)                                                         AS participaciones,
       COUNT(persona_id)                                                AS personas,          -- COUNT(DNI) del Power BI
       COUNT(DISTINCT persona_id)                                       AS personas_distintas,
       SUM(CASE WHEN tipo_capacitacion = 'VIRTUAL'    THEN 1 ELSE 0 END) AS virtual,
       SUM(CASE WHEN tipo_capacitacion = 'PRESENCIAL' THEN 1 ELSE 0 END) AS presencial,
       COUNT(DISTINCT codigo_demuna)                                    AS demunas,
       MAX(fecha_inicio)                                                AS ultima_fecha
FROM   gestion_datos_db.dsld_capacitaciones
WHERE  estado = 'APROBADO'
GROUP  BY departamento_mod, anio;

-- -----------------------------------------------------------------------------
-- Validación (Excel al 22/06/2026; solo APROBADO):
--   participaciones 27,445 (Power BI 27,444: una fila escrita "aprobado" en minúsculas)
--   personas (COUNT DNI) 25,341 · personas distintas 12,803
--   virtual 18,367 · presencial 9,078 · 2024: 4,035 · 2025: 4,067 · 2026: 1,396 (con DNI)
--   distritos 1,849 · provincias 196 · departamentos 25
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*), COUNT(persona_id), COUNT(DISTINCT persona_id)
-- FROM gestion_datos_db.dsld_capacitaciones WHERE estado = 'APROBADO';
