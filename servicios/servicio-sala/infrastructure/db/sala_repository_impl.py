from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from domain.entities.reserva_sala import ReservaSala
from domain.ports.sala_repository import SalaRepository
from infrastructure.db.models import ReservaSalaModel


class SalaRepositoryImpl(SalaRepository):

    def __init__(self, db: Session):
        self._db = db

    def listar(self, mes=None, estado=None, categoria=None) -> List[ReservaSala]:
        q = self._db.query(ReservaSalaModel)
        if mes:       q = q.filter(ReservaSalaModel.fecha.startswith(mes))
        if estado:    q = q.filter(ReservaSalaModel.estado == estado)
        if categoria: q = q.filter(ReservaSalaModel.categoria == categoria)
        return [self._to_entity(m) for m in q.order_by(ReservaSalaModel.fecha, ReservaSalaModel.horaInicio).all()]

    def obtener_por_id(self, id: str) -> Optional[ReservaSala]:
        m = self._db.query(ReservaSalaModel).filter(ReservaSalaModel.id == id).first()
        return self._to_entity(m) if m else None

    def listar_por_fecha(self, fecha: str, excluir_id: Optional[str] = None) -> List[ReservaSala]:
        q = self._db.query(ReservaSalaModel).filter(
            ReservaSalaModel.fecha == fecha,
            ReservaSalaModel.estado != "Cancelado",
        )
        if excluir_id:
            q = q.filter(ReservaSalaModel.id != excluir_id)
        return [self._to_entity(m) for m in q.all()]

    def guardar(self, reserva: ReservaSala) -> ReservaSala:
        model = ReservaSalaModel(
            id=reserva.id, fecha=reserva.fecha, titulo=reserva.titulo,
            horaInicio=reserva.horaInicio, horaFin=reserva.horaFin,
            categoria=reserva.categoria, estado=reserva.estado,
            descripcion=reserva.descripcion, creadoPor=reserva.creadoPor,
        )
        self._db.add(model)
        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e
        return self._to_entity(model)

    def actualizar(self, reserva: ReservaSala) -> ReservaSala:
        model = self._db.query(ReservaSalaModel).filter(ReservaSalaModel.id == reserva.id).first()
        model.fecha       = reserva.fecha
        model.titulo      = reserva.titulo
        model.horaInicio  = reserva.horaInicio
        model.horaFin     = reserva.horaFin
        model.categoria   = reserva.categoria
        model.estado      = reserva.estado
        model.descripcion = reserva.descripcion
        model.updatedAt   = datetime.utcnow()
        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e
        return self._to_entity(model)

    def eliminar(self, id: str) -> bool:
        m = self._db.query(ReservaSalaModel).filter(ReservaSalaModel.id == id).first()
        if not m: return False
        self._db.delete(m)
        self._db.commit()
        return True

    @staticmethod
    def _to_entity(m: ReservaSalaModel) -> ReservaSala:
        return ReservaSala(
            id=m.id, fecha=m.fecha, titulo=m.titulo,
            horaInicio=m.horaInicio, horaFin=m.horaFin,
            categoria=m.categoria, estado=m.estado,
            descripcion=m.descripcion, creadoPor=m.creadoPor,
            createdAt=m.createdAt, updatedAt=m.updatedAt,
        )
