from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from infrastructure.db.database import Base

class TableroModel(Base):
    __tablename__ = "tableros_direccion"

    id = Column(String(50), primary_key=True, index=True)
    codigo_direccion = Column(String(10), nullable=False, index=True) # DSLD, DPNNA, DPE, DA
    titulo = Column(String(200), nullable=False)
    subtitulo = Column(String(300), nullable=True)
    tipo = Column(String(20), default="powerbi", nullable=False)     # powerbi, proximamente
    url_embed = Column(Text, nullable=True)
    descripcion = Column(Text, nullable=True)
    responsable = Column(String(150), nullable=True)
    estado = Column(String(20), default="activo", nullable=False)    # activo, desarrollo, planificado
    orden = Column(Integer, default=1, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    es_personalizado = Column(Boolean, default=False, nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow, nullable=False)
