-- Migración idempotente. No rellena históricos: permanecen NULL.
-- Ejecutar conectado como APELACIONES_DB o con permisos sobre el esquema.
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM all_tab_columns
     WHERE owner = 'APELACIONES_DB' AND table_name = 'APELACIONES'
       AND column_name = 'FECHACAMBIORESUELTO';
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE
            'ALTER TABLE APELACIONES_DB.APELACIONES ADD (FECHACAMBIORESUELTO TIMESTAMP)';
    END IF;
END;
/
