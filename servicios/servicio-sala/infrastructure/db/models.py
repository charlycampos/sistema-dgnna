"""
Modelos SQLAlchemy — schema SALA_DB.
Todas las columnas camelCase mapean explícitamente a minúsculas para Oracle.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from infrastructure.db.database import Base


def _new_id(): return str(uuid.uuid4())


class ReservaSalaModel(Base):
    __tablename__ = "reservas_sala"

    id          = Column("id",          String(36),  primary_key=True, default=_new_id)
    fecha       = Column("fecha",       String(10),  nullable=False)
    titulo      = Column("titulo",      String(200), nullable=False)
    horaInicio  = Column("horainicio",  String(5),   nullable=False)
    horaFin     = Column("horafin",     String(5),   nullable=False)
    categoria   = Column("categoria",   String(100), nullable=False)
    estado      = Column("estado",      String(20),  default="Programado")
    descripcion = Column("descripcion", String(500), nullable=True)
    creadoPor   = Column("creadopor",   String(200), nullable=True)
    createdAt   = Column("createdat",   DateTime, default=datetime.utcnow)
    updatedAt   = Column("updatedat",   DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
