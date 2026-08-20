import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())


class ActividadModel(Base):
    __tablename__ = "actividades_prevenir"

    id = Column("id", String(36), primary_key=True, default=_new_id)
    codigo = Column("codigo", String(50), nullable=True)
    nombreActividad = Column("nombreactividad", String(250), nullable=False)
    tipoActividad = Column("tipoactividad", String(80), nullable=False)
    fecha = Column("fecha", String(10), nullable=False)
    departamento = Column("departamento", String(100), nullable=False)
    provincia = Column("provincia", String(100), nullable=True)
    distrito = Column("distrito", String(100), nullable=True)
    entidadAliada = Column("entidadaliada", String(200), nullable=True)
    modalidad = Column("modalidad", String(30), nullable=False)
    publicoObjetivo = Column("publicoobjetivo", String(200), nullable=True)
    participantesMujeres = Column("participantesmujeres", Integer, default=0, nullable=False)
    participantesHombres = Column("participanteshombres", Integer, default=0, nullable=False)
    participantesOtros = Column("participantesotros", Integer, default=0, nullable=False)
    responsable = Column("responsable", String(200), nullable=True)
    estado = Column("estado", String(30), default="Planificada", nullable=False)
    observaciones = Column("observaciones", String(1000), nullable=True)
    creadoPor = Column("creadopor", String(200), nullable=True)
    createdAt = Column("createdat", DateTime, default=datetime.utcnow)
    updatedAt = Column("updatedat", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
