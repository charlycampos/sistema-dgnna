"""Servicio de dominio: Procedencia."""
from typing import List
from domain.entities.procedencia import Procedencia
from domain.ports.procedencia_repository import ProcedenciaRepository


class ProcedenciaService:

    def __init__(self, repo: ProcedenciaRepository):
        self._repo = repo

    def listar(self) -> List[Procedencia]:
        return self._repo.listar()

    def obtener(self, id: str) -> Procedencia:
        p = self._repo.obtener_por_id(id)
        if not p:
            raise ValueError(f"Procedencia {id} no encontrada")
        return p

    def crear(self, datos: dict) -> Procedencia:
        p = Procedencia(nombre=datos["nombre"], activo=datos.get("activo", True))
        return self._repo.guardar(p)

    def actualizar(self, id: str, datos: dict) -> Procedencia:
        p = self._repo.obtener_por_id(id)
        if not p:
            raise ValueError(f"Procedencia {id} no encontrada")
        if datos.get("nombre") is not None:
            p.nombre = datos["nombre"]
        if datos.get("activo") is not None:
            p.activo = datos["activo"]
        return self._repo.actualizar(p)

    def eliminar(self, id: str) -> None:
        p = self._repo.obtener_por_id(id)
        if not p:
            raise ValueError(f"Procedencia {id} no encontrada")
        self._repo.eliminar(id)
