from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.sala_repository_impl import SalaRepositoryImpl
from infrastructure.api.schemas import ReservaSalaCreate, ReservaSalaUpdate, ReservaSalaOut
from domain.services.sala_service import SalaService

router = APIRouter(prefix="/api/sala-reuniones", tags=["sala-reuniones"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/auth/login")


def get_service(db: Session = Depends(get_db)) -> SalaService:
    return SalaService(sala_repo=SalaRepositoryImpl(db))

def get_usuario(token: str = Depends(oauth2_scheme)) -> str:
    import jwt, os
    try:
        payload = jwt.decode(token, os.getenv("SESSION_SECRET", ""), algorithms=["HS256"])
        return payload.get("nombre", "")
    except Exception:
        return ""

def _out(r) -> dict:
    return {
        "id": r.id, "fecha": r.fecha, "titulo": r.titulo,
        "horaInicio": r.horaInicio, "horaFin": r.horaFin,
        "categoria": r.categoria, "estado": r.estado,
        "descripcion": r.descripcion, "creadoPor": r.creadoPor,
        "direccionResponsable": r.direccionResponsable,
        "nombreResponsable": r.nombreResponsable,
        "createdAt": r.createdAt, "updatedAt": r.updatedAt,
    }


@router.get("", response_model=List[ReservaSalaOut])
def listar(
    mes: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    service: SalaService = Depends(get_service),
):
    try:
        return [_out(r) for r in service.listar(mes=mes, estado=estado, categoria=categoria)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ReservaSalaOut, status_code=201)
def crear(body: ReservaSalaCreate, service: SalaService = Depends(get_service), usuario: str = Depends(get_usuario)):
    try:
        return _out(service.crear(body.model_dump(), usuario=usuario))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=ReservaSalaOut)
def actualizar(id: str, body: ReservaSalaUpdate, service: SalaService = Depends(get_service)):
    try:
        return _out(service.actualizar(id, body.model_dump(exclude_none=True)))
    except ValueError as e:
        code = 409 if "Conflicto" in str(e) else 404
        raise HTTPException(status_code=code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: SalaService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
