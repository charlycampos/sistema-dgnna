from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.usuario_repository_impl import UsuarioRepositoryImpl
from infrastructure.api.schemas import LoginRequest, LoginResponse, ModuloPermisoOut, EstadoActualOut
from domain.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


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


@router.get("/estado", response_model=EstadoActualOut)
def estado(
    token: str = Depends(oauth2_scheme),
    service: AuthService = Depends(get_auth_service),
):
    """Revalida la sesión contra la base de datos, no solo contra la firma
    del JWT. Lo consume el middleware del frontend en su renovación
    deslizante de cookie, para cortar la sesión de un usuario que fue
    desactivado o cuyo rol/módulos cambiaron después de emitido el token."""
    if not token:
        raise HTTPException(status_code=401, detail="Falta token")
    try:
        return service.estado_actual(token)
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
def logout():
    return {"ok": True}
