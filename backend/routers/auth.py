from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario
from schemas import LoginRequest, LoginResponse, ModuloPermisoOut
from auth import verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email y contraseña son requeridos")

    usuario = db.query(Usuario).filter(
        Usuario.email == body.email.lower().strip()
    ).first()

    if not usuario or not usuario.activo:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not verify_password(body.password, usuario.passwordHash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    rol = "admin" if usuario.rol == "admin" else "usuario"

    modulos_payload = [
        {"modulo": m.modulo, "rolModulo": m.rolModulo}
        for m in usuario.modulos
    ]

    # Compatibilidad con roles viejos
    if not modulos_payload and usuario.rol in ("registrador", "directora"):
        modulos_payload = [{"modulo": "apelaciones", "rolModulo": usuario.rol}]

    token = create_token({
        "userId": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": rol,
        "modulos": modulos_payload,
    })

    return LoginResponse(
        ok=True,
        nombre=usuario.nombre,
        rol=rol,
        modulos=[ModuloPermisoOut(**m) for m in modulos_payload],
        access_token=token,
    )


@router.post("/logout")
def logout():
    return {"ok": True}
