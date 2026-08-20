import os
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from domain.services.actividad_service import ActividadService
from infrastructure.api.schemas import ActividadCreate, ActividadOut, ActividadUpdate
from infrastructure.db.actividad_repository_impl import ActividadRepositoryImpl
from infrastructure.db.database import get_db


router = APIRouter(prefix="/api/prevenir-proteger", tags=["prevenir-proteger"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/auth/login")


def get_service(db: Session = Depends(get_db)) -> ActividadService:
    return ActividadService(ActividadRepositoryImpl(db))


def get_usuario(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, os.getenv("SESSION_SECRET", ""), algorithms=["HS256"])
        return payload.get("nombre", "")
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Sesion invalida") from exc


def _out(a) -> dict:
    return {
        **a.__dict__,
        "totalParticipantes": a.totalParticipantes,
    }


@router.get("", response_model=List[ActividadOut])
def listar(
    q: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    service: ActividadService = Depends(get_service),
):
    return [_out(a) for a in service.listar(q=q, estado=estado, tipo=tipo, departamento=departamento)]


@router.get("/{id}", response_model=ActividadOut)
def obtener(id: str, service: ActividadService = Depends(get_service)):
    try:
        return _out(service.obtener(id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=ActividadOut, status_code=201)
def crear(
    body: ActividadCreate,
    service: ActividadService = Depends(get_service),
    usuario: str = Depends(get_usuario),
):
    try:
        return _out(service.crear(body.model_dump(), usuario))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{id}", response_model=ActividadOut)
def actualizar(
    id: str,
    body: ActividadUpdate,
    service: ActividadService = Depends(get_service),
    _: str = Depends(get_usuario),
):
    try:
        return _out(service.actualizar(id, body.model_dump(exclude_unset=True)))
    except ValueError as exc:
        status = 404 if "no encontrada" in str(exc) else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.delete("/{id}")
def eliminar(
    id: str,
    service: ActividadService = Depends(get_service),
    _: str = Depends(get_usuario),
):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
