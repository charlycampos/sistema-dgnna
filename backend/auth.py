"""
Autenticación JWT — equivalente al auth.ts del proyecto Next.js.
Duración de sesión: 8 horas.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List

import bcrypt
import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY   = os.getenv("SESSION_SECRET", "dgnna-sistema-apelaciones-secret-2026")
ALGORITHM    = "HS256"
EXPIRE_HOURS = 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Contraseñas ──────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── Tokens JWT ───────────────────────────────────────────────────

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    return pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except pyjwt.PyJWTError:
        return None


# ─── Dependency: usuario actual ───────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )
    return payload


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    return current_user


def require_module_access(modulo: str):
    """Devuelve una dependency que verifica acceso al módulo indicado."""
    def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("rol") == "admin":
            return current_user
        modulos = current_user.get("modulos", [])
        tiene = any(m["modulo"] == modulo for m in modulos)
        if not tiene:
            raise HTTPException(status_code=403, detail=f"Sin acceso al módulo {modulo}")
        return current_user
    return _check


def can_write(modulo: str):
    """Solo admin o directora del módulo pueden escribir."""
    def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("rol") == "admin":
            return current_user
        modulos = current_user.get("modulos", [])
        match = next((m for m in modulos if m["modulo"] == modulo), None)
        if not match:
            raise HTTPException(status_code=403, detail=f"Sin acceso al módulo {modulo}")
        # Tanto registrador como directora pueden escribir
        return current_user
    return _check
