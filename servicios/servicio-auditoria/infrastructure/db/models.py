"""
Modelos SQLAlchemy para el esquema AUDITORIA_DB.
Tabla: AUDITORIA_SISTEMA
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())


class AuditoriaLogModel(Base):
    __tablename__ = "auditoria_sistema"

    id               = Column("id",               String(36),   primary_key=True, default=_new_id)
    modulo           = Column("modulo",           String(50),   nullable=False, index=True)   # sustracion, apelaciones, proyectos-ley, etc.
    tablaAfectada    = Column("tablaafectada",    String(50),   nullable=False)               # casos_sustracion, apelaciones, etc.
    registroId       = Column("registroid",       String(100),  nullable=False, index=True)   # ID/UUID del registro modificado
    codigoReferencia = Column("codigoreferencia", String(100),  nullable=True, index=True)    # Ej: CASO-2026-0089, EXP-2026-0155
    accion           = Column("accion",           String(30),   nullable=False, index=True)   # CREAR, MODIFICAR, ELIMINAR, LOGIN, PERMISOS
    
    camposCambiados  = Column("camposcambiados",  String(1000), nullable=True)               # Lista de nombres de campos modificados
    valoresPrevios   = Column("valoresprevios",   Text,         nullable=True)               # JSON string de snapshot antes del cambio
    valoresNuevos    = Column("valoresnuevos",    Text,         nullable=True)               # JSON string de snapshot después del cambio
    
    usuarioId        = Column("usuarioid",        String(50),   nullable=False)
    usuarioNombre    = Column("usuarionombre",    String(200),  nullable=False)
    usuarioRol       = Column("usuariorol",       String(50),   nullable=True)
    ipOrigen         = Column("iporigen",         String(50),   nullable=True)
    
    createdAt        = Column("createdat",        DateTime,     default=datetime.utcnow, nullable=False, index=True)
