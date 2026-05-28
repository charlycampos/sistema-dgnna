-- ============================================================
-- PASO 1: Crear usuario (ejecutar como SYSTEM)
-- ============================================================
CREATE USER apelaciones_db IDENTIFIED BY Apelaciones2026;

-- ============================================================
-- PASO 2: Permisos (ejecutar como SYSTEM)
-- ============================================================
GRANT CONNECT, RESOURCE, CREATE SESSION TO apelaciones_db;
ALTER USER apelaciones_db QUOTA UNLIMITED ON USERS;

-- ============================================================
-- PASO 3: Tabla abogados
-- ============================================================
CREATE TABLE apelaciones_db.abogados (
    id        VARCHAR2(36)  PRIMARY KEY,
    nombre    VARCHAR2(200) NOT NULL,
    activo    NUMBER(1)     DEFAULT 1 NOT NULL,
    createdat TIMESTAMP     DEFAULT SYSTIMESTAMP,
    updatedat TIMESTAMP     DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- PASO 4: Tabla complejidades_juridicas
-- ============================================================
CREATE TABLE apelaciones_db.complejidades_juridicas (
    id     VARCHAR2(36)  PRIMARY KEY,
    nombre VARCHAR2(100) NOT NULL,
    puntos NUMBER(5)     NOT NULL,
    activo NUMBER(1)     DEFAULT 1 NOT NULL
);

-- ============================================================
-- PASO 5: Tabla extension_rangos
-- ============================================================
CREATE TABLE apelaciones_db.extension_rangos (
    id          VARCHAR2(36)  PRIMARY KEY,
    descripcion VARCHAR2(100) NOT NULL,
    minfolios   NUMBER(10)    NOT NULL,
    maxfolios   NUMBER(10),
    puntos      NUMBER(5)     NOT NULL,
    activo      NUMBER(1)     DEFAULT 1 NOT NULL
);

-- ============================================================
-- PASO 6: Tabla apelaciones
-- ============================================================
CREATE TABLE apelaciones_db.apelaciones (
    id                VARCHAR2(36)   PRIMARY KEY,
    numeroexpediente  VARCHAR2(100)  NOT NULL,
    fechaingreso      TIMESTAMP      NOT NULL,
    fechaingresoMIMP  TIMESTAMP,
    plazovencimiento  TIMESTAMP,
    apelante          VARCHAR2(300)  NOT NULL,
    nnacar            VARCHAR2(300),
    procedencia       VARCHAR2(200)  NOT NULL,
    documento         VARCHAR2(300)  NOT NULL,
    asunto            VARCHAR2(500)  NOT NULL,
    folios            NUMBER(10)     NOT NULL,
    puntosextension   NUMBER(5)      NOT NULL,
    complejidadid     VARCHAR2(36)   NOT NULL,
    puntoscomplejidad NUMBER(5)      NOT NULL,
    puntostotal       NUMBER(5)      NOT NULL,
    abogadoid         VARCHAR2(36)   NOT NULL,
    fechaasignacion   TIMESTAMP      NOT NULL,
    estado            VARCHAR2(20)   DEFAULT 'Pendiente',
    numeroresolucion  VARCHAR2(200),
    documentoatencion VARCHAR2(200),
    cargos            VARCHAR2(200),
    observaciones     VARCHAR2(1000),
    createdat         TIMESTAMP      DEFAULT SYSTIMESTAMP,
    updatedat         TIMESTAMP      DEFAULT SYSTIMESTAMP,
    CONSTRAINT fk_ap_abogado     FOREIGN KEY (abogadoid)     REFERENCES apelaciones_db.abogados(id),
    CONSTRAINT fk_ap_complejidad FOREIGN KEY (complejidadid) REFERENCES apelaciones_db.complejidades_juridicas(id)
);

-- ============================================================
-- VERIFICAR: debe mostrar 4 tablas
-- ============================================================
SELECT table_name FROM all_tables WHERE owner = 'APELACIONES_DB' ORDER BY 1;
