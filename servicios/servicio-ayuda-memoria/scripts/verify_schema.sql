-- Verificación de solo lectura. Ejecutar autenticado como AYUDA_MEMORIA_DB.
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET PAGESIZE 200 LINESIZE 220 VERIFY OFF

SELECT USER usuario,
       SYS_CONTEXT('USERENV','CURRENT_SCHEMA') esquema,
       SYS_CONTEXT('USERENV','DB_NAME') base,
       SYS_CONTEXT('USERENV','SERVICE_NAME') servicio
  FROM dual;

SELECT table_name
  FROM user_tables
 WHERE table_name LIKE 'AM\_%' ESCAPE '\'
 ORDER BY table_name;

SELECT table_name, column_name, data_type, data_length, nullable
  FROM user_tab_columns
 WHERE table_name LIKE 'AM\_%' ESCAPE '\'
 ORDER BY table_name, column_id;

SELECT constraint_name, table_name, constraint_type, status
  FROM user_constraints
 WHERE table_name LIKE 'AM\_%' ESCAPE '\'
 ORDER BY table_name, constraint_type, constraint_name;

SELECT index_name, table_name, uniqueness
  FROM user_indexes
 WHERE table_name LIKE 'AM\_%' ESCAPE '\'
 ORDER BY table_name, index_name;

SELECT object_name, object_type, status
  FROM user_objects
 WHERE object_name LIKE 'AM\_%' ESCAPE '\'
   AND status <> 'VALID';
