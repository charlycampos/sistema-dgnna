"""
Modelos SQLAlchemy — schema TRANSPARENCIA_DB.

La conexión se hace con el usuario TRANSPARENCIA_DB, por lo que Oracle
usa ese schema automáticamente. No se necesita __table_args__ con schema explícito.

NOTA: Los atributos camelCase (fechaIngreso, creadoPor, etc.) no usan string
explícito en Column(), lo que hace que SQLAlchemy Oracle los entrecomille en
DDL/DML generando columnas case-sensitive en Oracle.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())


class TransparenciaModel(Base):
    __tablename__ = "transparencia"

    id                 = Column(String(36),   primary_key=True, default=_new_id)
    numeroExpediente   = Column(String(100),  nullable=False)
    fechaIngreso       = Column(DateTime,     nullable=False)
    documentoIngreso   = Column(String(300),  nullable=True)
    direccion          = Column(String(100),  nullable=False)   # una o más, separadas por ", "
    estado             = Column(String(30),   default="Pendiente")  # Pendiente|En Proceso|Atendido
    fechaAtencion      = Column(DateTime,     nullable=True)
    asunto             = Column(String(1000), nullable=False)
    documentoRespuesta = Column(String(300),  nullable=True)
    categoria          = Column(String(200),  nullable=True)
    plazoVencimiento   = Column(DateTime,     nullable=True)
    plazoInterno       = Column("PLAZOINTERNO", DateTime, nullable=True)
    observaciones      = Column(String(1000), nullable=True)
    creadoPor          = Column(String(200),  nullable=True)
    createdAt          = Column(DateTime,     default=datetime.utcnow)
    updatedAt          = Column(DateTime,     default=datetime.utcnow, onupdate=datetime.utcnow)
