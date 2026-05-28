-- ============================================================
-- Schema AUTH_DB — Microservicio de Autenticación
-- Ejecutar sentencia por sentencia como SYSTEM
-- ============================================================

-- PASO 1: Crear usuario
CREATE USER auth_db IDENTIFIED BY Auth2026;

-- PASO 2: Permisos
GRANT CONNECT, RESOURCE TO auth_db;
GRANT DBA TO auth_db;

-- PASO 3: Tabla usuarios
CREATE TABLE auth_db.usuarios (
    id           VARCHAR2(36)  PRIMARY KEY,
    nombre       VARCHAR2(200) NOT NULL,
    email        VARCHAR2(200) NOT NULL UNIQUE,
    passwordhash VARCHAR2(200) NOT NULL,
    rol          VARCHAR2(20)  DEFAULT 'usuario',
    activo       NUMBER(1)     DEFAULT 1 NOT NULL,
    createdat    TIMESTAMP     DEFAULT SYSTIMESTAMP,
    updatedat    TIMESTAMP     DEFAULT SYSTIMESTAMP
);

-- PASO 4: Tabla usuario_modulos
CREATE TABLE auth_db.usuario_modulos (
    id        VARCHAR2(36) PRIMARY KEY,
    usuarioid VARCHAR2(36) NOT NULL,
    modulo    VARCHAR2(50) NOT NULL,
    rolmodulo VARCHAR2(50) NOT NULL,
    CONSTRAINT fk_um_usuario FOREIGN KEY (usuarioid) REFERENCES auth_db.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_usuario_modulo UNIQUE (usuarioid, modulo)
);

-- VERIFICAR
SELECT table_name FROM all_tables WHERE owner = 'AUTH_DB' ORDER BY 1;
