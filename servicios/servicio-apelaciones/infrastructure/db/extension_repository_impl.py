from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.extension_rango import ExtensionRango
from domain.ports.extension_repository import ExtensionRepository
from infrastructure.db.models import ExtensionRangoModel


class ExtensionRepositoryImpl(ExtensionRepository):

    def __init__(self, db: Session):
        self._db = db

    def _to_entity(self, m: ExtensionRangoModel) -> ExtensionRango:
        return ExtensionRango(
            id=m.id,
            descripcion=m.descripcion,
            minFolios=m.minFolios,
            maxFolios=m.maxFolios,
            puntos=m.puntos,
            activo=m.activo,
        )

    def _to_model(self, r: ExtensionRango) -> ExtensionRangoModel:
        return ExtensionRangoModel(
            id=r.id,
            descripcion=r.descripcion,
            minFolios=r.minFolios,
            maxFolios=r.maxFolios,
            puntos=r.puntos,
            activo=r.activo,
        )

    def listar(self) -> List[ExtensionRango]:
        return [
            self._to_entity(m)
            for m in self._db.query(ExtensionRangoModel).order_by(ExtensionRangoModel.minFolios).all()
        ]

    def obtener_por_id(self, id: str) -> Optional[ExtensionRango]:
        m = self._db.query(ExtensionRangoModel).filter(ExtensionRangoModel.id == id).first()
        return self._to_entity(m) if m else None

    def guardar(self, r: ExtensionRango) -> ExtensionRango:
        m = self._to_model(r)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def actualizar(self, r: ExtensionRango) -> ExtensionRango:
        m = self._db.query(ExtensionRangoModel).filter(ExtensionRangoModel.id == r.id).first()
        if not m:
            raise ValueError(f"Rango {r.id} no encontrado")
        m.descripcion = r.descripcion
        m.minFolios   = r.minFolios
        m.maxFolios   = r.maxFolios
        m.puntos      = r.puntos
        m.activo      = r.activo
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def eliminar(self, id: str) -> None:
        m = self._db.query(ExtensionRangoModel).filter(ExtensionRangoModel.id == id).first()
        if m:
            self._db.delete(m)
            self._db.commit()
