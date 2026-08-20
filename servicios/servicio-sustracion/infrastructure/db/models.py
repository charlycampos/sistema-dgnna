"""
Modelos SQLAlchemy — schema SUSTRACION_DB.
Todas las columnas camelCase mapean explícitamente a minúsculas para Oracle.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


def _new_id(): return str(uuid.uuid4())


class CasoSustracionModel(Base):
    __tablename__ = "casos_sustracion"

    id                    = Column("id",                    String(36),   primary_key=True, default=_new_id)
    codigo                = Column("codigo",                String(20),   nullable=False, unique=True)
    nnaNombre             = Column("nnanombre",             String(300),  nullable=True)  # legado
    nnaSexo               = Column("nnasexo",               String(10),   nullable=True)
    nnaEdad               = Column("nnaedad",               String(10),   nullable=True)
    nnaTipoEdad           = Column("nnatipoedad",           String(10),   nullable=True)
    nnaFechaNac           = Column("nnafechanac",           String(10),   nullable=True)
    pais                  = Column("pais",                  String(100),  nullable=False)
    etapa                 = Column("etapa",                 String(20),   nullable=True)
    tipoSolicitud         = Column("tiposolicitud",         String(50),   nullable=True)
    acPeru                = Column("acperu",                String(20),   nullable=True)
    fechaIngreso          = Column("fechaingreso",          String(10),   nullable=False)
    fechaSalida           = Column("fechasalida",           String(10),   nullable=True)
    solicitanteNombre     = Column("solicitantenombre",     String(300),  nullable=True)
    solicitanteSexo       = Column("solicitantesexo",       String(10),   nullable=True)
    solicitanteTelefono   = Column("solicitantetelefono",   String(50),   nullable=True)
    solicitanteCorreo     = Column("solicitantecorreo",     String(200),  nullable=True)
    solicitanteDomicilio  = Column("solicitantedomicilio",  String(500),  nullable=True)
    requeridoNombre       = Column("requeridombre",         String(300),  nullable=True)
    requeridoSexo         = Column("requeridosexo",         String(10),   nullable=True)
    requeridoTelefono     = Column("requeridotelefono",     String(50),   nullable=True)
    requeridoCorreo       = Column("requeridocorreo",       String(200),  nullable=True)
    requeridoDomicilio    = Column("requeridodomicilio",    String(500),  nullable=True)
    profesional           = Column("profesional",           String(100),  nullable=True)
    estado                = Column("estado",                String(20),   default="Tramite")
    fechaEntrevista       = Column("fechaentrevista",       String(10),   nullable=True)
    resultadoEntrevista   = Column("resultadoentrevista",   String(40),   nullable=True)
    estadoJudicial        = Column("estadojudicial",        String(100),  nullable=True)
    fechaDemanda          = Column("fechademanda",          String(10),   nullable=True)
    numExpedienteJudicial = Column("numexpedientejudicial", String(100),  nullable=True)
    juzgado               = Column("juzgado",               String(300),  nullable=True)
    sentencia1ra          = Column("sentencia1ra",          String(300),  nullable=True)
    sentencia2da          = Column("sentencia2da",          String(300),  nullable=True)
    casacion              = Column("casacion",              String(300),  nullable=True)
    motivoCierre          = Column("motivocierre",          String(200),  nullable=True)
    retorno               = Column("retorno",               String(20),   nullable=True)
    observaciones         = Column("observaciones",         String(1000), nullable=True)
    creadoPor             = Column("creadopor",             String(200),  nullable=True)
    createdAt             = Column("createdat",             DateTime, default=datetime.utcnow)
    updatedAt             = Column("updatedat",             DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bitacora          = relationship("BitacoraSustracionModel", back_populates="caso", cascade="all, delete-orphan", order_by="BitacoraSustracionModel.fecha")
    historialJudicial = relationship("HistorialJudicialModel",  back_populates="caso", cascade="all, delete-orphan", order_by="HistorialJudicialModel.fecha")
    nna               = relationship("NnaSustracionModel", back_populates="caso", cascade="all, delete-orphan", order_by="NnaSustracionModel.createdAt")
    procesoOperativo  = relationship("ProcesoOperativoSustracionModel", back_populates="caso", cascade="all, delete-orphan", uselist=False)


class ProcesoOperativoSustracionModel(Base):
    __tablename__ = "proceso_operativo_sustracion"

    casoId = Column("casoid", String(36), ForeignKey("casos_sustracion.id", ondelete="CASCADE"), primary_key=True)
    faseOperativa = Column("faseoperativa", String(60), nullable=False, default="Evaluación")
    evaluacionResultado = Column("evaluacionresultado", String(30), nullable=True)
    requisitosJson = Column("requisitosjson", Text, nullable=False)
    fechaObservacion = Column("fechaobservacion", String(10), nullable=True)
    fechaNotificacion = Column("fechanotificacion", String(10), nullable=True)
    fechaLimiteSubsanacion = Column("fechalimitesubsanacion", String(10), nullable=True)
    ampliacionSubsanacion = Column("ampliacionsubsanacion", String(10), nullable=True)
    fechaRespuestaSubsanacion = Column("fecharespuestasubsanacion", String(10), nullable=True)
    resultadoSubsanacion = Column("resultadosubsanacion", String(30), nullable=True)
    detalleSubsanacion = Column("detallesubsanacion", String(1000), nullable=True)
    destinatarioGestion = Column("destinatariogestion", String(300), nullable=True)
    tipoComunicacion = Column("tipocomunicacion", String(100), nullable=True)
    fechaEnvio = Column("fechaenvio", String(10), nullable=True)
    referenciaSgd = Column("referenciasgd", String(200), nullable=True)
    respuestaEsperada = Column("respuestaesperada", String(10), nullable=True)
    proximaAccion = Column("proximaaccion", String(1000), nullable=True)
    fechaLimite = Column("fechalimite", String(10), nullable=True)
    respuestaRecibida = Column("respuestarecibida", String(10), nullable=True)
    estadoCooperacion = Column("estadocooperacion", String(60), nullable=True)
    estadoRetornoVoluntario = Column("estadoretornovoluntario", String(60), nullable=True)
    propuestaRetorno = Column("propuestaretorno", String(1000), nullable=True)
    fechaPrevistaRetorno = Column("fechaprevistaretorno", String(10), nullable=True)
    compromisosRetorno = Column("compromisosretorno", String(1000), nullable=True)
    fechaAcuerdo = Column("fechaacuerdo", String(10), nullable=True)
    fechaLimitePasajes = Column("fechalimitepasajes", String(10), nullable=True)
    pasajesRecibidos = Column("pasajesrecibidos", String(10), nullable=True)
    fechaRetornoEfectivo = Column("fecharetornoefectivo", String(10), nullable=True)
    updatedAt = Column("updatedat", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    caso = relationship("CasoSustracionModel", back_populates="procesoOperativo")


class NnaSustracionModel(Base):
    __tablename__ = "nna_sustracion"

    id              = Column("id",              String(36),  primary_key=True, default=_new_id)
    casoId          = Column("casoid",          String(36),  ForeignKey("casos_sustracion.id", ondelete="CASCADE"), nullable=False)
    nombres         = Column("nombres",         String(200), nullable=False)
    primerApellido  = Column("primerapellido",  String(100), nullable=False)
    segundoApellido = Column("segundoapellido", String(100), nullable=True)
    sexo            = Column("sexo",            String(10),  nullable=True)
    fechaNacimiento = Column("fechanacimiento", String(10),  nullable=True)
    edad            = Column("edad",             String(10),  nullable=True)
    tipoEdad        = Column("tipoedad",         String(10),  nullable=True)
    createdAt       = Column("createdat",        DateTime, default=datetime.utcnow)

    caso = relationship("CasoSustracionModel", back_populates="nna")


class BitacoraSustracionModel(Base):
    __tablename__ = "bitacora_sustracion"

    id        = Column("id",        String(36),   primary_key=True, default=_new_id)
    casoId    = Column("casoid",    String(36),   ForeignKey("casos_sustracion.id", ondelete="CASCADE"), nullable=False)
    fecha     = Column("fecha",     String(10),   nullable=False)
    texto     = Column("texto",     String(2000), nullable=False)
    creadoPor = Column("creadopor", String(200),  nullable=True)
    createdAt = Column("createdat", DateTime, default=datetime.utcnow)

    caso = relationship("CasoSustracionModel", back_populates="bitacora")


class HistorialJudicialModel(Base):
    __tablename__ = "historial_judicial"

    id          = Column("id",          String(36),   primary_key=True, default=_new_id)
    casoId      = Column("casoid",      String(36),   ForeignKey("casos_sustracion.id", ondelete="CASCADE"), nullable=False)
    etapa       = Column("etapa",       String(100),  nullable=False)
    fecha       = Column("fecha",       String(10),   nullable=False)
    descripcion = Column("descripcion", String(2000), nullable=True)
    creadoPor   = Column("creadopor",   String(200),  nullable=True)
    createdAt   = Column("createdat",   DateTime, default=datetime.utcnow)

    caso = relationship("CasoSustracionModel", back_populates="historialJudicial")
