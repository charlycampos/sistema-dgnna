-- Ejecutar como SYSTEM antes de iniciar el microservicio por primera vez.
CREATE USER prevenir_db IDENTIFIED BY Prevenir2026;

GRANT CONNECT, RESOURCE, CREATE SESSION TO prevenir_db;
ALTER USER prevenir_db QUOTA UNLIMITED ON USERS;

-- Al iniciar el servicio, SQLAlchemy crea la tabla ACTIVIDADES_PREVENIR.
SELECT table_name FROM all_tables WHERE owner = 'PREVENIR_DB' ORDER BY 1;
