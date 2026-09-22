-- =============================================================================
-- DSLD · Paso 2 · Esquema Oracle para "Ponte en Modo Niñez"
-- Esquema: GESTION_DATOS_DB  (XEPDB1)
-- Requiere: dsld_01_demuna_supervision.sql (usa DSLD_CARGAS)
-- Origen: MATRIZ DE REPORTE PBI 2026.xlsx → tabla de Excel TB_MODO_NINEZ_2026
--
-- Datos personales: la tabla NO tiene columnas para SR/SRA ni ALCALDE/SA.
-- El importador no las lee.
--
-- El script NO borra datos: la tabla anterior DSLD_MODO_NINEZ (v1) se renombra
-- a DSLD_MODO_NINEZ_V1 como respaldo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Respaldo de la tabla anterior (solo si existe)
-- -----------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE gestion_datos_db.dsld_modo_ninez RENAME TO dsld_modo_ninez_v1';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/


-- -----------------------------------------------------------------------------
-- 1. Gobiernos regionales y locales en la estrategia (una fila por gobierno)
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_modo_ninez (
    ubigeo              VARCHAR2(6)    PRIMARY KEY,     -- UBIGEO (provincial = ubigeo del distrito capital)
    nivel_gobierno      VARCHAR2(12)   NOT NULL,        -- TIPO DE GOBIERNO
    nombre_gobierno     VARCHAR2(200)  NOT NULL,        -- NOMBRE DE GOBIERNO (institución, no persona)
    macroregion         VARCHAR2(50),                   -- MACROREGIÓN
    ccdd                VARCHAR2(2)    NOT NULL,        -- 2 primeros dígitos (relación regional)
    ubigeo_prov         VARCHAR2(4),                    -- 4 primeros dígitos (relación provincial)
    departamento        VARCHAR2(100),                  -- nombre del catálogo DSLD_UBIGEO (o del Excel)
    provincia           VARCHAR2(100),
    distrito            VARCHAR2(100),
    departamento_mod    VARCHAR2(100),                  -- LIMA METROPOLITANA / GORE LIMA / resto igual
    adherido            CHAR(1)        NOT NULL,        -- MODO_NIÑEZ: S = SI, N = NO
    anio_adhesion       NUMBER(4),                      -- AÑO QUE SE SUMÓ A LA ESTRATEGIA
    fecha_presentacion  DATE,                           -- FECHA DE PRESENTACIÓN (reporte del año)
    anio_presentacion   NUMBER(4),                      -- YEAR(fecha_presentacion)
    fecha_acta          DATE,                           -- FECHA DE ACTA DE COMPROMISO
    codigo_demuna       VARCHAR2(10),                   -- CÓDIGO DE DEMUNA (sin FK: puede no estar en el padrón)
    estado_demuna       VARCHAR2(20),                   -- ESTADO: ACREDITADA / NO ACREDITADA / NO OPERATIVA
    numero_orden        NUMBER,                         -- Nº de la matriz
    carga_id            NUMBER         NOT NULL,
    CONSTRAINT ck_dsld_mn_nivel    CHECK (nivel_gobierno IN ('REGIONAL', 'PROVINCIAL', 'DISTRITAL')),
    CONSTRAINT ck_dsld_mn_adherido CHECK (adherido IN ('S', 'N')),
    CONSTRAINT ck_dsld_mn_estado   CHECK (estado_demuna IS NULL OR estado_demuna IN ('ACREDITADA', 'NO ACREDITADA', 'NO OPERATIVA')),
    CONSTRAINT fk_dsld_mn_carga    FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);
CREATE INDEX gestion_datos_db.ix_dsld_mn_depto ON gestion_datos_db.dsld_modo_ninez (departamento_mod, provincia);
CREATE INDEX gestion_datos_db.ix_dsld_mn_nivel ON gestion_datos_db.dsld_modo_ninez (nivel_gobierno, adherido);


-- -----------------------------------------------------------------------------
-- 2. Vista de resumen por departamento analítico (equivale a Acumulado_* y
--    Registro_presentacion_* del Power BI)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_modo_ninez_departamento AS
SELECT departamento_mod,
       COUNT(*)                                                                        AS adheridos,
       SUM(CASE WHEN nivel_gobierno = 'REGIONAL'   THEN 1 ELSE 0 END)                  AS regionales,
       SUM(CASE WHEN nivel_gobierno = 'PROVINCIAL' THEN 1 ELSE 0 END)                  AS provinciales,
       SUM(CASE WHEN nivel_gobierno = 'DISTRITAL'  THEN 1 ELSE 0 END)                  AS distritales,
       SUM(CASE WHEN fecha_presentacion IS NOT NULL THEN 1 ELSE 0 END)                 AS presentaron_reporte
FROM   gestion_datos_db.dsld_modo_ninez
WHERE  adherido = 'S'
GROUP  BY departamento_mod;


-- -----------------------------------------------------------------------------
-- 3. Consultas de validación (después de la primera carga)
--    Valores esperados con MATRIZ DE REPORTE PBI 2026.xlsx (hoja MATRIZ INTERNA 28.02):
--      546 gobiernos · 545 adheridos (15 regionales, 136 provinciales, 394 distritales)
--      presentaron reporte: 71 (4 regionales, 10 provinciales, 57 distritales)
--      por año de adhesión: 2019=51 2020=33 2021=62 2022=42 2023=121 2024=105 2025=71 2026=45 (15 sin año)
-- -----------------------------------------------------------------------------
-- SELECT nivel_gobierno, COUNT(*) adheridos,
--        SUM(CASE WHEN fecha_presentacion IS NOT NULL THEN 1 ELSE 0 END) presentaron
-- FROM gestion_datos_db.dsld_modo_ninez WHERE adherido = 'S'
-- GROUP BY nivel_gobierno;
--
-- SELECT anio_adhesion, COUNT(*) FROM gestion_datos_db.dsld_modo_ninez
-- WHERE adherido = 'S' GROUP BY anio_adhesion ORDER BY anio_adhesion;
