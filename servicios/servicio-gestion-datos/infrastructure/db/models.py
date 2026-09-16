import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())


class DatasetModel(Base):
    __tablename__ = "datasets"

    id               = Column(String(36),   primary_key=True, default=_new_id)
    codigo           = Column(String(50),   nullable=False, unique=True)
    nombre           = Column(String(250),  nullable=False)
    descripcion      = Column(String(1000), nullable=True)
    direccionLinea   = Column("DIRECCION_LINEA", String(50),  nullable=False) # DPE, DA, DSLD, DPNNA, DGNNA
    tipoFuente       = Column("TIPO_FUENTE", String(50),  default="Sistema Interno") # Sistema Interno, Base de Datos, Excel/CSV, API
    frecuenciaAct    = Column("FRECUENCIA_ACT", String(50),  default="Mensual") # Diario, Semanal, Mensual, Trimestral, Anual
    formatoSalida    = Column("FORMATO_SALIDA", String(50),  default="Excel") # Excel, CSV, JSON, API
    responsable      = Column(String(200),  nullable=True)
    estado           = Column(String(20),   default="activo") # activo, inactivo, en_revision
    creadoPor        = Column("CREADO_POR", String(200),  nullable=True)
    createdAt        = Column("CREATED_AT", DateTime,     default=datetime.utcnow)
    updatedAt        = Column("UPDATED_AT", DateTime,     default=datetime.utcnow, onupdate=datetime.utcnow)

    campos = relationship("DiccionarioCampoModel", back_populates="dataset", cascade="all, delete-orphan")


class DiccionarioCampoModel(Base):
    __tablename__ = "diccionario_campos"

    id             = Column(String(36),  primary_key=True, default=_new_id)
    datasetId      = Column("DATASET_ID", String(36), ForeignKey("datasets.id"), nullable=False)
    nombreCampo    = Column("NOMBRE_CAMPO", String(100), nullable=False)
    tipoDato       = Column("TIPO_DATO", String(50),  nullable=False) # VARCHAR2, NUMBER, DATE, TIMESTAMP, BOOLEAN
    longitudMax    = Column("LONGITUD_MAX", Integer,     nullable=True)
    esObligatorio  = Column("ES_OBLIGATORIO", Integer,     default=0) # 0 = No, 1 = Sí
    descripcion    = Column(String(500), nullable=True)
    ejemplo        = Column(String(200), nullable=True)
    createdAt      = Column("CREATED_AT", DateTime,    default=datetime.utcnow)

    dataset = relationship("DatasetModel", back_populates="campos")
