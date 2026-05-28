"""Router de procedencias — adaptador HTTP."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.procedencia_repository_impl import ProcedenciaRepositoryImpl
from infrastructure.api.schemas import ProcedenciaCreate, ProcedenciaUpdate, ProcedenciaOut
from domain.services.procedencia_service import ProcedenciaService

router = APIRouter(prefix="/api/procedencia", tags=["procedencia"])


def get_service(db: Session = Depends(get_db)) -> ProcedenciaService:
    return ProcedenciaService(repo=ProcedenciaRepositoryImpl(db))


@router.get("", response_model=List[ProcedenciaOut])
def listar(service: ProcedenciaService = Depends(get_service)):
    return service.listar()


@router.get("/{id}", response_model=ProcedenciaOut)
def obtener(id: str, service: ProcedenciaService = Depends(get_service)):
    try:
        return service.obtener(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=ProcedenciaOut, status_code=201)
def crear(body: ProcedenciaCreate, service: ProcedenciaService = Depends(get_service)):
    try:
        return service.crear(body.model_dump())
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="Esa procedencia ya existe")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=ProcedenciaOut)
def actualizar(id: str, body: ProcedenciaUpdate, service: ProcedenciaService = Depends(get_service)):
    try:
        return service.actualizar(id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="Esa procedencia ya existe")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: ProcedenciaService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
