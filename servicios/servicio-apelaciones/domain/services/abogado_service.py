"""Casos de uso para la gestión de abogados."""
from typing import List, Optional
from domain.entities.abogado import Abogado
from domain.ports.abogado_repository import AbogadoRepository


class AbogadoService:

    def __init__(self, repo: AbogadoRepository):
        self._repo = repo

    def listar(self, solo_activos: bool = False) -> List[Abogado]:
        return self._repo.listar(solo_activos=solo_activos)

    def obtener(self, id: str) -> Abogado:
        abogado = self._repo.obtener_por_id(id)
        if not abogado:
            raise ValueError(f"Abogado {id} no encontrado")
        return abogado

    def crear(self, datos: dict) -> Abogado:
        abogado = Abogado(
            nombre=datos["nombre"],
            activo=datos.get("activo", True),
        )
        return self._repo.guardar(abogado)

    def actualizar(self, id: str, datos: dict) -> Abogado:
        abogado = self.obtener(id)
        abogado.nombre = datos.get("nombre", abogado.nombre)
        abogado.activo = datos.get("activo", abogado.activo)
        return self._repo.actualizar(abogado)

    def eliminar(self, id: str) -> None:
        self.obtener(id)  # verifica que existe
        self._repo.eliminar(id)
