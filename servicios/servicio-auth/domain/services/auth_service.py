"""
Caso de uso: Autenticación.
Sin imports de FastAPI ni SQLAlchemy — lógica pura.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt as pyjwt

from domain.ports.usuario_repository import UsuarioRepository

SECRET_KEY   = os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026")
ALGORITHM    = "HS256"
EXPIRE_MINUTES = 480  # sesión dura 8 horas (jornada laboral completa)


class AuthService:

    def __init__(self, usuario_repo: UsuarioRepository):
        self._usuarios = usuario_repo

    def login(self, email: str, password: str) -> dict:
        """Valida credenciales y retorna el token JWT con los datos del usuario."""
        if not email or not password:
            raise ValueError("Email y contraseña son requeridos")

        usuario = self._usuarios.obtener_por_email(email.lower().strip())

        if not usuario or not usuario.activo:
            raise PermissionError("Credenciales incorrectas")

        if not bcrypt.checkpw(password.encode(), usuario.passwordHash.encode()):
            raise PermissionError("Credenciales incorrectas")

        # El rol global es independiente de los roles asignados por modulo.
        # Un permiso de lectura como "directora" nunca debe elevar al usuario
        # a una identidad global distinta de "usuario".
        rol = "admin" if usuario.rol == "admin" else "usuario"

        modulos_payload = [
            {"modulo": m.modulo, "rolModulo": m.rolModulo}
            for m in usuario.modulos
        ]

        # Compatibilidad prudente con cuentas legacy que guardaban el rol de
        # Apelaciones en la columna global. El token moderno conserva siempre
        # rol=usuario y expresa ese acceso exclusivamente dentro de modulos.
        if not modulos_payload and usuario.rol in ("registrador", "directora", "director"):
            rol_modulo = "registrador" if usuario.rol == "registrador" else "directora"
            modulos_payload = [{"modulo": "apelaciones", "rolModulo": rol_modulo}]

        token = self._crear_token({
            "userId":  usuario.id,
            "nombre":  usuario.nombre,
            "email":   usuario.email,
            "rol":     rol,
            "modulos": modulos_payload,
        })

        return {
            "ok":           True,
            "nombre":       usuario.nombre,
            "rol":          rol,
            "modulos":      modulos_payload,
            "access_token": token,
        }

    def verificar_token(self, token: str) -> Optional[dict]:
        try:
            return pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except pyjwt.PyJWTError:
            return None

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _crear_token(self, data: dict) -> str:
        payload = data.copy()
        payload["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
        return pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
