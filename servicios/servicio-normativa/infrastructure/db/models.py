"""
Modelos SQLAlchemy para el microservicio de Consulta Normativa.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, LargeBinary,
    DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


class DocumentoNormativoModel(Base):
    __tablename__ = "DOCUMENTOS_NORMATIVOS"

    id = Column("ID", Integer, primary_key=True, autoincrement=True)
    codigo = Column("CODIGO", String(60), unique=True, nullable=False, index=True)
    nombre = Column("NOMBRE", String(400), nullable=False)
    tipo = Column("TIPO", String(40), nullable=False)  # DECRETO_LEGISLATIVO, REGLAMENTO, DIRECTIVA, CONVENIO
    fechaPublicacion = Column("FECHA_PUBLICACION", String(30), nullable=True)
    versionCorpus = Column("VERSION_CORPUS", String(20), default="2026.1", nullable=False)
    archivoOrigen = Column("ARCHIVO_ORIGEN", String(300), nullable=True)
    estado = Column("ESTADO", String(20), default="PUBLICADO", nullable=False)
    totalArticulos = Column("TOTAL_ARTICULOS", Integer, default=0, nullable=False)
    createdAt = Column("CREATED_AT", DateTime, default=datetime.utcnow, nullable=False)

    unidades = relationship("UnidadNormativaModel", back_populates="documento", cascade="all, delete-orphan", order_by="UnidadNormativaModel.orden")


class UnidadNormativaModel(Base):
    __tablename__ = "UNIDADES_NORMATIVAS"

    id = Column("ID", Integer, primary_key=True, autoincrement=True)
    documentoId = Column("DOCUMENTO_ID", Integer, ForeignKey("DOCUMENTOS_NORMATIVOS.ID", ondelete="CASCADE"), nullable=False, index=True)
    referencia = Column("REFERENCIA", String(100), unique=True, nullable=False, index=True)  # ej: dl1297-art45, reg1297-art81
    libro = Column("LIBRO", String(150), nullable=True)
    titulo = Column("TITULO", String(200), nullable=True)
    capitulo = Column("CAPITULO", String(200), nullable=True)
    articulo = Column("ARTICULO", String(30), nullable=True, index=True)
    numeral = Column("NUMERAL", String(30), nullable=True)
    literal = Column("LITERAL", String(20), nullable=True)
    sumilla = Column("SUMILLA", String(500), nullable=True)
    texto = Column("TEXTO", Text, nullable=False)
    vigente = Column("VIGENTE", Integer, default=1, nullable=False)  # 1 = Vigente, 0 = Derogado
    modificadoPor = Column("MODIFICADO_POR", String(150), nullable=True)
    paginaPdf = Column("PAGINA_PDF", Integer, nullable=True)
    orden = Column("ORDEN", Integer, default=0, nullable=False)
    embedding = Column("EMBEDDING", LargeBinary, nullable=True)
    embeddingModelo = Column("EMBEDDING_MODELO", String(80), nullable=True)
    fechaIndexacion = Column("FECHA_INDEXACION", DateTime, default=datetime.utcnow, nullable=False)

    documento = relationship("DocumentoNormativoModel", back_populates="unidades")


class ConsultaIAModel(Base):
    __tablename__ = "CONSULTAS_IA"

    id = Column("ID", Integer, primary_key=True, autoincrement=True)
    usuarioId = Column("USUARIO_ID", String(80), nullable=True)
    usuarioNombre = Column("USUARIO_NOMBRE", String(150), nullable=True)
    pregunta = Column("PREGUNTA", Text, nullable=False)
    respuesta = Column("RESPUESTA", Text, nullable=False)
    unidadesCitadas = Column("UNIDADES_CITADAS", String(500), nullable=True)  # Referencias separadas por coma
    proveedor = Column("PROVEEDOR", String(40), default="openai", nullable=False)  # openai | gemini | claude
    modelo = Column("MODELO", String(60), nullable=True)
    versionCorpus = Column("VERSION_CORPUS", String(20), default="2026.1", nullable=False)
    latenciaMs = Column("LATENCIA_MS", Integer, default=0, nullable=False)
    tokensEntrada = Column("TOKENS_ENTRADA", Integer, default=0, nullable=False)
    tokensSalida = Column("TOKENS_SALIDA", Integer, default=0, nullable=False)
    feedback = Column("FEEDBACK", String(30), nullable=True)  # util | inexacta | sin_sustento
    verificado = Column("VERIFICADO", Integer, default=1, nullable=False)  # 1 = Citas verificadas
    createdAt = Column("CREATED_AT", DateTime, default=datetime.utcnow, nullable=False)


class ConfiguracionIAModel(Base):
    __tablename__ = "CONFIGURACION_IA"

    id = Column("ID", Integer, primary_key=True, autoincrement=True)
    proveedor = Column("PROVEEDOR", String(40), unique=True, nullable=False, index=True)  # deepseek | gemini | openai | claude
    nombreDisplay = Column("NOMBRE_DISPLAY", String(100), nullable=False)
    apiKey = Column("API_KEY", String(400), nullable=True)
    modeloDefecto = Column("MODELO_DEFECTO", String(80), nullable=True)
    activo = Column("ACTIVO", Integer, default=1, nullable=False)  # 1 = Habilitado, 0 = Deshabilitado
    updatedBy = Column("UPDATED_BY", String(100), nullable=True)
    updatedAt = Column("UPDATED_AT", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ParametroNormativaModel(Base):
    __tablename__ = "PARAMETROS_NORMATIVA"

    id = Column("ID", Integer, primary_key=True, autoincrement=True)
    clave = Column("CLAVE", String(60), unique=True, nullable=False, index=True)
    valor = Column("VALOR", String(200), nullable=False)
    descripcion = Column("DESCRIPCION", String(300), nullable=True)
    updatedAt = Column("UPDATED_AT", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

