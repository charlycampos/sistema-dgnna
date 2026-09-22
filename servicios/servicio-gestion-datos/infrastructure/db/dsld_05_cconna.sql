-- =============================================================================
-- DSLD · Paso 5 · Esquema Oracle para CCONNA
-- Esquema: GESTION_DATOS_DB  (XEPDB1)
-- Requiere: dsld_01_demuna_supervision.sql (usa DSLD_CARGAS)
-- Origen: "CCONNA nominal <mes><año>.xlsx"
--         hoja "BD ORGANIZACIONAL" (tabla Tabla1) y hoja "BD NOMINAL" (tabla Tabla5)
--
-- Datos personales:
--   * DSLD_CCONNA no tiene columnas para el especialista encargado (nombre, teléfono, correo).
--   * Las niñas, niños y adolescentes NO se guardan fila por fila: DSLD_CCONNA_INTEGRANTES
--     guarda solo CUÁNTAS personas hay por ubigeo, nivel, sexo y condición.
--
-- El script NO borra datos: la tabla anterior DSLD_CCONNA (v1) se renombra a DSLD_CCONNA_V1.
-- =============================================================================

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE gestion_datos_db.dsld_cconna RENAME TO dsld_cconna_v1';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

-- -----------------------------------------------------------------------------
-- 1. CCONNA conformados (una fila por consejo)
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_cconna (
    ubigeo             VARCHAR2(6)    PRIMARY KEY,  -- distrital: distrito; provincial: XXYY00; regional: XX0000 (26 = GORE Lima)
    nivel              VARCHAR2(12)   NOT NULL,     -- DISTRITAL / PROVINCIAL / REGIONAL
    nombre             VARCHAR2(200)  NOT NULL,     -- Nombre del CCONNA
    ccdd               VARCHAR2(2)    NOT NULL,
    ubigeo_prov        VARCHAR2(4),
    departamento       VARCHAR2(100),
    provincia          VARCHAR2(100),
    distrito           VARCHAR2(100),
    departamento_mod   VARCHAR2(100),
    numero_orden       NUMBER,
    numero_ordenanza   VARCHAR2(100),
    fecha_ordenanza    DATE,
    numero_resolucion  VARCHAR2(100),
    fecha_resolucion   DATE,
    fecha_acta         DATE,
    fecha_plan         DATE,
    anio_conformacion  NUMBER(4),
    base_nominal       VARCHAR2(50),                -- REGISTRA NNA / NO REGISTRAN NNA
    registro_mimp      VARCHAR2(10),                -- SI / NO / OBSERVADO
    oficio_dsld        VARCHAR2(100),
    fecha_registro     DATE,
    carga_id           NUMBER         NOT NULL,
    CONSTRAINT ck_dsld_cconna_nivel CHECK (nivel IN ('DISTRITAL', 'PROVINCIAL', 'REGIONAL')),
    CONSTRAINT ck_dsld_cconna_reg   CHECK (registro_mimp IS NULL OR registro_mimp IN ('SI', 'NO', 'OBSERVADO')),
    CONSTRAINT fk_dsld_cconna_carga FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);
CREATE INDEX gestion_datos_db.ix_dsld_cconna_geo   ON gestion_datos_db.dsld_cconna (departamento_mod, provincia);
CREATE INDEX gestion_datos_db.ix_dsld_cconna_nivel ON gestion_datos_db.dsld_cconna (nivel);

-- -----------------------------------------------------------------------------
-- 2. Integrantes NNA: solo conteos (nunca una fila por persona)
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_cconna_integrantes (
    id                 NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nivel              VARCHAR2(12)   NOT NULL,     -- DISTRITAL / PROVINCIAL / REGIONAL / NACIONAL
    ubigeo             VARCHAR2(6),
    ccdd               VARCHAR2(2),
    ubigeo_prov        VARCHAR2(4),
    departamento       VARCHAR2(100),
    provincia          VARCHAR2(100),
    distrito           VARCHAR2(100),
    departamento_mod   VARCHAR2(100),
    sexo               CHAR(1),                     -- H / M (vacío si el Excel no lo indica)
    condicion          VARCHAR2(12)   NOT NULL,     -- INTEGRANTE / EX CCONNA
    cantidad           NUMBER         NOT NULL,
    carga_id           NUMBER         NOT NULL,
    CONSTRAINT ck_dsld_cconna_int_nivel CHECK (nivel IN ('DISTRITAL', 'PROVINCIAL', 'REGIONAL', 'NACIONAL')),
    CONSTRAINT ck_dsld_cconna_int_sexo  CHECK (sexo IS NULL OR sexo IN ('H', 'M')),
    CONSTRAINT ck_dsld_cconna_int_cond  CHECK (condicion IN ('INTEGRANTE', 'EX CCONNA')),
    CONSTRAINT fk_dsld_cconna_int_carga FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);
CREATE INDEX gestion_datos_db.ix_dsld_cconna_int ON gestion_datos_db.dsld_cconna_integrantes (nivel, condicion, departamento_mod);

-- -----------------------------------------------------------------------------
-- 3. Vista de resumen por departamento analítico
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_cconna_departamento AS
SELECT departamento_mod,
       COUNT(*)                                                        AS cconna,
       SUM(CASE WHEN nivel = 'DISTRITAL'  THEN 1 ELSE 0 END)           AS distritales,
       SUM(CASE WHEN nivel = 'PROVINCIAL' THEN 1 ELSE 0 END)           AS provinciales,
       SUM(CASE WHEN nivel = 'REGIONAL'   THEN 1 ELSE 0 END)           AS regionales,
       SUM(CASE WHEN registro_mimp = 'SI' THEN 1 ELSE 0 END)           AS registrados_mimp
FROM   gestion_datos_db.dsld_cconna
GROUP  BY departamento_mod;

-- -----------------------------------------------------------------------------
-- 4. Validación (archivo "CCONNA nominal jul2026.xlsx"):
--      1,063 CCONNA: 890 distritales · 147 provinciales · 26 regionales
--      188 con registro MIMP = SI
--      6,048 integrantes NNA activos (3,216 mujeres y 2,832 hombres) y 1,155 ex integrantes
-- -----------------------------------------------------------------------------
-- SELECT nivel, COUNT(*) FROM gestion_datos_db.dsld_cconna GROUP BY nivel;
-- SELECT sexo, SUM(cantidad) FROM gestion_datos_db.dsld_cconna_integrantes
-- WHERE nivel = 'DISTRITAL' AND condicion = 'INTEGRANTE' GROUP BY sexo;
