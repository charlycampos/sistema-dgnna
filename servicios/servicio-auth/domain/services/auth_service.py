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

TESTING = os.getenv("TESTING", "").strip().lower() == "true"
SECRET_KEY = os.getenv("SESSION_SECRET") or ("dgnna-test-secret-no-usar-en-produccion" if TESTING else None)
if not SECRET_KEY:
    raise RuntimeError(
        "SESSION_SECRET no está definido. Defínelo en el archivo .env "
        "(no existe valor por defecto; genera uno con: openssl rand -hex 32)."
    )
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

        rol, modulos_payload = self._rol_y_modulos_normalizados(usuario)

        token = self._crear_token({
            "userId":    usuario.id,
            "nombre":    usuario.nombre,
            "email":     usuario.email,
            "rol":       rol,
            "direccion": usuario.direccion or "",
            "modulos":   modulos_payload,
        })

        return {
            "ok":           True,
            "nombre":       usuario.nombre,
            "rol":          rol,
            "direccion":    usuario.direccion,
            "modulos":      modulos_payload,
            "access_token": token,
        }

    def verificar_token(self, token: str) -> Optional[dict]:
        try:
            return pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except pyjwt.PyJWTError:
            return None

    def estado_actual(self, token: str) -> dict:
        """Revalida un token contra la base de datos (no solo contra su firma).

        El middleware del frontend llama a esto periódicamente durante la
        renovación deslizante de la cookie de sesión, para que desactivar o
        cambiar el rol/módulos de un usuario corte su sesión ya iniciada en
        vez de esperar a que el token expire (hasta 8 horas después).
        """
        payload = self.verificar_token(token)
        if not payload:
            raise PermissionError("Token inválido o expirado")

        usuario_id = payload.get("userId")
        usuario = self._usuarios.obtener_por_id(usuario_id) if usuario_id else None
        if not usuario or not usuario.activo:
            raise PermissionError("La cuenta fue desactivada o ya no existe")

        rol, modulos_payload = self._rol_y_modulos_normalizados(usuario)
        return {
            "activo":    True,
            "rol":       rol,
            "direccion": usuario.direccion or "",
            "modulos":   modulos_payload,
        }

    @staticmethod
    def _rol_y_modulos_normalizados(usuario) -> tuple[str, list[dict]]:
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

        return rol, modulos_payload

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _crear_token(self, data: dict) -> str:
        payload = data.copy()
        payload["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
        return pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
