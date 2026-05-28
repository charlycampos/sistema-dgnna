"""
Caso de uso: Gestión de Usuarios.
"""
from typing import List, Optional
from domain.entities.usuario import Usuario, UsuarioModulo
from domain.ports.usuario_repository import UsuarioRepository
from domain.services.auth_service import AuthService


class UsuarioService:

    def __init__(self, usuario_repo: UsuarioRepository):
        self._usuarios = usuario_repo

    def listar(self) -> List[Usuario]:
        return self._usuarios.listar()

    def obtener(self, id: str) -> Usuario:
        u = self._usuarios.obtener_por_id(id)
        if not u:
            raise ValueError(f"Usuario {id} no encontrado")
        return u

    def crear(self, datos: dict) -> Usuario:
        email = datos["email"].lower().strip()
        if self._usuarios.obtener_por_email(email):
            raise ValueError("Ya existe un usuario con ese email")

        rol = "admin" if datos.get("rol") == "admin" else "usuario"
        usuario = Usuario(
            nombre       = datos["nombre"].strip(),
            email        = email,
            passwordHash = AuthService.hash_password(datos["password"]),
            rol          = rol,
            activo       = True,
        )

        if rol == "usuario" and datos.get("modulos"):
            usuario.modulos = [
                UsuarioModulo(
                    usuarioId = usuario.id,
                    modulo    = m["modulo"],
                    rolModulo = m["rolModulo"],
                )
                for m in datos["modulos"]
            ]

        return self._usuarios.guardar(usuario)

    def actualizar(self, id: str, datos: dict) -> Usuario:
        usuario = self.obtener(id)

        if datos.get("nombre"):
            usuario.nombre = datos["nombre"].strip()
        if datos.get("email"):
            usuario.email = datos["email"].lower().strip()
        if datos.get("password"):
            usuario.passwordHash = AuthService.hash_password(datos["password"])
        if datos.get("rol") is not None:
            usuario.rol = "admin" if datos["rol"] == "admin" else "usuario"
        if datos.get("activo") is not None:
            usuario.activo = datos["activo"]

        if datos.get("modulos") is not None:
            usuario.modulos = [
                UsuarioModulo(
                    usuarioId = id,
                    modulo    = m["modulo"],
                    rolModulo = m["rolModulo"],
                )
                for m in datos["modulos"]
            ] if usuario.rol == "usuario" else []

        return self._usuarios.actualizar(usuario)

    def eliminar(self, id: str) -> bool:
        self.obtener(id)
        return self._usuarios.eliminar(id)
