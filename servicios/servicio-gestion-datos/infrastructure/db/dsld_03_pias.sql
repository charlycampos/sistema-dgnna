-- =============================================================================
-- DSLD · Paso 3 · Esquema Oracle para PIAS (Plataformas Itinerantes de Acción Social)
-- Esquema: GESTION_DATOS_DB  (XEPDB1)
-- Requiere: dsld_01_demuna_supervision.sql (usa DSLD_CARGAS)
-- Origen: PIAS_PBI_AUTORIDADES_PADRES.xlsx → tablas de Excel
--         TB_PIAS_AUTORIDADES, TB_PIAS_PADRES y TB_PIAS_NNA
--
-- Una fila por persona atendida, SIN datos personales: no hay columnas para
-- nombres, apellidos, documento, fecha de nacimiento, edad, teléfono, cargo ni
-- institución. Solo se guarda el sexo (H/M), aprobado por la DSLD.
--
-- El script NO borra datos: la tabla anterior DSLD_PIAS (v1) se renombra a
-- DSLD_PIAS_V1 como respaldo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Respaldo de la tabla anterior (solo si existe)
-- -----------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE gestion_datos_db.dsld_pias RENAME TO dsld_pias_v1';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/


-- -----------------------------------------------------------------------------
-- 1. Atenciones PIAS
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_pias_atenciones (
    id                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_persona      VARCHAR2(20)   NOT NULL,   -- AUTORIDAD / PADRE DE FAMILIA / NNA (tabla de origen)
    fecha_atencion    DATE           NOT NULL,   -- FEC_EPE (NNA: FEC_INI_ACT_FOR)
    anio              NUMBER(4)      NOT NULL,
    mes               NUMBER(2),                 -- PERIODO (mes del reporte); si falta, mes de la fecha
    ubigeo            VARCHAR2(6)    NOT NULL,   -- distrito
    departamento      VARCHAR2(100),             -- nombres del catálogo DSLD_UBIGEO (o del Excel)
    provincia         VARCHAR2(100),
    distrito          VARCHAR2(100),
    departamento_mod  VARCHAR2(100),
    centro_poblado    VARCHAR2(150),             -- CCPP_CA (comunidad)
    area_residencia   VARCHAR2(10),              -- RURAL / URBANA
    cuenca            VARCHAR2(150)  NOT NULL,   -- NOM_CA (plataforma / cuenca)
    modalidad         VARCHAR2(12),              -- PRESENCIAL / REMOTO / MIXTO
    sexo              CHAR(1),                   -- H / M
    num_sesiones      NUMBER(3),                 -- Num_ses
    carga_id          NUMBER         NOT NULL,
    CONSTRAINT ck_dsld_pias_tipo CHECK (tipo_persona IN ('AUTORIDAD', 'PADRE DE FAMILIA', 'NNA')),
    CONSTRAINT ck_dsld_pias_sexo CHECK (sexo IS NULL OR sexo IN ('H', 'M')),
    CONSTRAINT ck_dsld_pias_mod  CHECK (modalidad IS NULL OR modalidad IN ('PRESENCIAL', 'REMOTO', 'MIXTO')),
    CONSTRAINT fk_dsld_pias_carga FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);
CREATE INDEX gestion_datos_db.ix_dsld_pias_geo   ON gestion_datos_db.dsld_pias_atenciones (departamento_mod, provincia);
CREATE INDEX gestion_datos_db.ix_dsld_pias_tipo  ON gestion_datos_db.dsld_pias_atenciones (tipo_persona, anio, mes);
CREATE INDEX gestion_datos_db.ix_dsld_pias_ubi   ON gestion_datos_db.dsld_pias_atenciones (ubigeo);


-- -----------------------------------------------------------------------------
-- 2. Vista de resumen por cuenca (equivale a MEDIDADS_PIAS del Power BI)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_pias_cuenca AS
SELECT cuenca,
       anio,
       COUNT(*)                                                        AS atenciones,
       SUM(CASE WHEN tipo_persona = 'NNA'              THEN 1 ELSE 0 END) AS nna,
       SUM(CASE WHEN tipo_persona = 'PADRE DE FAMILIA' THEN 1 ELSE 0 END) AS padres,
       SUM(CASE WHEN tipo_persona = 'AUTORIDAD'        THEN 1 ELSE 0 END) AS autoridades,
       SUM(CASE WHEN sexo = 'M' THEN 1 ELSE 0 END)                     AS mujeres,
       SUM(CASE WHEN sexo = 'H' THEN 1 ELSE 0 END)                     AS hombres,
       COUNT(DISTINCT ubigeo || centro_poblado)                        AS comunidades,
       MAX(fecha_atencion)                                             AS ultima_fecha
FROM   gestion_datos_db.dsld_pias_atenciones
GROUP  BY cuenca, anio;


-- -----------------------------------------------------------------------------
-- 3. Consultas de validación (después de la primera carga)
--    Valores esperados con PIAS_PBI_AUTORIDADES_PADRES.xlsx (corte 24/07/2026):
--      17,402 atenciones · NNA 10,544 · padres 5,674 · autoridades 1,184
--      mujeres 9,184 · hombres 8,218 · última actualización 24/07/2026
-- -----------------------------------------------------------------------------
-- SELECT tipo_persona, COUNT(*) FROM gestion_datos_db.dsld_pias_atenciones GROUP BY tipo_persona;
-- SELECT MAX(fecha_atencion) FROM gestion_datos_db.dsld_pias_atenciones;
