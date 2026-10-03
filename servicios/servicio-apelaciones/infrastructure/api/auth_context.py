"""Autorización local y validación contra el servicio de identidad."""
import os
from typing import Any

import httpx
import jwt as pyjwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
TESTING = os.getenv("TESTING", "").strip().lower() == "true"
SECRET_KEY = os.getenv("SESSION_SECRET") or ("dgnna-test-secret-no-usar-en-produccion" if TESTING else None)
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")

if not SECRET_KEY:
    raise RuntimeError("SESSION_SECRET no está definido")


def current_identity(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except pyjwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada") from exc
    if not payload.get("userId"):
        raise HTTPException(status_code=401, detail="La sesión no identifica al usuario")
    try:
        response = httpx.get(
            f"{AUTH_SERVICE_URL}/api/auth/estado",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="No se pudo validar la sesión en autenticación") from exc
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="La cuenta está inactiva o la sesión expiró")
    if not response.is_success:
        raise HTTPException(status_code=503, detail="El servicio de autenticación no está disponible")
    estado = response.json()
    payload["rol"] = estado.get("rol", payload.get("rol"))
    payload["modulos"] = estado.get("modulos", [])
    payload["direccion"] = estado.get("direccion", payload.get("direccion"))
    payload["_token"] = token
    return payload


def require_admin(identity: dict[str, Any] = Depends(current_identity)) -> dict[str, Any]:
    if identity.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    return identity


def require_catalog_manager(identity: dict[str, Any] = Depends(current_identity)) -> dict[str, Any]:
    if identity.get("rol") == "admin":
        return identity
    if any(p.get("modulo") == "apelaciones" and p.get("rolModulo") == "registrador" for p in identity.get("modulos", [])):
        return identity
    raise HTTPException(status_code=403, detail="No tiene permisos para administrar abogados")


def forbid_abogado(identity: dict[str, Any] = Depends(current_identity)) -> dict[str, Any]:
    if any(p.get("modulo") == "apelaciones" and p.get("rolModulo") == "abogado" for p in identity.get("modulos", [])):
        raise HTTPException(status_code=403, detail="El rol Abogado no puede consultar información global")
    return identity


def validate_abogado_user(usuario_id: str, token: str) -> dict[str, Any]:
    """Consulta la fuente oficial de identidad; no infiere vínculos por nombre o correo."""
    try:
        response = httpx.get(
            f"{AUTH_SERVICE_URL}/api/usuarios/{usuario_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="No se pudo validar el usuario en autenticación") from exc
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="El usuario seleccionado no existe")
    if response.status_code in (401, 403):
        raise HTTPException(status_code=403, detail="No fue posible validar el usuario seleccionado")
    if not response.is_success:
        raise HTTPException(status_code=503, detail="El servicio de autenticación no está disponible")
    usuario = response.json()
    if not usuario.get("activo"):
        raise HTTPException(status_code=409, detail="El usuario seleccionado está inactivo")
    permisos = usuario.get("modulos") or []
    if not any(p.get("modulo") == "apelaciones" and p.get("rolModulo") == "abogado" for p in permisos):
        raise HTTPException(status_code=409, detail="El usuario debe tener rol Abogado en el módulo de Apelaciones")
    return usuario


def validate_current_abogado(identity: dict[str, Any]) -> None:
    permisos = identity.get("modulos") or []
    if not any(p.get("modulo") == "apelaciones" and p.get("rolModulo") == "abogado" for p in permisos):
        raise HTTPException(status_code=403, detail="La cuenta no tiene rol Abogado en Apelaciones")
