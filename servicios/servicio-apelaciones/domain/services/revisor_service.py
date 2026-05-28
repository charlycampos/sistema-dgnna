"""Servicio de dominio: Revisor."""
from typing import List
from domain.entities.revisor import Revisor
from domain.ports.revisor_repository import RevisorRepository


class RevisorService:

    def __init__(self, repo: RevisorRepository):
        self._repo = repo

    def listar(self) -> List[Revisor]:
        return self._repo.listar()

    def obtener(self, id: str) -> Revisor:
        r = self._repo.obtener_por_id(id)
        if not r:
            raise ValueError(f"Revisor {id} no encontrado")
        return r

    def crear(self, datos: dict) -> Revisor:
        r = Revisor(nombre=datos["nombre"], activo=datos.get("activo", True))
        return self._repo.guardar(r)

    def actualizar(self, id: str, datos: dict) -> Revisor:
        r = self._repo.obtener_por_id(id)
        if not r:
            raise ValueError(f"Revisor {id} no encontrado")
        if datos.get("nombre") is not None:
            r.nombre = datos["nombre"]
        if datos.get("activo") is not None:
            r.activo = datos["activo"]
        return self._repo.actualizar(r)

    def eliminar(self, id: str) -> None:
        r = self._repo.obtener_por_id(id)
        if not r:
            raise ValueError(f"Revisor {id} no encontrado")
        self._repo.eliminar(id)
