"""
Adaptador de entrada HTTP — FastAPI router de apelaciones.
Devuelve los modelos SQLAlchemy con relaciones cargadas (abogado, complejidad).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from infrastructure.db.database import get_db
from infrastructure.db.models import ApelacionModel
from infrastructure.db.apelacion_repository_impl import ApelacionRepositoryImpl
from infrastructure.db.complejidad_repository_impl import ComplejidadRepositoryImpl
from infrastructure.api.schemas import ApelacionCreate, ApelacionUpdate, ApelacionOut
from domain.services.apelacion_service import ApelacionService
from infrastructure.api.audit_client import registrar_auditoria
from infrastructure.services.asignacion_nueva_service import AsignacionNuevaService

router = APIRouter(prefix="/api/apelaciones", tags=["apelaciones"])


def get_service(db: Session = Depends(get_db)) -> ApelacionService:
    return ApelacionService(
        apelacion_repo=ApelacionRepositoryImpl(db),
        complejidad_repo=ComplejidadRepositoryImpl(db),
    )


def _query_con_relaciones(db: Session):
    """Query base que carga abogado, complejidad, revisor, apelantes y nnas en el mismo SELECT."""
    return db.query(ApelacionModel).options(
        selectinload(ApelacionModel.abogado),
        selectinload(ApelacionModel.complejidad),
        selectinload(ApelacionModel.revisor),
        selectinload(ApelacionModel.apelantes),
        selectinload(ApelacionModel.nnas),
    )


@router.get("", response_model=List[ApelacionOut])
def listar(
    estado:    Optional[str] = Query(None),
    abogadoId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = _query_con_relaciones(db)
    if estado:
        q = q.filter(ApelacionModel.estado == estado)
    if abogadoId:
        q = q.filter(ApelacionModel.abogadoId == abogadoId)
    return q.order_by(ApelacionModel.fechaIngreso.desc()).all()


@router.get("/{id}", response_model=ApelacionOut)
def obtener(id: str, db: Session = Depends(get_db)):
    m = _query_con_relaciones(db).filter(ApelacionModel.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Apelación no encontrada")
    return m


@router.post("", response_model=ApelacionOut, status_code=201)
def crear(body: ApelacionCreate, db: Session = Depends(get_db)):
    try:
        # El abogado enviado por el navegador es solo una propuesta visual.
        # La decisión definitiva se recalcula bajo bloqueo en Oracle.
        entidad = AsignacionNuevaService(db).registrar(body.model_dump())
        res = _query_con_relaciones(db).filter(ApelacionModel.id == entidad.id).first()
        registrar_auditoria(
            modulo="apelaciones",
            tabla="apelaciones",
            registro_id=entidad.id,
            codigo_referencia=body.numeroExpediente,
            accion="CREAR",
            campos_cambiados=", ".join(body.model_dump().keys()),
            valores_nuevos={
                **body.model_dump(exclude={"fechaCambioResuelto"}),
                "fechaCambioResuelto": entidad.fechaCambioResuelto,
            },
            usuario_nombre="Especialista Apelaciones"
        )
        db.commit()
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al registrar apelación")


@router.put("/{id}", response_model=ApelacionOut)
def actualizar(id: str, body: ApelacionUpdate, db: Session = Depends(get_db)):
    service = get_service(db)
    try:
        ap_anterior = db.query(ApelacionModel).filter(ApelacionModel.id == id).first()
        previos = {k: getattr(ap_anterior, k, None) for k in body.model_dump().keys()} if ap_anterior else None
        
        entidad = service.actualizar(id, body.model_dump())
        # Reasignación: la cuenta de la nueva modalidad sigue al abogado actual.
        AsignacionNuevaService(db).sincronizar(id, body.abogadoId, body.complejidadId, body.folios)
        db.commit()
        res = _query_con_relaciones(db).filter(ApelacionModel.id == entidad.id).first()
        
        registrar_auditoria(
            modulo="apelaciones",
            tabla="apelaciones",
            registro_id=entidad.id,
            codigo_referencia=body.numeroExpediente or (ap_anterior.numeroExpediente if ap_anterior else id),
            accion="MODIFICAR",
            campos_cambiados=", ".join(body.model_dump().keys()),
            valores_previos=previos,
            valores_nuevos={
                **body.model_dump(exclude={"fechaCambioResuelto"}),
                "fechaCambioResuelto": entidad.fechaCambioResuelto,
            },
            usuario_nombre="Especialista Apelaciones"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al actualizar apelación")


@router.delete("/{id}")
def eliminar(id: str, db: Session = Depends(get_db)):
    service = get_service(db)
    try:
        # Primero se quita su evento de asignación (FK); el commit lo hace el repositorio.
        AsignacionNuevaService(db).quitar(id)
        service.eliminar(id)
        registrar_auditoria(
            modulo="apelaciones",
            tabla="apelaciones",
            registro_id=id,
            accion="ELIMINAR",
            usuario_nombre="Especialista Apelaciones"
        )
        return {"success": True}
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
