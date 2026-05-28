"""Casos de uso para rangos de extensión de folios."""
from typing import List
from domain.entities.extension_rango import ExtensionRango
from domain.ports.extension_repository import ExtensionRepository


class ExtensionService:

    def __init__(self, repo: ExtensionRepository):
        self._repo = repo

    def listar(self) -> List[ExtensionRango]:
        return self._repo.listar()

    def obtener(self, id: str) -> ExtensionRango:
        r = self._repo.obtener_por_id(id)
        if not r:
            raise ValueError(f"Rango de extensión {id} no encontrado")
        return r

    def crear(self, datos: dict) -> ExtensionRango:
        r = ExtensionRango(
            descripcion=datos["descripcion"],
            minFolios=datos["minFolios"],
            maxFolios=datos.get("maxFolios"),
            puntos=datos["puntos"],
            activo=datos.get("activo", True),
        )
        return self._repo.guardar(r)

    def actualizar(self, id: str, datos: dict) -> ExtensionRango:
        r = self.obtener(id)
        r.descripcion = datos.get("descripcion", r.descripcion)
        r.minFolios   = datos.get("minFolios", r.minFolios)
        r.maxFolios   = datos.get("maxFolios", r.maxFolios)
        r.puntos      = datos.get("puntos", r.puntos)
        r.activo      = datos.get("activo", r.activo)
        return self._repo.actualizar(r)

    def eliminar(self, id: str) -> None:
        self.obtener(id)
        self._repo.eliminar(id)
