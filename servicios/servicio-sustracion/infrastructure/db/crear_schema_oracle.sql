-- Schema SUSTRACION_DB — Microservicio de Sustracción Internacional
-- Ejecutar sentencia por sentencia como SYSTEM

-- PASO 1
CREATE USER sustracion_db IDENTIFIED BY Sustracion2026;

-- PASO 2
GRANT DBA TO sustracion_db;

-- PASO 3: Casos
CREATE TABLE sustracion_db.casos_sustracion (
    id                    VARCHAR2(36)   PRIMARY KEY,
    codigo                VARCHAR2(20)   NOT NULL UNIQUE,
    nnanombre             VARCHAR2(300),
    nnasexo               VARCHAR2(10),
    nnaedad               VARCHAR2(10),
    nnatipoedad           VARCHAR2(10),
    nnafechanac           VARCHAR2(10),
    pais                  VARCHAR2(100)  NOT NULL,
    etapa                 VARCHAR2(20),
    tiposolicitud         VARCHAR2(50),
    acperu                VARCHAR2(20),
    fechaingreso          VARCHAR2(10)   NOT NULL,
    fechasalida           VARCHAR2(10),
    solicitantenombre     VARCHAR2(300),
    solicitantesexo       VARCHAR2(10),
    solicitantetelefono   VARCHAR2(50),
    solicitantecorreo     VARCHAR2(200),
    solicitantedomicilio  VARCHAR2(500),
    requeridombre         VARCHAR2(300),
    requeridosexo         VARCHAR2(10),
    requeridotelefono     VARCHAR2(50),
    requeridocorreo       VARCHAR2(200),
    requeridodomicilio    VARCHAR2(500),
    profesional           VARCHAR2(100),
    estado                VARCHAR2(20)   DEFAULT 'Tramite',
    fechaentrevista       VARCHAR2(10),
    resultadoentrevista   VARCHAR2(40),
    estadojudicial        VARCHAR2(100),
    fechademanda          VARCHAR2(10),
    numexpedientejudicial VARCHAR2(100),
    juzgado               VARCHAR2(300),
    sentencia1ra          VARCHAR2(300),
    sentencia2da          VARCHAR2(300),
    casacion              VARCHAR2(300),
    motivocierre          VARCHAR2(200),
    retorno               VARCHAR2(20),
    observaciones         VARCHAR2(1000),
    creadopor             VARCHAR2(200),
    createdat             TIMESTAMP      DEFAULT SYSTIMESTAMP,
    updatedat             TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- PASO 4: Bitácora
CREATE TABLE sustracion_db.bitacora_sustracion (
    id        VARCHAR2(36)   PRIMARY KEY,
    casoid    VARCHAR2(36)   NOT NULL,
    fecha     VARCHAR2(10)   NOT NULL,
    texto     VARCHAR2(2000) NOT NULL,
    creadopor VARCHAR2(200),
    createdat TIMESTAMP      DEFAULT SYSTIMESTAMP,
    CONSTRAINT fk_bit_caso FOREIGN KEY (casoid) REFERENCES sustracion_db.casos_sustracion(id) ON DELETE CASCADE
);

-- PASO 5: Historial judicial
CREATE TABLE sustracion_db.historial_judicial (
    id          VARCHAR2(36)   PRIMARY KEY,
    casoid      VARCHAR2(36)   NOT NULL,
    etapa       VARCHAR2(100)  NOT NULL,
    fecha       VARCHAR2(10)   NOT NULL,
    descripcion VARCHAR2(2000),
    creadopor   VARCHAR2(200),
    createdat   TIMESTAMP      DEFAULT SYSTIMESTAMP,
    CONSTRAINT fk_hj_caso FOREIGN KEY (casoid) REFERENCES sustracion_db.casos_sustracion(id) ON DELETE CASCADE
);

-- PASO 6: NNA involucrados por caso
CREATE TABLE sustracion_db.nna_sustracion (
    id               VARCHAR2(36)  PRIMARY KEY,
    casoid           VARCHAR2(36)  NOT NULL,
    nombres          VARCHAR2(200) NOT NULL,
    primerapellido   VARCHAR2(100) NOT NULL,
    segundoapellido  VARCHAR2(100),
    sexo             VARCHAR2(10),
    fechanacimiento  VARCHAR2(10),
    edad             VARCHAR2(10),
    tipoedad         VARCHAR2(10),
    createdat        TIMESTAMP DEFAULT SYSTIMESTAMP,
    CONSTRAINT fk_nna_caso FOREIGN KEY (casoid) REFERENCES sustracion_db.casos_sustracion(id) ON DELETE CASCADE
);

-- PASO 7: Estado persistente del flujo operativo
CREATE TABLE sustracion_db.proceso_operativo_sustracion (
    casoid VARCHAR2(36) PRIMARY KEY,
    faseoperativa VARCHAR2(60) NOT NULL,
    evaluacionresultado VARCHAR2(30),
    requisitosjson CLOB NOT NULL,
    fechaobservacion VARCHAR2(10),
    fechanotificacion VARCHAR2(10),
    fechalimitesubsanacion VARCHAR2(10),
    ampliacionsubsanacion VARCHAR2(10),
    fecharespuestasubsanacion VARCHAR2(10),
    resultadosubsanacion VARCHAR2(30),
    detallesubsanacion VARCHAR2(1000),
    destinatariogestion VARCHAR2(300),
    tipocomunicacion VARCHAR2(100),
    fechaenvio VARCHAR2(10),
    referenciasgd VARCHAR2(200),
    respuestaesperada VARCHAR2(10),
    proximaaccion VARCHAR2(1000),
    fechalimite VARCHAR2(10),
    respuestarecibida VARCHAR2(10),
    estadocooperacion VARCHAR2(60),
    estadoretornovoluntario VARCHAR2(60),
    propuestaretorno VARCHAR2(1000),
    fechaprevistaretorno VARCHAR2(10),
    compromisosretorno VARCHAR2(1000),
    fechaacuerdo VARCHAR2(10),
    fechalimitepasajes VARCHAR2(10),
    pasajesrecibidos VARCHAR2(10),
    fecharetornoefectivo VARCHAR2(10),
    updatedat TIMESTAMP DEFAULT SYSTIMESTAMP,
    CONSTRAINT fk_proceso_caso FOREIGN KEY (casoid)
        REFERENCES sustracion_db.casos_sustracion(id) ON DELETE CASCADE
);

-- VERIFICAR
SELECT table_name FROM all_tables WHERE owner = 'SUSTRACION_DB' ORDER BY 1;
