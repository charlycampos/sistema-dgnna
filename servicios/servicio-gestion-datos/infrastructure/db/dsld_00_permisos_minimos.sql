-- =============================================================================
-- Esquema GESTION_DATOS_DB · Permisos mínimos
-- Ejecutar como SYSTEM o SYS en XEPDB1.
--
-- Reemplaza el GRANT DBA con el que se creó el usuario durante el desarrollo.
-- DBA permite leer y modificar cualquier esquema de la base (auth, apelaciones,
-- normativa…), lo que no necesita este microservicio: solo trabaja en su propio
-- esquema. Este script deja únicamente los privilegios que usa.
--
-- El servicio crea sus tablas al arrancar (Base.metadata.create_all), por eso
-- necesita CREATE TABLE, CREATE SEQUENCE y CREATE VIEW dentro de su esquema.
-- =============================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- 1. Quitar los privilegios excesivos (si el usuario se creó con DBA)
BEGIN
  EXECUTE IMMEDIATE 'REVOKE DBA FROM gestion_datos_db';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1951, -1919) THEN RAISE; END IF;   -- no tenía el rol
END;
/
BEGIN
  EXECUTE IMMEDIATE 'REVOKE RESOURCE FROM gestion_datos_db';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1951, -1919) THEN RAISE; END IF;
END;
/

-- 2. Privilegios necesarios
GRANT CREATE SESSION   TO gestion_datos_db;
GRANT CREATE TABLE     TO gestion_datos_db;
GRANT CREATE SEQUENCE  TO gestion_datos_db;
GRANT CREATE VIEW      TO gestion_datos_db;

-- 3. Cuota en el tablespace (sin ella, CREATE TABLE falla con ORA-01950)
--    Ajustar el nombre del tablespace si en el servidor de la OGTI es otro.
ALTER USER gestion_datos_db QUOTA UNLIMITED ON TBS_DGNNA;
-- En una instalación sin tablespace dedicado:
-- ALTER USER gestion_datos_db QUOTA UNLIMITED ON USERS;

-- =============================================================================
-- 4. Verificación
-- =============================================================================
-- Debe devolver solo CREATE SESSION, CREATE TABLE, CREATE SEQUENCE y CREATE VIEW:
-- SELECT privilege FROM dba_sys_privs WHERE grantee = 'GESTION_DATOS_DB' ORDER BY privilege;
--
-- No debe devolver ninguna fila:
-- SELECT granted_role FROM dba_role_privs
-- WHERE grantee = 'GESTION_DATOS_DB' AND granted_role IN ('DBA', 'RESOURCE');
--
-- Después de ejecutarlo, reiniciar el servicio y comprobar que el tablero sigue
-- mostrando datos:  docker compose restart gestion-datos-service
-- =============================================================================
