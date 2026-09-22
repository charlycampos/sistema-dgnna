-- =============================================================================
-- DSLD · Eliminación de las tablas de respaldo *_V1
-- Ejecutar como GESTION_DATOS_DB, SOLO cuando la DSLD haya validado las cifras
-- nuevas de las cinco pestañas. La operación no se puede deshacer.
--
-- Antes de ejecutarlo conviene revisar qué contienen:
--   SELECT table_name, num_rows FROM user_tables WHERE table_name LIKE '%_V1';
--   (num_rows se llena tras ANALYZE/estadísticas; si sale vacío, usar COUNT(*))
-- =============================================================================

BEGIN
  FOR t IN (SELECT table_name FROM user_tables WHERE table_name LIKE 'DSLD%_V1') LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS PURGE';
    DBMS_OUTPUT.PUT_LINE('Eliminada: ' || t.table_name);
  END LOOP;
END;
/

-- Verificación: no debe devolver ninguna fila
-- SELECT table_name FROM user_tables WHERE table_name LIKE '%_V1';
