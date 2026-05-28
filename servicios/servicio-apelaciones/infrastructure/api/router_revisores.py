"""Router de revisores — adaptador HTTP."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from infrastructure.db.database import get_db
from infrastructure.db.revisor_repository_impl import RevisorRepositoryImpl
from infrastructure.db.models import RevisorModel, ApelacionModel
from infrastructure.api.schemas import RevisorCreate, RevisorUpdate, RevisorOut
from domain.services.revisor_service import RevisorService

router = APIRouter(prefix="/api/revisores", tags=["revisores"])


def get_service(db: Session = Depends(get_db)) -> RevisorService:
    return RevisorService(repo=RevisorRepositoryImpl(db))


@router.get("/carga")
def carga_por_revisor(db: Session = Depends(get_db)):
    """Cantidad de casos por revisor activo."""
    revisores = db.query(RevisorModel).filter(RevisorModel.activo == True).order_by(RevisorModel.nombre).all()
    apelaciones = db.query(ApelacionModel.revisorId, ApelacionModel.estado).all()

    resultado = []
    for rv in revisores:
        aps = [a for a in apelaciones if a.revisorId == rv.id]
        resultado.append({
            "revisorId":       rv.id,
            "nombre":          rv.nombre,
            "totalCasos":      len(aps),
            "casosPendientes": sum(1 for a in aps if a.estado == "Pendiente"),
            "casosResueltos":  sum(1 for a in aps if a.estado == "Resuelto"),
            "casosAtendidos":  sum(1 for a in aps if a.estado == "Atendido"),
        })
    return resultado


@router.get("", response_model=List[RevisorOut])
def listar(service: RevisorService = Depends(get_service)):
    return service.listar()


@router.get("/{id}", response_model=RevisorOut)
def obtener(id: str, service: RevisorService = Depends(get_service)):
    try:
        return service.obtener(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=RevisorOut, status_code=201)
def crear(body: RevisorCreate, service: RevisorService = Depends(get_service)):
    try:
        return service.crear(body.model_dump())
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="Ese revisor ya existe")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=RevisorOut)
def actualizar(id: str, body: RevisorUpdate, service: RevisorService = Depends(get_service)):
    try:
        return service.actualizar(id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: RevisorService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
