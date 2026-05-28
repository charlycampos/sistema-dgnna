-- Schema SALA_DB — Microservicio de Sala de Reuniones
-- Ejecutar sentencia por sentencia como SYSTEM

-- PASO 1
CREATE USER sala_db IDENTIFIED BY Sala2026;

-- PASO 2
GRANT DBA TO sala_db;

-- PASO 3
CREATE TABLE sala_db.reservas_sala (
    id          VARCHAR2(36)  PRIMARY KEY,
    fecha       VARCHAR2(10)  NOT NULL,
    titulo      VARCHAR2(200) NOT NULL,
    horainicio  VARCHAR2(5)   NOT NULL,
    horafin     VARCHAR2(5)   NOT NULL,
    categoria   VARCHAR2(100) NOT NULL,
    estado      VARCHAR2(20)  DEFAULT 'Programado',
    descripcion VARCHAR2(500),
    creadopor   VARCHAR2(200),
    createdat   TIMESTAMP     DEFAULT SYSTIMESTAMP,
    updatedat   TIMESTAMP     DEFAULT SYSTIMESTAMP
);

-- VERIFICAR
SELECT table_name FROM all_tables WHERE owner = 'SALA_DB' ORDER BY 1;
