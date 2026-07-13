import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql.elements import quoted_name
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())

# Nombres Oracle case-sensitive (creados con comillas dobles)
_qn = lambda s: quoted_name(s, True)


class MapaUbigeo(Base):
    """Catálogo UBIGEO INEI: departamentos, provincias y distritos."""
    __tablename__ = "mapa_ubigeo"

    codigo       = Column(String(6), primary_key=True)   # DDPPDD
    departamento = Column(String(2), nullable=False)     # DD
    provincia    = Column(String(2), nullable=False)     # PP ('00' = fila departamento)
    distrito     = Column(String(2), nullable=False)     # DD ('00' = fila provincia)
    nombre       = Column(String(200), nullable=False)

    __table_args__ = (Index("ix_mapa_ubigeo_dep_prov", "departamento", "provincia"),)


class MapaInstitucion(Base):
    """Institución con presencia territorial (UPE, CAR, DEMUNA, etc.)."""
    __tablename__ = "mapa_instituciones"

    id           = Column(String(36),  primary_key=True, default=_new_id)
    nombre       = Column(String(300), nullable=False)
    tipo         = Column(String(100), nullable=False, default="UPE")
    direccion    = Column(String(500), nullable=True)
    departamento = Column(String(100), nullable=True)   # departamento de la sede
    telefono     = Column(String(200), nullable=True)
    horario      = Column(String(200), nullable=True)
    lat          = Column(Float, nullable=True)
    lng          = Column(Float, nullable=True)
    estado       = Column(String(20), nullable=False, default="activo")
    acreditacion = Column(String(50), nullable=True)   # Acreditada / No acreditada / Inoperativa (DEMUNA)
    creadoPor    = Column(_qn('creadoPor'), String(200), nullable=True)
    createdAt    = Column(_qn('createdAt'), DateTime, default=datetime.utcnow)
    updatedAt    = Column(_qn('updatedAt'), DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cobertura = relationship("MapaCobertura", back_populates="institucion", cascade="all, delete-orphan")


class MapaCobertura(Base):
    """Relación institución → distrito cubierto (por código ubigeo)."""
    __tablename__ = "mapa_cobertura"
    __table_args__ = (
        UniqueConstraint("institucionid", "ubigeo", name="uq_mapa_cob_inst_ubi"),
        Index("ix_mapa_cob_ubigeo", "ubigeo"),
    )

    id            = Column(String(36), primary_key=True, default=_new_id)
    institucionId = Column("institucionid", String(36),
                           ForeignKey("mapa_instituciones.id", ondelete="CASCADE"), nullable=False)
    ubigeo        = Column(String(6), nullable=False)   # código de distrito DDPPDD

    institucion = relationship("MapaInstitucion", back_populates="cobertura")
