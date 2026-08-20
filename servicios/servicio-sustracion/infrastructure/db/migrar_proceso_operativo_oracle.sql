-- Migración para instalaciones existentes de SUSTRACION_DB.
ALTER TABLE sustracion_db.casos_sustracion MODIFY resultadoentrevista VARCHAR2(40);

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
