import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql.elements import quoted_name
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())

# Nombres Oracle case-sensitive (creados con comillas dobles)
_qn = lambda s: quoted_name(s, True)


class PoiCarga(Base):
    __tablename__ = "poi_cargas"
    __table_args__ = (
        UniqueConstraint("mes", "anio", name="uq_poi_mes_anio"),
    )

    id            = Column(String(36),        primary_key=True, default=_new_id)
    mes           = Column(Integer,           nullable=False)
    anio          = Column(Integer,           nullable=False)
    nombreArchivo = Column(_qn('nombreArchivo'), String(300), nullable=True)
    totalFilas    = Column(_qn('totalFilas'),    Integer,     nullable=True)
    cargadoPor    = Column(_qn('cargadoPor'),    String(200), nullable=True)
    createdAt     = Column(_qn('createdAt'),     DateTime,    default=datetime.utcnow)

    datos = relationship("PoiDato", back_populates="carga", cascade="all, delete-orphan")


class PoiDato(Base):
    __tablename__ = "poi_datos"

    id           = Column(String(36),        primary_key=True, default=_new_id)
    cargaId      = Column(_qn('cargaId'),     String(36),   ForeignKey("poi_cargas.id", ondelete="CASCADE"), nullable=False)
    centroCosto  = Column(_qn('centroCosto'), String(300),  nullable=True)
    actividadOp  = Column(_qn('actividadOp'), String(1000), nullable=True)
    departamento = Column(String(200),        nullable=True)
    codAO        = Column(_qn('codAO'),       String(100),  nullable=True)
    datos        = Column(Text,               nullable=True)  # JSON con las 277 columnas del Excel

    carga = relationship("PoiCarga", back_populates="datos")
