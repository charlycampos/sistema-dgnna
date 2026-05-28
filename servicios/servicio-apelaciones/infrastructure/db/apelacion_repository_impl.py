"""
Implementación concreta del repositorio de Apelaciones usando SQLAlchemy + Oracle.
Adapta entre la entidad de dominio y el modelo de base de datos.
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from domain.entities.apelacion import Apelacion
from domain.ports.apelacion_repository import ApelacionRepository
from infrastructure.db.models import ApelacionModel, ApelanteDetalleModel, NnaDetalleModel


class ApelacionRepositoryImpl(ApelacionRepository):

    def __init__(self, db: Session):
        self._db = db

    # ── Puerto → Implementación ───────────────────────────────────

    def listar(self, estado: Optional[str] = None, abogado_id: Optional[str] = None) -> List[Apelacion]:
        q = self._db.query(ApelacionModel)
        if estado:
            q = q.filter(ApelacionModel.estado == estado)
        if abogado_id:
            q = q.filter(ApelacionModel.abogadoId == abogado_id)
        return [self._to_entity(m) for m in q.order_by(ApelacionModel.createdAt.desc()).all()]

    def obtener_por_id(self, id: str) -> Optional[Apelacion]:
        model = self._db.query(ApelacionModel).filter(ApelacionModel.id == id).first()
        return self._to_entity(model) if model else None

    def guardar(self, apelacion: Apelacion) -> Apelacion:
        model = self._to_model(apelacion)
        self._db.add(model)
        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e
        return self._to_entity(model)

    def actualizar(self, apelacion: Apelacion) -> Apelacion:
        model = self._db.query(ApelacionModel).filter(ApelacionModel.id == apelacion.id).first()
        if not model:
            raise ValueError(f"Apelación {apelacion.id} no encontrada en BD")

        model.numeroExpediente  = apelacion.numeroExpediente
        model.fechaIngreso      = apelacion.fechaIngreso
        model.fechaIngresoMIMP  = apelacion.fechaIngresoMIMP
        model.plazoVencimiento  = apelacion.plazoVencimiento
        model.apelante          = apelacion.apelante
        model.nnaCar            = apelacion.nnaCar
        model.procedencia       = apelacion.procedencia
        model.documento         = apelacion.documento
        model.asunto            = apelacion.asunto
        model.folios            = apelacion.folios
        model.puntosExtension   = apelacion.puntosExtension
        model.complejidadId     = apelacion.complejidadId
        model.puntosComplejidad = apelacion.puntosComplejidad
        model.puntosTotal       = apelacion.puntosTotal
        model.abogadoId         = apelacion.abogadoId
        model.fechaAsignacion   = apelacion.fechaAsignacion
        model.estado            = apelacion.estado
        model.numeroResolucion  = apelacion.numeroResolucion
        model.documentoAtencion = apelacion.documentoAtencion
        model.cargos            = apelacion.cargos
        model.observaciones     = apelacion.observaciones
        model.revisorId         = apelacion.revisorId
        model.updatedAt         = datetime.utcnow()

        # Update child tables by clearing and adding new ones
        model.apelantes.clear()
        model.apelantes = [
            ApelanteDetalleModel(
                tipo=x.get("tipo"),
                nombres=x.get("nombres"),
                apellidoPaterno=x.get("apellidoPaterno"),
                apellidoMaterno=x.get("apellidoMaterno"),
                institucion=x.get("institucion"),
                documento=x.get("documento")
            ) for x in (apelacion.apelantes or [])
        ]

        model.nnas.clear()
        model.nnas = [
            NnaDetalleModel(
                tipo=x.get("tipo"),
                nombres=x.get("nombres"),
                primerApellido=x.get("primerApellido"),
                segundoApellido=x.get("segundoApellido"),
                edad=x.get("edad"),
                institucion=x.get("institucion")
            ) for x in (apelacion.nnas or [])
        ]

        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e
        return self._to_entity(model)

    def eliminar(self, id: str) -> bool:
        model = self._db.query(ApelacionModel).filter(ApelacionModel.id == id).first()
        if not model:
            return False
        self._db.delete(model)
        self._db.commit()
        return True

    # ── Mapeo dominio ↔ infraestructura ──────────────────────────

    @staticmethod
    def _to_entity(m: ApelacionModel) -> Apelacion:
        # Map child lists
        apelantes_list = []
        for x in (m.apelantes or []):
            apelantes_list.append({
                "id": x.id,
                "tipo": x.tipo,
                "nombres": x.nombres,
                "apellidoPaterno": x.apellidoPaterno,
                "apellidoMaterno": x.apellidoMaterno,
                "institucion": x.institucion,
                "documento": x.documento
            })

        nnas_list = []
        for x in (m.nnas or []):
            nnas_list.append({
                "id": x.id,
                "tipo": x.tipo,
                "nombres": x.nombres,
                "primerApellido": x.primerApellido,
                "segundoApellido": x.segundoApellido,
                "edad": x.edad,
                "institucion": x.institucion
            })

        return Apelacion(
            id                = m.id,
            numeroExpediente  = m.numeroExpediente,
            fechaIngreso      = m.fechaIngreso,
            fechaIngresoMIMP  = m.fechaIngresoMIMP,
            plazoVencimiento  = m.plazoVencimiento,
            apelante          = m.apelante,
            nnaCar            = m.nnaCar,
            procedencia       = m.procedencia,
            documento         = m.documento,
            asunto            = m.asunto,
            folios            = m.folios,
            puntosExtension   = m.puntosExtension,
            complejidadId     = m.complejidadId,
            puntosComplejidad = m.puntosComplejidad,
            puntosTotal       = m.puntosTotal,
            abogadoId         = m.abogadoId,
            fechaAsignacion   = m.fechaAsignacion,
            estado            = m.estado,
            numeroResolucion  = m.numeroResolucion,
            documentoAtencion = m.documentoAtencion,
            cargos            = m.cargos,
            observaciones     = m.observaciones,
            revisorId         = m.revisorId,
            apelantes         = apelantes_list,
            nnas              = nnas_list,
            createdAt         = m.createdAt,
            updatedAt         = m.updatedAt,
        )

    @staticmethod
    def _to_model(e: Apelacion) -> ApelacionModel:
        model = ApelacionModel(
            id                = e.id,
            numeroExpediente  = e.numeroExpediente,
            fechaIngreso      = e.fechaIngreso,
            fechaIngresoMIMP  = e.fechaIngresoMIMP,
            plazoVencimiento  = e.plazoVencimiento,
            apelante          = e.apelante,
            nnaCar            = e.nnaCar,
            procedencia       = e.procedencia,
            documento         = e.documento,
            asunto            = e.asunto,
            folios            = e.folios,
            puntosExtension   = e.puntosExtension,
            complejidadId     = e.complejidadId,
            puntosComplejidad = e.puntosComplejidad,
            puntosTotal       = e.puntosTotal,
            abogadoId         = e.abogadoId,
            fechaAsignacion   = e.fechaAsignacion,
            estado            = e.estado,
            numeroResolucion  = e.numeroResolucion,
            documentoAtencion = e.documentoAtencion,
            cargos            = e.cargos,
            observaciones     = e.observaciones,
        )
        # Map child lists
        model.apelantes = [
            ApelanteDetalleModel(
                tipo=x.get("tipo"),
                nombres=x.get("nombres"),
                apellidoPaterno=x.get("apellidoPaterno"),
                apellidoMaterno=x.get("apellidoMaterno"),
                institucion=x.get("institucion"),
                documento=x.get("documento")
            ) for x in (e.apelantes or [])
        ]
        model.nnas = [
            NnaDetalleModel(
                tipo=x.get("tipo"),
                nombres=x.get("nombres"),
                primerApellido=x.get("primerApellido"),
                segundoApellido=x.get("segundoApellido"),
                edad=x.get("edad"),
                institucion=x.get("institucion")
            ) for x in (e.nnas or [])
        ]
        return model
