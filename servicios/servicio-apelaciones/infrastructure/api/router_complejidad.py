"""Router de complejidades jurídicas — adaptador HTTP."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.complejidad_repository_impl import ComplejidadRepositoryImpl
from infrastructure.api.schemas import ComplejidadCreate, ComplejidadUpdate, ComplejidadOut
from domain.services.complejidad_service import ComplejidadService

router = APIRouter(prefix="/api/complejidad", tags=["complejidad"])


def get_service(db: Session = Depends(get_db)) -> ComplejidadService:
    return ComplejidadService(repo=ComplejidadRepositoryImpl(db))


@router.get("", response_model=List[ComplejidadOut])
def listar(service: ComplejidadService = Depends(get_service)):
    return service.listar()


@router.get("/{id}", response_model=ComplejidadOut)
def obtener(id: str, service: ComplejidadService = Depends(get_service)):
    try:
        return service.obtener(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=ComplejidadOut, status_code=201)
def crear(body: ComplejidadCreate, service: ComplejidadService = Depends(get_service)):
    try:
        return service.crear(body.model_dump())
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="Nombre de complejidad ya existe")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=ComplejidadOut)
def actualizar(id: str, body: ComplejidadUpdate, service: ComplejidadService = Depends(get_service)):
    try:
        return service.actualizar(id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: ComplejidadService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
