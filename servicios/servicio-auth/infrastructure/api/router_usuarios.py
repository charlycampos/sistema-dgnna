from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.usuario_repository_impl import UsuarioRepositoryImpl
from infrastructure.api.schemas import UsuarioCreate, UsuarioUpdate, UsuarioOut
from domain.services.usuario_service import UsuarioService
from domain.services.auth_service import AuthService

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_usuario_service(db: Session = Depends(get_db)) -> UsuarioService:
    return UsuarioService(usuario_repo=UsuarioRepositoryImpl(db))


def require_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    auth = AuthService(usuario_repo=UsuarioRepositoryImpl(db))
    payload = auth.verificar_token(token)
    if not payload or payload.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    return payload


@router.get("", response_model=List[UsuarioOut])
def listar(service: UsuarioService = Depends(get_usuario_service), _=Depends(require_admin)):
    return [_usuario_out(u) for u in service.listar()]


@router.post("", response_model=UsuarioOut, status_code=201)
def crear(body: UsuarioCreate, service: UsuarioService = Depends(get_usuario_service), _=Depends(require_admin)):
    try:
        return _usuario_out(service.crear(body.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{id}", response_model=UsuarioOut)
def obtener(id: str, service: UsuarioService = Depends(get_usuario_service), _=Depends(require_admin)):
    try:
        return _usuario_out(service.obtener(id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{id}", response_model=UsuarioOut)
def actualizar(id: str, body: UsuarioUpdate, service: UsuarioService = Depends(get_usuario_service), _=Depends(require_admin)):
    try:
        return _usuario_out(service.actualizar(id, body.model_dump(exclude_none=True)))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: UsuarioService = Depends(get_usuario_service), _=Depends(require_admin)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


def _usuario_out(u) -> dict:
    return {
        "id":        u.id,
        "nombre":    u.nombre,
        "email":     u.email,
        "rol":       u.rol,
        "activo":    u.activo,
        "modulos":   [{"modulo": m.modulo, "rolModulo": m.rolModulo} for m in u.modulos],
        "createdAt": u.createdAt,
        "updatedAt": u.updatedAt,
    }
