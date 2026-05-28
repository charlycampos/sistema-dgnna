import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


def _new_id(): return str(uuid.uuid4())


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id           = Column("id",           String(36), primary_key=True, default=_new_id)
    nombre       = Column("nombre",       String(200), nullable=False)
    email        = Column("email",        String(200), nullable=False, unique=True)
    passwordHash = Column("passwordhash", String(200), nullable=False)
    rol          = Column("rol",          String(20), default="usuario")
    activo       = Column("activo",       Boolean, default=True)
    createdAt    = Column("createdat",    DateTime, default=datetime.utcnow)
    updatedAt    = Column("updatedat",    DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    modulos = relationship("UsuarioModuloModel", back_populates="usuario", cascade="all, delete-orphan")


class UsuarioModuloModel(Base):
    __tablename__ = "usuario_modulos"

    id        = Column("id",        String(36), primary_key=True, default=_new_id)
    usuarioId = Column("usuarioid", String(36), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    modulo    = Column("modulo",    String(50), nullable=False)
    rolModulo = Column("rolmodulo", String(50), nullable=False)

    usuario = relationship("UsuarioModel", back_populates="modulos")

    __table_args__ = (
        UniqueConstraint("usuarioid", "modulo", name="uq_usuario_modulo"),
    )
