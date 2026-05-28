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
    service = get_service(db)
    try:
        entidad = service.registrar(body.model_dump())
        return _query_con_relaciones(db).filter(ApelacionModel.id == entidad.id).first()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al registrar apelación")


@router.put("/{id}", response_model=ApelacionOut)
def actualizar(id: str, body: ApelacionUpdate, db: Session = Depends(get_db)):
    service = get_service(db)
    try:
        entidad = service.actualizar(id, body.model_dump())
        return _query_con_relaciones(db).filter(ApelacionModel.id == entidad.id).first()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al actualizar apelación")


@router.delete("/{id}")
def eliminar(id: str, service: ApelacionService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
