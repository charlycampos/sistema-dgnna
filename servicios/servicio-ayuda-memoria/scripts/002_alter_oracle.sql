-- Ejecutar conectado como AYUDA_MEMORIA_DB, después de 001_schema_oracle.sql.
-- Agrega las columnas del flujo de aprobación, sellado y versionado de documentos,
-- y del ciclo de vida de plantillas, que 001 no contemplaba. Es idempotente: cada
-- ALTER se protege con un bloque que verifica si la columna ya existe.
WHENEVER SQLERROR EXIT SQL.SQLCODE
DECLARE
  v_objetos NUMBER;
BEGIN
  IF USER <> 'AYUDA_MEMORIA_DB' THEN
    RAISE_APPLICATION_ERROR(-20001, 'Debe conectarse como AYUDA_MEMORIA_DB');
  END IF;
END;
/

DECLARE
  PROCEDURE agregar_columna(p_tabla VARCHAR2, p_columna VARCHAR2, p_ddl VARCHAR2) IS
    v_existe NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_existe
      FROM user_tab_columns
     WHERE table_name = p_tabla AND column_name = p_columna;
    IF v_existe = 0 THEN
      EXECUTE IMMEDIATE 'ALTER TABLE ' || p_tabla || ' ADD ' || p_ddl;
    END IF;
  END;
BEGIN
  -- am_documentos: flujo de aprobación, sellado y versionado
  agregar_columna('AM_DOCUMENTOS', 'PUBLICADOPOR', 'publicadopor VARCHAR2(200)');
  agregar_columna('AM_DOCUMENTOS', 'PUBLICADOAT', 'publicadoat TIMESTAMP');
  agregar_columna('AM_DOCUMENTOS', 'HASHINTEGRIDAD', 'hashintegridad VARCHAR2(64)');
  agregar_columna('AM_DOCUMENTOS', 'VERSIONDOC', 'versiondoc VARCHAR2(20) DEFAULT ''1.0''');
  agregar_columna('AM_DOCUMENTOS', 'DOCUMENTOORIGENID', 'documentoorigenid VARCHAR2(36)');
  agregar_columna('AM_DOCUMENTOS', 'OBSERVACIONESREVISION', 'observacionesrevision CLOB');

  -- am_plantillas: ciclo de vida (borrador/vigente/retirada) y clonado por versión
  agregar_columna('AM_PLANTILLAS', 'VERSION', 'version VARCHAR2(20) DEFAULT ''1.0''');
  agregar_columna('AM_PLANTILLAS', 'ESTADOPLANTILLA', 'estadoplantilla VARCHAR2(30) DEFAULT ''VIGENTE'' NOT NULL');
  agregar_columna('AM_PLANTILLAS', 'PLANTILLAORIGENID', 'plantillaorigenid VARCHAR2(36)');
END;
/

-- Ampliar la FK de documentoorigenid a la propia tabla (autoreferencia), si aún no existe.
DECLARE
  v_existe NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_existe
    FROM user_constraints
   WHERE table_name = 'AM_DOCUMENTOS' AND constraint_name = 'FK_AM_DOC_ORIGEN';
  IF v_existe = 0 THEN
    EXECUTE IMMEDIATE
      'ALTER TABLE am_documentos ADD CONSTRAINT fk_am_doc_origen ' ||
      'FOREIGN KEY (documentoorigenid) REFERENCES am_documentos(id)';
  END IF;
END;
/

DECLARE
  v_existe NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_existe
    FROM user_constraints
   WHERE table_name = 'AM_PLANTILLAS' AND constraint_name = 'FK_AM_PLT_ORIGEN';
  IF v_existe = 0 THEN
    EXECUTE IMMEDIATE
      'ALTER TABLE am_plantillas ADD CONSTRAINT fk_am_plt_origen ' ||
      'FOREIGN KEY (plantillaorigenid) REFERENCES am_plantillas(id)';
  END IF;
END;
/
