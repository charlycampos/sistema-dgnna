"""
Puerto (interfaz abstracta) del repositorio de Apelaciones.
El dominio solo conoce este contrato — no sabe si la BD es Oracle, SQLite u otro.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.apelacion import Apelacion


class ApelacionRepository(ABC):

    @abstractmethod
    def listar(self, estado: Optional[str] = None, abogado_id: Optional[str] = None) -> List[Apelacion]:
        ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Apelacion]:
        ...

    @abstractmethod
    def guardar(self, apelacion: Apelacion) -> Apelacion:
        ...

    @abstractmethod
    def actualizar(self, apelacion: Apelacion) -> Apelacion:
        ...

    @abstractmethod
    def eliminar(self, id: str) -> bool:
        ...
