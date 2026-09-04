-- Migración idempotente para instalaciones Oracle existentes.
-- Ejecutar conectado como APELACIONES_DB o con permisos sobre el esquema.
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM all_tab_columns
     WHERE owner = 'APELACIONES_DB' AND table_name = 'APELACIONES'
       AND column_name = 'RESULTADORESOLUCION';
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE APELACIONES_DB.APELACIONES ADD (RESULTADORESOLUCION VARCHAR2(40))';
    END IF;

    SELECT COUNT(*) INTO v_count FROM all_tab_columns
     WHERE owner = 'APELACIONES_DB' AND table_name = 'APELACIONES'
       AND column_name = 'FECHARESOLUCION';
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE APELACIONES_DB.APELACIONES ADD (FECHARESOLUCION TIMESTAMP)';
    END IF;

    SELECT COUNT(*) INTO v_count FROM all_constraints
     WHERE owner = 'APELACIONES_DB' AND table_name = 'APELACIONES'
       AND constraint_name = 'CK_AP_RESULTADO_RESOLUCION';
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            ALTER TABLE APELACIONES_DB.APELACIONES
            ADD CONSTRAINT CK_AP_RESULTADO_RESOLUCION CHECK (
                RESULTADORESOLUCION IS NULL OR RESULTADORESOLUCION IN (
                    'FUNDADO', 'FUNDADO_EN_PARTE', 'INFUNDADO', 'IMPROCEDENTE',
                    'CARECE_DE_OBJETO', 'NULIDAD', 'REMISION_ORGANO_COMPETENTE'
                )
            )
        ]';
    END IF;
END;
/
