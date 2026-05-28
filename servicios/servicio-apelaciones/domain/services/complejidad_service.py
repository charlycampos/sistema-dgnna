"""Casos de uso para complejidades jurídicas y rangos de extensión."""
from typing import List, Optional
from domain.entities.complejidad import ComplejidadJuridica
from domain.entities.extension_rango import ExtensionRango
from domain.ports.complejidad_repository import ComplejidadRepository


class ComplejidadService:

    def __init__(self, repo: ComplejidadRepository):
        self._repo = repo

    def listar(self) -> List[ComplejidadJuridica]:
        return self._repo.listar()

    def obtener(self, id: str) -> ComplejidadJuridica:
        c = self._repo.obtener_por_id(id)
        if not c:
            raise ValueError(f"Complejidad {id} no encontrada")
        return c

    def crear(self, datos: dict) -> ComplejidadJuridica:
        c = ComplejidadJuridica(
            nombre=datos["nombre"],
            puntos=datos["puntos"],
            activo=datos.get("activo", True),
        )
        return self._repo.guardar(c)

    def actualizar(self, id: str, datos: dict) -> ComplejidadJuridica:
        c = self.obtener(id)
        c.nombre = datos.get("nombre", c.nombre)
        c.puntos = datos.get("puntos", c.puntos)
        c.activo = datos.get("activo", c.activo)
        return self._repo.actualizar(c)

    def eliminar(self, id: str) -> None:
        self.obtener(id)
        self._repo.eliminar(id)
