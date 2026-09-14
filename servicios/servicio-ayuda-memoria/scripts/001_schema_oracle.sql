-- Ejecutar conectado exclusivamente como AYUDA_MEMORIA_DB sobre un esquema nuevo.
-- Oracle confirma DDL implícitamente: ante cualquier objeto AM_* previo se aborta
-- para evitar aceptar una estructura parcial o incompatible.
WHENEVER SQLERROR EXIT SQL.SQLCODE
DECLARE
  v_objetos NUMBER;
BEGIN
  IF USER <> 'AYUDA_MEMORIA_DB' THEN
    RAISE_APPLICATION_ERROR(-20001, 'Debe conectarse como AYUDA_MEMORIA_DB');
  END IF;
  SELECT COUNT(*) INTO v_objetos
    FROM user_objects
   WHERE object_name LIKE 'AM\_%' ESCAPE '\';
  IF v_objetos > 0 THEN
    RAISE_APPLICATION_ERROR(-20002, 'Existen objetos AM_*; valide el esquema antes de migrar');
  END IF;
END;
/
DECLARE PROCEDURE ddl(s CLOB) IS BEGIN EXECUTE IMMEDIATE s; END;
BEGIN
 ddl('CREATE TABLE am_plantillas (id VARCHAR2(36) PRIMARY KEY,codigo VARCHAR2(50) UNIQUE NOT NULL,nombre VARCHAR2(250) NOT NULL,descripcion VARCHAR2(500),tipoambito VARCHAR2(30) DEFAULT ''NACIONAL'' NOT NULL,direccionduena VARCHAR2(30) DEFAULT ''MULTIDIRECCIONAL'' NOT NULL,esoficial NUMBER(1) DEFAULT 0 NOT NULL,activo NUMBER(1) DEFAULT 1 NOT NULL,creadopor VARCHAR2(200),createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 ddl('CREATE TABLE am_secciones (id VARCHAR2(36) PRIMARY KEY,plantillaid VARCHAR2(36) NOT NULL REFERENCES am_plantillas(id) ON DELETE CASCADE,orden NUMBER(3) DEFAULT 1 NOT NULL,titulo VARCHAR2(250) NOT NULL,tiposeccion VARCHAR2(30) DEFAULT ''TEXTO'' NOT NULL,guiallenado VARCHAR2(500),direccionsugerida VARCHAR2(30),configuracionjson CLOB,createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 ddl('CREATE TABLE am_documentos (id VARCHAR2(36) PRIMARY KEY,plantillaid VARCHAR2(36) NOT NULL REFERENCES am_plantillas(id),codigointerno VARCHAR2(50) UNIQUE NOT NULL,titulo VARCHAR2(300) NOT NULL,region VARCHAR2(100),fechacorte VARCHAR2(50),estado VARCHAR2(30) DEFAULT ''BORRADOR'' NOT NULL,direccion VARCHAR2(30) DEFAULT ''DPE'' NOT NULL,nivelriesgo VARCHAR2(30),serviciomimp VARCHAR2(200),creadopor VARCHAR2(200),createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 ddl('CREATE TABLE am_documento_valores (id VARCHAR2(36) PRIMARY KEY,documentoid VARCHAR2(36) NOT NULL REFERENCES am_documentos(id) ON DELETE CASCADE,seccionid VARCHAR2(36) NOT NULL REFERENCES am_secciones(id) ON DELETE CASCADE,textocontenido CLOB,datostablajson CLOB,datosgraficojson CLOB,cifracorte VARCHAR2(100),actualizadopor VARCHAR2(200),updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT uq_am_doc_seccion UNIQUE(documentoid,seccionid))');
 ddl('CREATE TABLE am_caso_acciones (id VARCHAR2(36) PRIMARY KEY,documentoid VARCHAR2(36) NOT NULL REFERENCES am_documentos(id) ON DELETE CASCADE,fecha VARCHAR2(50) NOT NULL,institucion VARCHAR2(200),descripcion CLOB NOT NULL,creadopor VARCHAR2(200),createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 ddl('CREATE TABLE am_auditoria_accesos (id VARCHAR2(36) PRIMARY KEY,documentoid VARCHAR2(36) NOT NULL REFERENCES am_documentos(id) ON DELETE CASCADE,usuarionombre VARCHAR2(200) NOT NULL,usuariocorreo VARCHAR2(200),accion VARCHAR2(50) NOT NULL,iporigen VARCHAR2(50),createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 ddl('CREATE INDEX ix_am_documentos_estado_fecha ON am_documentos(estado,updatedat)');
 ddl('CREATE INDEX ix_am_documentos_direccion ON am_documentos(direccion)');
END;
/
