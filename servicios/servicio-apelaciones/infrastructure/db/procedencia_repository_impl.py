from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.procedencia import Procedencia
from domain.ports.procedencia_repository import ProcedenciaRepository
from infrastructure.db.models import ProcedenciaModel


class ProcedenciaRepositoryImpl(ProcedenciaRepository):

    def __init__(self, db: Session):
        self._db = db

    def _to_entity(self, m: ProcedenciaModel) -> Procedencia:
        return Procedencia(id=m.id, nombre=m.nombre, activo=m.activo)

    def listar(self) -> List[Procedencia]:
        return [
            self._to_entity(m)
            for m in self._db.query(ProcedenciaModel).order_by(ProcedenciaModel.nombre).all()
        ]

    def obtener_por_id(self, id: str) -> Optional[Procedencia]:
        m = self._db.query(ProcedenciaModel).filter(ProcedenciaModel.id == id).first()
        return self._to_entity(m) if m else None

    def guardar(self, p: Procedencia) -> Procedencia:
        m = ProcedenciaModel(id=p.id, nombre=p.nombre, activo=p.activo)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def actualizar(self, p: Procedencia) -> Procedencia:
        m = self._db.query(ProcedenciaModel).filter(ProcedenciaModel.id == p.id).first()
        if not m:
            raise ValueError(f"Procedencia {p.id} no encontrada")
        m.nombre = p.nombre
        m.activo = p.activo
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def eliminar(self, id: str) -> None:
        m = self._db.query(ProcedenciaModel).filter(ProcedenciaModel.id == id).first()
        if m:
            self._db.delete(m)
            self._db.commit()
