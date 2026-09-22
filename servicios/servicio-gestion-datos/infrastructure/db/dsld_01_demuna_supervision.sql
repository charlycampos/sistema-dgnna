-- =============================================================================
-- DSLD · Paso 1 · Esquema Oracle para DEMUNA y Supervisión
-- Esquema: GESTION_DATOS_DB  (XEPDB1)
-- Fuente de diseño: docs/ANALISIS_POWERBI_DSLD.md y docs/MODELO_DATOS_POWERBI_DSLD.md
-- Origen de datos: DNA.mdb (tablas dna, estadodna, modelodna, supervisadas,
--                  supervisores, ubigeo, "Perú población INEI 2015")
--
-- Ejecutar conectado como GESTION_DATOS_DB (o como SYSTEM, que usa el prefijo).
-- El script NO borra datos: las tablas DSLD_DEMUNAS y DSLD_SUPERVISIONES
-- anteriores se renombran a *_V1 como respaldo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Respaldo de las tablas anteriores (solo si existen)
-- -----------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE gestion_datos_db.dsld_supervisiones RENAME TO dsld_supervisiones_v1';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE gestion_datos_db.dsld_demunas RENAME TO dsld_demunas_v1';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/


-- -----------------------------------------------------------------------------
-- 1. Registro de cargas (trazabilidad de cada importación)
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_cargas (
    id                    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    origen                VARCHAR2(30)   NOT NULL,      -- ACCESS_DNA, CAPACITACION, CCONNA, PIAS, MODO_NINEZ
    archivo               VARCHAR2(500)  NOT NULL,      -- ruta o nombre del archivo leído
    archivo_hash          VARCHAR2(64),                 -- SHA-256 del archivo
    archivo_fecha         TIMESTAMP,                    -- fecha de modificación del archivo
    usuario               VARCHAR2(100),
    fecha_inicio          TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    fecha_fin             TIMESTAMP,
    estado                VARCHAR2(20)   DEFAULT 'EN_PROCESO' NOT NULL,
    registros_leidos      NUMBER         DEFAULT 0,
    registros_cargados    NUMBER         DEFAULT 0,
    registros_rechazados  NUMBER         DEFAULT 0,
    detalle               VARCHAR2(4000),               -- resumen por tabla / errores
    CONSTRAINT ck_dsld_cargas_estado CHECK (estado IN ('EN_PROCESO','EXITOSA','FALLIDA'))
);
CREATE INDEX gestion_datos_db.ix_dsld_cargas_origen ON gestion_datos_db.dsld_cargas (origen, fecha_inicio);


-- -----------------------------------------------------------------------------
-- 2. Catálogo geográfico (reemplaza TB_DISTRITO / TB_PROVINCIA / TB_DEPARTAMENTO)
--    Origen: DNA.mdb → tabla ubigeo  (25 dptos, 196 prov, 1,899 distritos)
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_ubigeo (
    ubigeo            VARCHAR2(6)   PRIMARY KEY,        -- 150101 / 150100 / 150000
    nivel             VARCHAR2(12)  NOT NULL,           -- DEPARTAMENTO / PROVINCIA / DISTRITO
    ccdd              VARCHAR2(2)   NOT NULL,           -- código de departamento (INEI)
    ccpp              VARCHAR2(2),                      -- código de provincia
    ccdi              VARCHAR2(2),                      -- código de distrito
    ubigeo_prov       VARCHAR2(4),                      -- CCDD||CCPP
    nombre            VARCHAR2(100) NOT NULL,           -- nombre propio del nivel
    departamento      VARCHAR2(100) NOT NULL,
    provincia         VARCHAR2(100),
    distrito          VARCHAR2(100),
    departamento_mod  VARCHAR2(100) NOT NULL,           -- LIMA METROPOLITANA / GORE LIMA / resto
    ccdd_analitico    VARCHAR2(2)   NOT NULL,           -- GORE LIMA = '26'
    carga_id          NUMBER,
    CONSTRAINT ck_dsld_ubigeo_nivel CHECK (nivel IN ('DEPARTAMENTO','PROVINCIA','DISTRITO')),
    CONSTRAINT fk_dsld_ubigeo_carga FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);
CREATE INDEX gestion_datos_db.ix_dsld_ubigeo_prov ON gestion_datos_db.dsld_ubigeo (ubigeo_prov);
CREATE INDEX gestion_datos_db.ix_dsld_ubigeo_dmod ON gestion_datos_db.dsld_ubigeo (departamento_mod);


-- -----------------------------------------------------------------------------
-- 3. Población por distrito
--    Origen: DNA.mdb → "Perú población INEI 2015" (UBIGEO, Total Nacional, Menor_17)
--    Equivale a DNA_POBLACION del Power BI (columna POBLACION_NNA = Menor_17).
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_poblacion (
    ubigeo            VARCHAR2(6)   PRIMARY KEY,
    poblacion_total   NUMBER,
    poblacion_nna     NUMBER,                           -- menores de 18 años
    fuente            VARCHAR2(100) DEFAULT 'INEI (DNA.mdb)',
    carga_id          NUMBER,
    CONSTRAINT fk_dsld_pob_ubigeo FOREIGN KEY (ubigeo)   REFERENCES gestion_datos_db.dsld_ubigeo(ubigeo),
    CONSTRAINT fk_dsld_pob_carga  FOREIGN KEY (carga_id) REFERENCES gestion_datos_db.dsld_cargas(id)
);


-- -----------------------------------------------------------------------------
-- 4. Catálogos del Access
-- -----------------------------------------------------------------------------
-- 4.1 Estados (estadodna): a=No operativa, b=Acreditada, c=No acreditada,
--     1/7/9 = estados de registro, etc.
CREATE TABLE gestion_datos_db.dsld_cat_estado (
    codigo            VARCHAR2(1)   PRIMARY KEY,
    estado            VARCHAR2(60)  NOT NULL,           -- en MAYÚSCULAS, como en el Power BI
    grupo_tablero     VARCHAR2(20)                      -- ACREDITADA / NO ACREDITADA / NO OPERATIVA (solo a, b, c)
);

-- 4.2 Modelos de defensoría (modelodna): 01 Provincial, 02 Distrital, ...
CREATE TABLE gestion_datos_db.dsld_cat_modelo (
    codigo            VARCHAR2(2)   PRIMARY KEY,
    modelo            VARCHAR2(120) NOT NULL,
    siglas            VARCHAR2(30)  NOT NULL,           -- = TIPO_GOBIERNO del Power BI
    es_demuna         NUMBER(1)     DEFAULT 0 NOT NULL  -- 1 solo para 01 y 02
);

-- 4.3 Supervisores (supervisores). Solo id y nombre; el DNI no se importa.
CREATE TABLE gestion_datos_db.dsld_cat_supervisor (
    id                NUMBER        PRIMARY KEY,
    nombre            VARCHAR2(100) NOT NULL
);


-- -----------------------------------------------------------------------------
-- 5. Padrón de DEMUNA
--    Origen: DNA.mdb → dna, SOLO modelo IN ('01','02')  (equivale a rangoPI2023 <> 9)
--    Resultado esperado con el DNA.mdb actual: 1,892 filas.
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_demunas (
    codigo                   VARCHAR2(5)    PRIMARY KEY,   -- dna.codigo
    nombre                   VARCHAR2(250)  NOT NULL,      -- dna.dna ("Defensoria" → "Defensoría")
    nombre_corto             VARCHAR2(250),                -- "Defensoría Municipal de la Niña, Niño y Adolescente" → "DEMUNA"
    ubigeo                   VARCHAR2(6)    NOT NULL,      -- dna.ubigeo
    departamento             VARCHAR2(100)  NOT NULL,      -- UPPER(dna.dpto)
    provincia                VARCHAR2(100)  NOT NULL,      -- UPPER(dna.prov)
    distrito                 VARCHAR2(100)  NOT NULL,      -- UPPER(dna.dist)
    modelo                   VARCHAR2(2)    NOT NULL,      -- dna.modelo (01/02)
    estado_acreditacion      VARCHAR2(1)    NOT NULL,      -- dna.estado_acreditacion (a/b/c)
    fecha_acreditacion       DATE,                         -- dna.f_acreditacion
    anio_acreditacion        NUMBER(4),                    -- YEAR(f_acreditacion)
    resolucion_acreditacion  VARCHAR2(100),                -- dna."resolución_acreditación"
    estado_registro          VARCHAR2(1),                  -- dna.estado_registro
    fecha_registro           DATE,                         -- dna.f_registro
    resolucion_inscripcion   VARCHAR2(100),                -- dna."resolución_inscripción"
    fecha_inicio             DATE,                         -- dna.f_inicio
    fecha_rof                DATE,                         -- dna.f_rof
    direccion                VARCHAR2(250),
    telefono1                VARCHAR2(20),                 -- dna.fono1
    telefono2                VARCHAR2(20),                 -- dna.fono2
    email                    VARCHAR2(150),
    horario                  VARCHAR2(100),
    defensores_f             NUMBER(5),                    -- dna.def_f
    defensores_m             NUMBER(5),                    -- dna.def_m
    promotores_f             NUMBER(5),                    -- dna.promdef_f
    promotores_m             NUMBER(5),                    -- dna.promdef_m
    otros_f                  NUMBER(5),
    otros_m                  NUMBER(5),
    fecha_ultima_sup_access  DATE,                         -- dna."f_supervisión" (referencial; el tablero usa DSLD_SUPERVISIONES)
    fecha_cconna             DATE,                         -- dna.f_cconna
    fortalecida              VARCHAR2(2),                  -- dna.fortalecida
    pi_2022                  VARCHAR2(1),                  -- dna."PI 2022"
    pi_2025                  VARCHAR2(1),                  -- dna."PI 2025"
    rango_pi_2023            NUMBER(2),                    -- dna.rangoPI2023
    carga_id                 NUMBER         NOT NULL,
    fecha_actualizacion      TIMESTAMP      DEFAULT SYSTIMESTAMP,
    CONSTRAINT uq_dsld_dem_ubigeo  UNIQUE (ubigeo),        -- 1 DEMUNA municipal por ubigeo (verificado en DNA.mdb)
    CONSTRAINT fk_dsld_dem_ubigeo  FOREIGN KEY (ubigeo)              REFERENCES gestion_datos_db.dsld_ubigeo(ubigeo),
    CONSTRAINT fk_dsld_dem_modelo  FOREIGN KEY (modelo)              REFERENCES gestion_datos_db.dsld_cat_modelo(codigo),
    CONSTRAINT fk_dsld_dem_estado  FOREIGN KEY (estado_acreditacion) REFERENCES gestion_datos_db.dsld_cat_estado(codigo),
    CONSTRAINT fk_dsld_dem_estreg  FOREIGN KEY (estado_registro)     REFERENCES gestion_datos_db.dsld_cat_estado(codigo),
    CONSTRAINT fk_dsld_dem_carga   FOREIGN KEY (carga_id)            REFERENCES gestion_datos_db.dsld_cargas(id),
    CONSTRAINT ck_dsld_dem_modelo  CHECK (modelo IN ('01','02')),
    CONSTRAINT ck_dsld_dem_estado  CHECK (estado_acreditacion IN ('a','b','c'))
);
CREATE INDEX gestion_datos_db.ix_dsld_dem_estado ON gestion_datos_db.dsld_demunas (estado_acreditacion);
CREATE INDEX gestion_datos_db.ix_dsld_dem_fecacr ON gestion_datos_db.dsld_demunas (fecha_acreditacion);


-- -----------------------------------------------------------------------------
-- 6. Supervisiones
--    Origen: DNA.mdb → supervisadas, unida a dna por codigo_dna
--    (reproduce la consulta Access "DEMUNA supervisadas": solo modelo 01/02).
--    Resultado esperado: 10,983 filas (2024: 736 · 2025: 806 · 2026: 548).
-- -----------------------------------------------------------------------------
CREATE TABLE gestion_datos_db.dsld_supervisiones (
    id                  NUMBER         PRIMARY KEY,     -- supervisadas.codigo
    codigo_demuna       VARCHAR2(5)    NOT NULL,        -- supervisadas.codigo_dna
    fecha_supervision   DATE           NOT NULL,        -- supervisadas.f_supervision
    anio                NUMBER(4)      NOT NULL,        -- YEAR(f_supervision)
    tipo_supervision    NUMBER(3),                      -- supervisadas."tipo_supervisión": 1 = VIRTUAL, 2 = PRESENCIAL
    supervisor_id       NUMBER,                         -- supervisadas.supervisor
    resumen             VARCHAR2(4000),                 -- supervisadas.resumen
    comentarios         VARCHAR2(4000),                 -- supervisadas.comentarios
    carga_id            NUMBER         NOT NULL,
    CONSTRAINT fk_dsld_sup_demuna FOREIGN KEY (codigo_demuna) REFERENCES gestion_datos_db.dsld_demunas(codigo),
    CONSTRAINT fk_dsld_sup_carga  FOREIGN KEY (carga_id)      REFERENCES gestion_datos_db.dsld_cargas(id)
    -- supervisor_id sin FK: el Access puede tener ids de supervisores dados de baja
);
CREATE INDEX gestion_datos_db.ix_dsld_sup_demuna ON gestion_datos_db.dsld_supervisiones (codigo_demuna, fecha_supervision);
CREATE INDEX gestion_datos_db.ix_dsld_sup_anio   ON gestion_datos_db.dsld_supervisiones (anio);


-- -----------------------------------------------------------------------------
-- 7. Datos fijos de catálogo (los códigos a/b/c los usa el tablero)
--    El importador reemplaza estos catálogos con los del Access en cada carga;
--    esta semilla solo garantiza que existan los grupos del tablero.
-- -----------------------------------------------------------------------------
INSERT INTO gestion_datos_db.dsld_cat_estado (codigo, estado, grupo_tablero) VALUES ('a', 'NO OPERATIVA',  'NO OPERATIVA');
INSERT INTO gestion_datos_db.dsld_cat_estado (codigo, estado, grupo_tablero) VALUES ('b', 'ACREDITADA',    'ACREDITADA');
INSERT INTO gestion_datos_db.dsld_cat_estado (codigo, estado, grupo_tablero) VALUES ('c', 'NO ACREDITADA', 'NO ACREDITADA');
INSERT INTO gestion_datos_db.dsld_cat_modelo (codigo, modelo, siglas, es_demuna)
    VALUES ('01', 'Defensoría del Niño y el Adolescente de Municipalidad Provincial', 'Provincial', 1);
INSERT INTO gestion_datos_db.dsld_cat_modelo (codigo, modelo, siglas, es_demuna)
    VALUES ('02', 'Defensoría del Niño y el Adolescente de Municipalidad Distrital', 'Distrital', 1);
COMMIT;


-- -----------------------------------------------------------------------------
-- 8. Vistas para la API (equivalen a las columnas calculadas y tablas del Power BI)
-- -----------------------------------------------------------------------------

-- 8.1 DEMUNA con todo lo que el tablero necesita (≈ tabla dna del Power BI)
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_demuna AS
WITH ult AS (
    SELECT codigo_demuna, MAX(fecha_supervision) AS ultima_fecha_supervision
    FROM   gestion_datos_db.dsld_supervisiones
    GROUP  BY codigo_demuna
)
SELECT d.codigo,
       d.nombre,
       d.nombre_corto,
       d.ubigeo,
       u.ubigeo_prov,
       u.ccdd                                   AS ubigeo_dep,
       u.departamento_mod,
       u.ccdd_analitico,
       d.departamento, d.provincia, d.distrito,
       d.modelo,
       m.siglas                                 AS tipo_gobierno,        -- Provincial / Distrital
       d.estado_acreditacion                    AS estado_codigo,
       e.estado                                 AS estado,               -- ACREDITADA / NO ACREDITADA / NO OPERATIVA
       CASE WHEN d.estado_acreditacion IN ('b','c') THEN 1 ELSE 0 END AS es_operativa,
       d.fecha_acreditacion,
       d.anio_acreditacion,
       d.resolucion_acreditacion,
       d.direccion, d.telefono1, d.telefono2, d.email, d.horario,
       p.poblacion_nna,
       ult.ultima_fecha_supervision,
       EXTRACT(YEAR FROM ult.ultima_fecha_supervision) AS anio_ultima_supervision,
       CASE WHEN ult.ultima_fecha_supervision IS NULL THEN 'NO SUPERVISADA' ELSE 'SUPERVISADA' END
                                                AS estado_supervision,
       CASE
         WHEN ult.ultima_fecha_supervision IS NULL                                               THEN 'SIN SUPERVISIÓN'
         WHEN EXTRACT(YEAR FROM ult.ultima_fecha_supervision) = EXTRACT(YEAR FROM SYSDATE)       THEN 'SUPERVISADAS ESTE AÑO'
         WHEN EXTRACT(YEAR FROM ult.ultima_fecha_supervision) = EXTRACT(YEAR FROM SYSDATE) - 1   THEN 'SUPERVISADAS EL AÑO ANTERIOR'
         ELSE 'MÁS DE 1 AÑO SIN SUPERVISIÓN'
       END                                      AS estado_supervision_periodo,
       d.carga_id
FROM   gestion_datos_db.dsld_demunas    d
JOIN   gestion_datos_db.dsld_ubigeo     u ON u.ubigeo = d.ubigeo
JOIN   gestion_datos_db.dsld_cat_modelo m ON m.codigo = d.modelo
JOIN   gestion_datos_db.dsld_cat_estado e ON e.codigo = d.estado_acreditacion
LEFT JOIN gestion_datos_db.dsld_poblacion p ON p.ubigeo = d.ubigeo
LEFT JOIN ult ON ult.codigo_demuna = d.codigo;

-- 8.2 Supervisiones con datos de la DEMUNA (≈ DNA_SUPERVISION del Power BI)
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_supervision AS
SELECT s.id,
       s.codigo_demuna,
       d.nombre, d.nombre_corto,
       d.ubigeo, d.ubigeo_prov, d.ubigeo_dep, d.departamento_mod,
       d.departamento, d.provincia, d.distrito,
       d.modelo, d.tipo_gobierno,
       d.estado_codigo, d.estado,
       d.fecha_acreditacion,
       s.fecha_supervision,
       s.anio,
       s.tipo_supervision,
       CASE s.tipo_supervision WHEN 1 THEN 'VIRTUAL' WHEN 2 THEN 'PRESENCIAL' END AS modalidad,
       s.supervisor_id,
       sv.nombre AS supervisor,
       s.resumen
FROM   gestion_datos_db.dsld_supervisiones s
JOIN   gestion_datos_db.vw_dsld_demuna      d  ON d.codigo = s.codigo_demuna
LEFT JOIN gestion_datos_db.dsld_cat_supervisor sv ON sv.id = s.supervisor_id;

-- 8.3 Resumen por departamento analítico (Lima Metropolitana / GORE Lima separados)
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_resumen_departamento AS
SELECT departamento_mod,
       ccdd_analitico,
       COUNT(*)                                                        AS total_municipalidades,
       SUM(CASE WHEN estado_codigo = 'b' THEN 1 ELSE 0 END)             AS acreditadas,
       SUM(CASE WHEN estado_codigo = 'c' THEN 1 ELSE 0 END)             AS no_acreditadas,
       SUM(CASE WHEN estado_codigo = 'a' THEN 1 ELSE 0 END)             AS no_operativas,
       SUM(es_operativa)                                                AS operativas,
       SUM(CASE WHEN tipo_gobierno = 'Provincial' THEN 1 ELSE 0 END)    AS provinciales,
       SUM(CASE WHEN tipo_gobierno = 'Distrital'  THEN 1 ELSE 0 END)    AS distritales,
       SUM(CASE WHEN estado_supervision = 'SUPERVISADA' THEN 1 ELSE 0 END) AS supervisadas,
       SUM(NVL(poblacion_nna, 0))                                       AS poblacion_nna
FROM   gestion_datos_db.vw_dsld_demuna
GROUP  BY departamento_mod, ccdd_analitico;

-- 8.4 Supervisiones por año y departamento (para los comparativos 2024-2026)
CREATE OR REPLACE VIEW gestion_datos_db.vw_dsld_supervision_anio AS
SELECT anio,
       departamento_mod,
       COUNT(*)                        AS supervisiones,
       COUNT(DISTINCT codigo_demuna)   AS demunas_supervisadas,
       SUM(CASE WHEN tipo_supervision = 1 THEN 1 ELSE 0 END) AS virtuales,
       SUM(CASE WHEN tipo_supervision = 2 THEN 1 ELSE 0 END) AS presenciales,
       MAX(fecha_supervision)          AS ultima_fecha
FROM   gestion_datos_db.vw_dsld_supervision
GROUP  BY anio, departamento_mod;


-- -----------------------------------------------------------------------------
-- 9. Consultas de validación (ejecutar después de la primera carga)
--    Valores esperados con el DNA.mdb del 16/09/2026:
--      total 1892 · b 869 · c 853 · a 170 · operativas 1722
--      provinciales 196 · distritales 1696
--      supervisiones 10983 · 2024: 736 · 2025: 806 · 2026: 548
--      DEMUNA con alguna supervisión: 1691
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) total,
--        SUM(CASE WHEN estado_codigo='b' THEN 1 ELSE 0 END) acreditadas,
--        SUM(CASE WHEN estado_codigo='c' THEN 1 ELSE 0 END) no_acreditadas,
--        SUM(CASE WHEN estado_codigo='a' THEN 1 ELSE 0 END) no_operativas,
--        SUM(es_operativa) operativas,
--        SUM(CASE WHEN estado_supervision='SUPERVISADA' THEN 1 ELSE 0 END) supervisadas
-- FROM gestion_datos_db.vw_dsld_demuna;
--
-- SELECT anio, COUNT(*) FROM gestion_datos_db.dsld_supervisiones
-- WHERE anio BETWEEN 2024 AND 2026 GROUP BY anio ORDER BY anio;
