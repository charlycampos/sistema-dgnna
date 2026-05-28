"""
Modelos SQLAlchemy — solo para el schema APELACIONES_DB.
Son el adaptador de infraestructura, no el dominio.
Nota: todas las columnas camelCase mapean explícitamente a minúsculas
para compatibilidad con Oracle (que no preserva case sin comillas).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


def _new_id() -> str:
    return str(uuid.uuid4())


class AbogadoModel(Base):
    __tablename__ = "abogados"

    id        = Column("id",        String(36), primary_key=True, default=_new_id)
    nombre    = Column("nombre",    String(200), nullable=False)
    activo    = Column("activo",    Boolean, default=True)
    createdAt = Column("createdat", DateTime, default=datetime.utcnow)
    updatedAt = Column("updatedat", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apelaciones = relationship("ApelacionModel", back_populates="abogado")


class ComplejidadModel(Base):
    __tablename__ = "complejidades_juridicas"

    id     = Column("id",     String(36), primary_key=True, default=_new_id)
    nombre = Column("nombre", String(100), nullable=False, unique=True)
    puntos = Column("puntos", Integer, nullable=False)
    activo = Column("activo", Boolean, default=True)

    apelaciones = relationship("ApelacionModel", back_populates="complejidad")


class ExtensionRangoModel(Base):
    __tablename__ = "extension_rangos"

    id          = Column("id",          String(36), primary_key=True, default=_new_id)
    descripcion = Column("descripcion", String(100), nullable=False)
    minFolios   = Column("minfolios",   Integer, nullable=False)
    maxFolios   = Column("maxfolios",   Integer, nullable=True)
    puntos      = Column("puntos",      Integer, nullable=False)
    activo      = Column("activo",      Boolean, default=True)


class RevisorModel(Base):
    __tablename__ = "revisores"

    id        = Column("id",        String(36),  primary_key=True, default=_new_id)
    nombre    = Column("nombre",    String(200), nullable=False)
    activo    = Column("activo",    Boolean, default=True)
    createdAt = Column("createdat", DateTime, default=datetime.utcnow)
    updatedAt = Column("updatedat", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apelaciones = relationship("ApelacionModel", back_populates="revisor")


class ProcedenciaModel(Base):
    __tablename__ = "procedencias"

    id     = Column("id",     String(36),  primary_key=True, default=_new_id)
    nombre = Column("nombre", String(200), nullable=False, unique=True)
    activo = Column("activo", Boolean, default=True)


class ApelanteDetalleModel(Base):
    __tablename__ = "apelantes_detalle"

    id              = Column("id", String(36), primary_key=True, default=_new_id)
    apelacionId     = Column("apelacion_id", String(36), ForeignKey("apelaciones.id"), nullable=False)
    tipo            = Column("tipo", String(20), nullable=False) # 'natural' o 'institucion'
    nombres         = Column("nombres", String(150), nullable=True)
    apellidoPaterno = Column("apellido_paterno", String(150), nullable=True)
    apellidoMaterno = Column("apellido_materno", String(150), nullable=True)
    institucion     = Column("institucion", String(300), nullable=True)
    documento       = Column("documento", String(50), nullable=True)

    apelacion = relationship("ApelacionModel", back_populates="apelantes")


class NnaDetalleModel(Base):
    __tablename__ = "nna_detalle"

    id              = Column("id", String(36), primary_key=True, default=_new_id)
    apelacionId     = Column("apelacion_id", String(36), ForeignKey("apelaciones.id"), nullable=False)
    tipo            = Column("tipo", String(20), nullable=False) # 'natural' o 'institucion'
    nombres         = Column("nombres", String(150), nullable=True)
    primerApellido  = Column("primer_apellido", String(150), nullable=True)
    segundoApellido = Column("segundo_apellido", String(150), nullable=True)
    edad            = Column("edad", Integer, nullable=True)
    institucion     = Column("institucion", String(300), nullable=True) # Nombre del CAR

    apelacion = relationship("ApelacionModel", back_populates="nnas")


class ApelacionModel(Base):
    __tablename__ = "apelaciones"

    id                = Column("id",                String(36), primary_key=True, default=_new_id)
    numeroExpediente  = Column("numeroexpediente",  String(100), nullable=False)
    fechaIngreso      = Column("fechaingreso",      DateTime, nullable=False)
    fechaIngresoMIMP  = Column("fechaingresomimp",  DateTime, nullable=True)
    plazoVencimiento  = Column("plazovencimiento",  DateTime, nullable=True)
    apelante          = Column("apelante",          String(300), nullable=True)
    nnaCar            = Column("nnacar",            String(300), nullable=True)
    procedencia       = Column("procedencia",       String(200), nullable=False)
    documento         = Column("documento",         String(300), nullable=False)
    asunto            = Column("asunto",            String(500), nullable=False)
    folios            = Column("folios",            Integer, nullable=False)
    puntosExtension   = Column("puntosextension",   Integer, nullable=False)
    complejidadId     = Column("complejidadid",     String(36), ForeignKey("complejidades_juridicas.id"), nullable=False)
    puntosComplejidad = Column("puntoscomplejidad", Integer, nullable=False)
    puntosTotal       = Column("puntostotal",       Integer, nullable=False)
    abogadoId         = Column("abogadoid",         String(36), ForeignKey("abogados.id"), nullable=False)
    fechaAsignacion   = Column("fechaasignacion",   DateTime, nullable=False)
    estado            = Column("estado",            String(20), default="Pendiente")
    numeroResolucion  = Column("numeroresolucion",  String(200), nullable=True)
    documentoAtencion = Column("documentoatencion", String(200), nullable=True)
    cargos            = Column("cargos",            String(200), nullable=True)
    observaciones     = Column("observaciones",     String(1000), nullable=True)
    revisorId         = Column("revisorid",         String(36), ForeignKey("revisores.id"), nullable=True)
    createdAt         = Column("createdat",         DateTime, default=datetime.utcnow)
    updatedAt         = Column("updatedat",         DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    abogado     = relationship("AbogadoModel", back_populates="apelaciones")
    complejidad = relationship("ComplejidadModel", back_populates="apelaciones")
    revisor     = relationship("RevisorModel", back_populates="apelaciones")
    apelantes   = relationship("ApelanteDetalleModel", back_populates="apelacion", cascade="all, delete-orphan")
    nnas        = relationship("NnaDetalleModel", back_populates="apelacion", cascade="all, delete-orphan")
