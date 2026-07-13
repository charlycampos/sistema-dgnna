-- Schema MAPA_DB — Microservicio Mapa Interactivo
-- Ejecutar sentencia por sentencia como SYSTEM
-- (Las tablas las crea automáticamente el servicio al iniciar; solo se
--  necesita crear el usuario.)

-- PASO 1
CREATE USER mapa_db IDENTIFIED BY Mapa2026;

-- PASO 2
GRANT DBA TO mapa_db;

-- VERIFICAR (después de iniciar el servicio por primera vez)
SELECT table_name FROM all_tables WHERE owner = 'MAPA_DB' ORDER BY 1;
