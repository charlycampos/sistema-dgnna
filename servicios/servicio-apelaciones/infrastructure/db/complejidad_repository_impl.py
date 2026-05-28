from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.complejidad import ComplejidadJuridica
from domain.entities.extension_rango import ExtensionRango
from domain.ports.complejidad_repository import ComplejidadRepository
from infrastructure.db.models import ComplejidadModel, ExtensionRangoModel


class ComplejidadRepositoryImpl(ComplejidadRepository):

    def __init__(self, db: Session):
        self._db = db

    # ── mappers ───────────────────────────────────────────────────────

    def _to_entity(self, m: ComplejidadModel) -> ComplejidadJuridica:
        return ComplejidadJuridica(id=m.id, nombre=m.nombre, puntos=m.puntos, activo=m.activo)

    # ── puerto ────────────────────────────────────────────────────────

    def obtener_por_id(self, id: str) -> Optional[ComplejidadJuridica]:
        m = self._db.query(ComplejidadModel).filter(ComplejidadModel.id == id).first()
        return self._to_entity(m) if m else None

    def listar(self) -> List[ComplejidadJuridica]:
        return [
            self._to_entity(m)
            for m in self._db.query(ComplejidadModel).order_by(ComplejidadModel.puntos).all()
        ]

    def listar_rangos(self) -> List[ExtensionRango]:
        modelos = self._db.query(ExtensionRangoModel).order_by(ExtensionRangoModel.minFolios).all()
        return [
            ExtensionRango(
                id=m.id,
                descripcion=m.descripcion,
                minFolios=m.minFolios,
                maxFolios=m.maxFolios,
                puntos=m.puntos,
                activo=m.activo,
            )
            for m in modelos
        ]

    def guardar(self, c: ComplejidadJuridica) -> ComplejidadJuridica:
        m = ComplejidadModel(id=c.id, nombre=c.nombre, puntos=c.puntos, activo=c.activo)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def actualizar(self, c: ComplejidadJuridica) -> ComplejidadJuridica:
        m = self._db.query(ComplejidadModel).filter(ComplejidadModel.id == c.id).first()
        if not m:
            raise ValueError(f"Complejidad {c.id} no encontrada")
        m.nombre = c.nombre
        m.puntos = c.puntos
        m.activo = c.activo
        self._db.commit()
        self._db.refresh(m)
        return self._to_entity(m)

    def eliminar(self, id: str) -> None:
        m = self._db.query(ComplejidadModel).filter(ComplejidadModel.id == id).first()
        if m:
            self._db.delete(m)
            self._db.commit()
