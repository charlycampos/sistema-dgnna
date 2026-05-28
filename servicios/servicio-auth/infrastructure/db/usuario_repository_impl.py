from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.usuario import Usuario, UsuarioModulo
from domain.ports.usuario_repository import UsuarioRepository
from infrastructure.db.models import UsuarioModel, UsuarioModuloModel


class UsuarioRepositoryImpl(UsuarioRepository):

    def __init__(self, db: Session):
        self._db = db

    def listar(self) -> List[Usuario]:
        return [self._to_entity(m) for m in self._db.query(UsuarioModel).order_by(UsuarioModel.createdAt).all()]

    def obtener_por_id(self, id: str) -> Optional[Usuario]:
        m = self._db.query(UsuarioModel).filter(UsuarioModel.id == id).first()
        return self._to_entity(m) if m else None

    def obtener_por_email(self, email: str) -> Optional[Usuario]:
        m = self._db.query(UsuarioModel).filter(UsuarioModel.email == email).first()
        return self._to_entity(m) if m else None

    def guardar(self, usuario: Usuario) -> Usuario:
        model = UsuarioModel(
            id           = usuario.id,
            nombre       = usuario.nombre,
            email        = usuario.email,
            passwordHash = usuario.passwordHash,
            rol          = usuario.rol,
            activo       = usuario.activo,
        )
        self._db.add(model)
        self._db.flush()

        for m in usuario.modulos:
            self._db.add(UsuarioModuloModel(
                id        = m.id,
                usuarioId = usuario.id,
                modulo    = m.modulo,
                rolModulo = m.rolModulo,
            ))

        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e

        return self._to_entity(model)

    def actualizar(self, usuario: Usuario) -> Usuario:
        model = self._db.query(UsuarioModel).filter(UsuarioModel.id == usuario.id).first()
        if not model:
            raise ValueError(f"Usuario {usuario.id} no encontrado en BD")

        model.nombre       = usuario.nombre
        model.email        = usuario.email
        model.passwordHash = usuario.passwordHash
        model.rol          = usuario.rol
        model.activo       = usuario.activo
        model.updatedAt    = datetime.utcnow()

        # Reemplazar módulos
        self._db.query(UsuarioModuloModel).filter(UsuarioModuloModel.usuarioId == usuario.id).delete()
        for m in usuario.modulos:
            self._db.add(UsuarioModuloModel(
                usuarioId = usuario.id,
                modulo    = m.modulo,
                rolModulo = m.rolModulo,
            ))

        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e

        return self._to_entity(model)

    def eliminar(self, id: str) -> bool:
        model = self._db.query(UsuarioModel).filter(UsuarioModel.id == id).first()
        if not model:
            return False
        self._db.delete(model)
        self._db.commit()
        return True

    @staticmethod
    def _to_entity(m: UsuarioModel) -> Usuario:
        return Usuario(
            id           = m.id,
            nombre       = m.nombre,
            email        = m.email,
            passwordHash = m.passwordHash,
            rol          = m.rol,
            activo       = m.activo,
            createdAt    = m.createdAt,
            updatedAt    = m.updatedAt,
            modulos      = [
                UsuarioModulo(id=mod.id, usuarioId=mod.usuarioId, modulo=mod.modulo, rolModulo=mod.rolModulo)
                for mod in m.modulos
            ],
        )
