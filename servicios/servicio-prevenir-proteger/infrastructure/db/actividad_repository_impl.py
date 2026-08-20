from typing import List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from domain.entities.actividad import Actividad
from domain.ports.actividad_repository import ActividadRepository
from infrastructure.db.models import ActividadModel


class ActividadRepositoryImpl(ActividadRepository):
    def __init__(self, db: Session):
        self._db = db

    def listar(self, q=None, estado=None, tipo=None, departamento=None) -> List[Actividad]:
        query = self._db.query(ActividadModel)
        if q:
            patron = f"%{q.lower()}%"
            query = query.filter(or_(
                func.lower(ActividadModel.nombreActividad).like(patron),
                func.lower(ActividadModel.entidadAliada).like(patron),
                func.lower(ActividadModel.responsable).like(patron),
            ))
        if estado:
            query = query.filter(ActividadModel.estado == estado)
        if tipo:
            query = query.filter(ActividadModel.tipoActividad == tipo)
        if departamento:
            query = query.filter(ActividadModel.departamento == departamento)
        return [self._to_entity(m) for m in query.order_by(ActividadModel.fecha.desc()).all()]

    def obtener_por_id(self, id: str) -> Optional[Actividad]:
        model = self._db.query(ActividadModel).filter(ActividadModel.id == id).first()
        return self._to_entity(model) if model else None

    def guardar(self, actividad: Actividad) -> Actividad:
        model = ActividadModel(**self._values(actividad))
        self._db.add(model)
        return self._commit(model)

    def actualizar(self, actividad: Actividad) -> Actividad:
        model = self._db.query(ActividadModel).filter(ActividadModel.id == actividad.id).first()
        for campo, valor in self._values(actividad).items():
            setattr(model, campo, valor)
        return self._commit(model)

    def eliminar(self, id: str) -> bool:
        model = self._db.query(ActividadModel).filter(ActividadModel.id == id).first()
        if not model:
            return False
        self._db.delete(model)
        self._db.commit()
        return True

    def _commit(self, model: ActividadModel) -> Actividad:
        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception:
            self._db.rollback()
            raise
        return self._to_entity(model)

    @staticmethod
    def _values(a: Actividad) -> dict:
        return {
            "id": a.id, "codigo": a.codigo, "nombreActividad": a.nombreActividad,
            "tipoActividad": a.tipoActividad, "fecha": a.fecha,
            "departamento": a.departamento, "provincia": a.provincia,
            "distrito": a.distrito, "entidadAliada": a.entidadAliada,
            "modalidad": a.modalidad, "publicoObjetivo": a.publicoObjetivo,
            "participantesMujeres": a.participantesMujeres,
            "participantesHombres": a.participantesHombres,
            "participantesOtros": a.participantesOtros,
            "responsable": a.responsable, "estado": a.estado,
            "observaciones": a.observaciones, "creadoPor": a.creadoPor,
            "createdAt": a.createdAt, "updatedAt": a.updatedAt,
        }

    @staticmethod
    def _to_entity(m: ActividadModel) -> Actividad:
        return Actividad(**{campo: getattr(m, campo) for campo in (
            "id", "codigo", "nombreActividad", "tipoActividad", "fecha",
            "departamento", "provincia", "distrito", "entidadAliada",
            "modalidad", "publicoObjetivo", "participantesMujeres",
            "participantesHombres", "participantesOtros", "responsable",
            "estado", "observaciones", "creadoPor", "createdAt", "updatedAt",
        )})
