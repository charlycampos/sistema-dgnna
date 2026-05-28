from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.usuario_repository_impl import UsuarioRepositoryImpl
from infrastructure.api.schemas import LoginRequest, LoginResponse, ModuloPermisoOut
from domain.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(usuario_repo=UsuarioRepositoryImpl(db))


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, service: AuthService = Depends(get_auth_service)):
    try:
        resultado = service.login(body.email, body.password)
        resultado["modulos"] = [ModuloPermisoOut(**m) for m in resultado["modulos"]]
        return LoginResponse(**resultado)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
def logout():
    return {"ok": True}
