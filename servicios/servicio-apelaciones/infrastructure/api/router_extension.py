"""Router de rangos de extensión — adaptador HTTP."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.extension_repository_impl import ExtensionRepositoryImpl
from infrastructure.api.schemas import ExtensionCreate, ExtensionUpdate, ExtensionOut
from domain.services.extension_service import ExtensionService

router = APIRouter(prefix="/api/extension", tags=["extension"])


def get_service(db: Session = Depends(get_db)) -> ExtensionService:
    return ExtensionService(repo=ExtensionRepositoryImpl(db))


@router.get("", response_model=List[ExtensionOut])
def listar(service: ExtensionService = Depends(get_service)):
    return service.listar()


@router.get("/{id}", response_model=ExtensionOut)
def obtener(id: str, service: ExtensionService = Depends(get_service)):
    try:
        return service.obtener(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=ExtensionOut, status_code=201)
def crear(body: ExtensionCreate, service: ExtensionService = Depends(get_service)):
    try:
        return service.crear(body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=ExtensionOut)
def actualizar(id: str, body: ExtensionUpdate, service: ExtensionService = Depends(get_service)):
    try:
        return service.actualizar(id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: ExtensionService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
