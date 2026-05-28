from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.revisor import Revisor
from domain.ports.revisor_repository import RevisorRepository
from infrastructure.db.models import RevisorModel


class RevisorRepositoryImpl(RevisorRepository):

    def __init__(self, db: Session):
        self._db = db

    def _to_entity(self, m: RevisorModel) -> Revisor:
        return Revisor(id=m.id, nombre=m.nombre, activo=m.activo)

    def listar(self) -> List[Revisor]:
        return [
            self._to_entity(m)
            for m in self._db.query(RevisorModel).order_by(RevisorModel.nombre).all()
        ]

    def obtener_por_id(self, id: str) -> Optional[Revisor]:
        m = self._db.query(RevisorModel).filter(RevisorModel.id == id).first()
        return self._to_entity(m) if m else None

    def guardar(self, r: Revisor) -> Revisor:
        m = RevisorModel(id=r.id, nombre=r.nombre, activo=r.activo)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def actualizar(self, r: Revisor) -> Revisor:
        m = self._db.query(RevisorModel).filter(RevisorModel.id == r.id).first()
        if not m:
            raise ValueError(f"Revisor {r.id} no encontrado")
        m.nombre = r.nombre
        m.activo = r.activo
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def eliminar(self, id: str) -> None:
        m = self._db.query(RevisorModel).filter(RevisorModel.id == id).first()
        if m:
            self._db.delete(m)
            self._db.commit()
