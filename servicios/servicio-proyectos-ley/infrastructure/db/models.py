"""
Modelos SQLAlchemy — schema PROYECTOS_LEY_DB.

IMPORTANTE: NO se usan strings explícitos en Column() para los nombres de columna.
Los atributos Python camelCase (createdAt, comisionId, etc.) fueron creados por el
backend SIN string explícito, lo que hace que SQLAlchemy Oracle los entrecomille en
DDL/DML ("createdAt", "comisionId"), generando columnas case-sensitive en Oracle.
Si usáramos strings explícitos en minúsculas ("createdat"), Oracle buscaría CREATEDAT
(mayúsculas) y no encontraría la columna → ORA-00904.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())


# ── Catálogos ─────────────────────────────────────────────────────────────────

class PlComisionModel(Base):
    __tablename__ = "pl_comisiones"

    id        = Column(String(36),  primary_key=True, default=_new_id)
    nombre    = Column(String(300), nullable=False, unique=True)
    activo    = Column(Boolean,     default=True)
    createdAt = Column(DateTime,    default=datetime.utcnow)

    proyectos = relationship("ProyectoLeyModel", back_populates="comision")


class PlCongresistaModel(Base):
    __tablename__ = "pl_congresistas"

    id        = Column(String(36),  primary_key=True, default=_new_id)
    nombre    = Column(String(300), nullable=False, unique=True)
    partido   = Column(String(300), nullable=False)
    activo    = Column(Boolean,     default=True)
    createdAt = Column(DateTime,    default=datetime.utcnow)

    proyectos = relationship("ProyectoLeyModel", back_populates="congresista")


class PlTipoOpinionModel(Base):
    __tablename__ = "pl_tipos_opinion"

    id        = Column(String(36),  primary_key=True, default=_new_id)
    nombre    = Column(String(200), nullable=False, unique=True)
    activo    = Column(Boolean,     default=True)
    createdAt = Column(DateTime,    default=datetime.utcnow)


class PlDireccionModel(Base):
    __tablename__ = "pl_direcciones"

    id        = Column(String(36),  primary_key=True, default=_new_id)
    nombre    = Column(String(200), nullable=False, unique=True)
    activo    = Column(Boolean,     default=True)
    createdAt = Column(DateTime,    default=datetime.utcnow)

    eventos = relationship("PlEventoDireccionModel", back_populates="direccion")


class PlProfesionalModel(Base):
    __tablename__ = "pl_profesionales"

    id        = Column(String(36),  primary_key=True, default=_new_id)
    nombre    = Column(String(200), nullable=False, unique=True)
    activo    = Column(Boolean,     default=True)
    createdAt = Column(DateTime,    default=datetime.utcnow)

    eventos = relationship("PlEventoProfesionalModel", back_populates="profesional")


# ── Entidad principal ─────────────────────────────────────────────────────────

class ProyectoLeyModel(Base):
    __tablename__ = "proyectos_ley"

    id             = Column(String(36),   primary_key=True, default=_new_id)
    numeroPL       = Column(String(50),   nullable=False)
    expediente     = Column(String(100),  nullable=True)
    documento      = Column(String(300),  nullable=True)
    comisionId     = Column(String(36),   ForeignKey("pl_comisiones.id"),   nullable=True)
    congresistaId  = Column(String(36),   ForeignKey("pl_congresistas.id"), nullable=True)
    sumilla        = Column(String(1000), nullable=True)
    tema           = Column(String(300),  nullable=True)
    opinion        = Column(String(200),  nullable=True)
    estado         = Column(String(30),   default="en_proceso")
    estadoCongreso = Column(String(500),  nullable=True)
    observaciones  = Column(String(1000), nullable=True)
    creadoPor      = Column(String(200),  nullable=True)
    createdAt      = Column(DateTime,     default=datetime.utcnow)
    updatedAt      = Column(DateTime,     default=datetime.utcnow, onupdate=datetime.utcnow)

    comision    = relationship("PlComisionModel",    back_populates="proyectos")
    congresista = relationship("PlCongresistaModel", back_populates="proyectos")
    eventos     = relationship(
        "PlEventoModel",
        back_populates="proyectoLey",
        cascade="all, delete-orphan",
        order_by="PlEventoModel.fecha",
    )


# ── Eventos (timeline del expediente) ────────────────────────────────────────

class PlEventoModel(Base):
    __tablename__ = "pl_eventos"

    id                   = Column(String(36),   primary_key=True, default=_new_id)
    proyectoLeyId        = Column(String(36),   ForeignKey("proyectos_ley.id", ondelete="CASCADE"), nullable=False)
    tipo                 = Column(String(30),   nullable=False)
    fecha                = Column(String(10),   nullable=False)
    documento            = Column(String(300),  nullable=True)
    expediente           = Column(String(100),  nullable=True)
    observaciones        = Column(String(1000), nullable=True)
    registradoPor        = Column(String(200),  nullable=True)
    fechaSalidaDireccion = Column(String(10),   nullable=True)
    numeroInforme        = Column(String(100),  nullable=True)
    opinionDireccion     = Column(String(200),  nullable=True)
    direccionInforme     = Column(String(200),  nullable=True)
    opinionFinal         = Column(String(200),  nullable=True)
    fechaSalidaDGNNA     = Column(String(10),   nullable=True)
    memoNota             = Column(String(100),  nullable=True)
    createdAt            = Column(DateTime,     default=datetime.utcnow)

    proyectoLey   = relationship("ProyectoLeyModel",         back_populates="eventos")
    direcciones   = relationship("PlEventoDireccionModel",   back_populates="evento",   cascade="all, delete-orphan")
    profesionales = relationship("PlEventoProfesionalModel", back_populates="evento",   cascade="all, delete-orphan")


# ── Tablas puente ─────────────────────────────────────────────────────────────

class PlEventoDireccionModel(Base):
    __tablename__ = "pl_evento_direcciones"

    id          = Column(String(36), primary_key=True, default=_new_id)
    eventoId    = Column(String(36), ForeignKey("pl_eventos.id",    ondelete="CASCADE"), nullable=False)
    direccionId = Column(String(36), ForeignKey("pl_direcciones.id"),                   nullable=False)

    evento    = relationship("PlEventoModel",    back_populates="direcciones")
    direccion = relationship("PlDireccionModel", back_populates="eventos")


class PlEventoProfesionalModel(Base):
    __tablename__ = "pl_evento_profesionales"

    id            = Column(String(36), primary_key=True, default=_new_id)
    eventoId      = Column(String(36), ForeignKey("pl_eventos.id",      ondelete="CASCADE"), nullable=False)
    profesionalId = Column(String(36), ForeignKey("pl_profesionales.id"),                   nullable=False)

    evento      = relationship("PlEventoModel",      back_populates="profesionales")
    profesional = relationship("PlProfesionalModel", back_populates="eventos")
