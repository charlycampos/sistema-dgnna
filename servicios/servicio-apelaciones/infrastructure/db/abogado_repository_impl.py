from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.abogado import Abogado
from domain.ports.abogado_repository import AbogadoRepository
from infrastructure.db.models import AbogadoModel


class AbogadoRepositoryImpl(AbogadoRepository):

    def __init__(self, db: Session):
        self._db = db

    # ── mappers ───────────────────────────────────────────────────────

    def _to_entity(self, m: AbogadoModel) -> Abogado:
        return Abogado(
            id=m.id,
            nombre=m.nombre,
            activo=m.activo,
            createdAt=m.createdAt,
            updatedAt=m.updatedAt,
        )

    def _to_model(self, a: Abogado) -> AbogadoModel:
        return AbogadoModel(
            id=a.id,
            nombre=a.nombre,
            activo=a.activo,
        )

    # ── puerto ────────────────────────────────────────────────────────

    def listar(self, solo_activos: bool = False) -> List[Abogado]:
        q = self._db.query(AbogadoModel)
        if solo_activos:
            q = q.filter(AbogadoModel.activo == True)
        return [self._to_entity(m) for m in q.order_by(AbogadoModel.nombre).all()]

    def obtener_por_id(self, id: str) -> Optional[Abogado]:
        m = self._db.query(AbogadoModel).filter(AbogadoModel.id == id).first()
        return self._to_entity(m) if m else None

    def guardar(self, a: Abogado) -> Abogado:
        m = self._to_model(a)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def actualizar(self, a: Abogado) -> Abogado:
        m = self._db.query(AbogadoModel).filter(AbogadoModel.id == a.id).first()
        if not m:
            raise ValueError(f"Abogado {a.id} no encontrado")
        m.nombre = a.nombre
        m.activo = a.activo
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def eliminar(self, id: str) -> None:
        m = self._db.query(AbogadoModel).filter(AbogadoModel.id == id).first()
        if m:
            self._db.delete(m)
            self._db.commit()
