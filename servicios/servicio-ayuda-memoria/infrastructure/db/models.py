import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def uid(): return str(uuid.uuid4())

class Plantilla(Base):
    __tablename__ = "am_plantillas"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    tipoAmbito: Mapped[str] = mapped_column("tipoambito", String(30), default="NACIONAL")
    direccionDuena: Mapped[str] = mapped_column("direccionduena", String(30), default="MULTIDIRECCIONAL")
    esOficial: Mapped[bool] = mapped_column("esoficial", Boolean, default=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    estadoPlantilla: Mapped[str] = mapped_column("estadoplantilla", String(30), default="VIGENTE")
    plantillaOrigenId: Mapped[str | None] = mapped_column("plantillaorigenid", String(36), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creadoPor: Mapped[str | None] = mapped_column("creadopor", String(200))
    createdAt: Mapped[datetime] = mapped_column("createdat", DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column("updatedat", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    secciones = relationship("Seccion", back_populates="plantilla", cascade="all, delete-orphan", order_by="Seccion.orden")
    documentos = relationship("Documento", back_populates="plantilla")

class Seccion(Base):
    __tablename__="am_secciones"
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    plantillaId: Mapped[str]=mapped_column("plantillaid",ForeignKey("am_plantillas.id",ondelete="CASCADE"))
    orden: Mapped[int]=mapped_column(Integer,default=1)
    titulo: Mapped[str]=mapped_column(String(250))
    tipoSeccion: Mapped[str]=mapped_column("tiposeccion",String(30),default="TEXTO")
    guiaLlenado: Mapped[str|None]=mapped_column("guiallenado",String(500))
    direccionSugerida: Mapped[str|None]=mapped_column("direccionsugerida",String(30))
    configuracionJson: Mapped[str|None]=mapped_column("configuracionjson",Text)
    createdAt: Mapped[datetime]=mapped_column("createdat",DateTime,default=datetime.utcnow)
    plantilla=relationship("Plantilla",back_populates="secciones")
    valores=relationship("Valor",back_populates="seccion")

class Documento(Base):
    __tablename__="am_documentos"
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    plantillaId: Mapped[str]=mapped_column("plantillaid",ForeignKey("am_plantillas.id"))
    codigoInterno: Mapped[str]=mapped_column("codigointerno",String(50),unique=True)
    titulo: Mapped[str]=mapped_column(String(300))
    region: Mapped[str|None]=mapped_column(String(100))
    fechaCorte: Mapped[str|None]=mapped_column("fechacorte",String(50))
    estado: Mapped[str]=mapped_column(String(30),default="BORRADOR")
    direccion: Mapped[str]=mapped_column(String(30),default="DPE")
    nivelRiesgo: Mapped[str|None]=mapped_column("nivelriesgo",String(30))
    servicioMimp: Mapped[str|None]=mapped_column("serviciomimp",String(200))
    creadoPor: Mapped[str|None]=mapped_column("creadopor",String(200))
    publicadoPor: Mapped[str|None]=mapped_column("publicadopor",String(200))
    publicadoAt: Mapped[datetime|None]=mapped_column("publicadoat",DateTime,nullable=True)
    hashIntegridad: Mapped[str|None]=mapped_column("hashintegridad",String(64),nullable=True)
    versionDoc: Mapped[str]=mapped_column("versiondoc",String(20),default="1.0")
    documentoOrigenId: Mapped[str|None]=mapped_column("documentoorigenid",String(36),nullable=True)
    observacionesRevision: Mapped[str|None]=mapped_column("observacionesrevision",Text,nullable=True)
    createdAt: Mapped[datetime]=mapped_column("createdat",DateTime,default=datetime.utcnow)
    updatedAt: Mapped[datetime]=mapped_column("updatedat",DateTime,default=datetime.utcnow,onupdate=datetime.utcnow)
    plantilla=relationship("Plantilla",back_populates="documentos")
    valores=relationship("Valor",back_populates="documento",cascade="all, delete-orphan")
    acciones=relationship("Accion",back_populates="documento",cascade="all, delete-orphan",order_by="Accion.createdAt")
    accesos=relationship("Auditoria",back_populates="documento",cascade="all, delete-orphan")

class Valor(Base):
    __tablename__="am_documento_valores"; __table_args__=(UniqueConstraint("documentoid","seccionid",name="uq_am_doc_seccion"),)
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    documentoId: Mapped[str]=mapped_column("documentoid",ForeignKey("am_documentos.id",ondelete="CASCADE"))
    seccionId: Mapped[str]=mapped_column("seccionid",ForeignKey("am_secciones.id",ondelete="CASCADE"))
    textoContenido: Mapped[str|None]=mapped_column("textocontenido",Text)
    datosTablaJson: Mapped[str|None]=mapped_column("datostablajson",Text)
    datosGraficoJson: Mapped[str|None]=mapped_column("datosgraficojson",Text)
    cifraCorte: Mapped[str|None]=mapped_column("cifracorte",String(100))
    actualizadoPor: Mapped[str|None]=mapped_column("actualizadopor",String(200))
    updatedAt: Mapped[datetime]=mapped_column("updatedat",DateTime,default=datetime.utcnow,onupdate=datetime.utcnow)
    documento=relationship("Documento",back_populates="valores"); seccion=relationship("Seccion",back_populates="valores")

class Accion(Base):
    __tablename__="am_caso_acciones"
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    documentoId: Mapped[str]=mapped_column("documentoid",ForeignKey("am_documentos.id",ondelete="CASCADE"))
    fecha: Mapped[str]=mapped_column(String(50)); institucion: Mapped[str|None]=mapped_column(String(200)); descripcion: Mapped[str]=mapped_column(Text)
    creadoPor: Mapped[str|None]=mapped_column("creadopor",String(200)); createdAt: Mapped[datetime]=mapped_column("createdat",DateTime,default=datetime.utcnow)
    documento=relationship("Documento",back_populates="acciones")

class Auditoria(Base):
    __tablename__="am_auditoria_accesos"
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    documentoId: Mapped[str]=mapped_column("documentoid",ForeignKey("am_documentos.id",ondelete="CASCADE"))
    usuarioNombre: Mapped[str]=mapped_column("usuarionombre",String(200)); usuarioCorreo: Mapped[str|None]=mapped_column("usuariocorreo",String(200))
    accion: Mapped[str]=mapped_column(String(50)); ipOrigen: Mapped[str|None]=mapped_column("iporigen",String(50)); createdAt: Mapped[datetime]=mapped_column("createdat",DateTime,default=datetime.utcnow)
    documento=relationship("Documento",back_populates="accesos")
