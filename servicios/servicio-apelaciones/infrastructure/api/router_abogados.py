"""Router de abogados — adaptador HTTP."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.abogado_repository_impl import AbogadoRepositoryImpl
from infrastructure.api.schemas import AbogadoCreate, AbogadoUpdate, AbogadoOut
from domain.services.abogado_service import AbogadoService

router = APIRouter(prefix="/api/abogados", tags=["abogados"])


def get_service(db: Session = Depends(get_db)) -> AbogadoService:
    return AbogadoService(repo=AbogadoRepositoryImpl(db))


@router.get("", response_model=List[AbogadoOut])
def listar(
    soloActivos: bool = Query(False),
    service: AbogadoService = Depends(get_service),
):
    return service.listar(solo_activos=soloActivos)


@router.get("/{id}", response_model=AbogadoOut)
def obtener(id: str, service: AbogadoService = Depends(get_service)):
    try:
        return service.obtener(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=AbogadoOut, status_code=201)
def crear(body: AbogadoCreate, service: AbogadoService = Depends(get_service)):
    try:
        return service.crear(body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=AbogadoOut)
def actualizar(id: str, body: AbogadoUpdate, service: AbogadoService = Depends(get_service)):
    try:
        return service.actualizar(id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: AbogadoService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
