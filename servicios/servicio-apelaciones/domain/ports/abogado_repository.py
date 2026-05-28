"""Puerto (interfaz) para el repositorio de abogados."""
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.abogado import Abogado


class AbogadoRepository(ABC):

    @abstractmethod
    def listar(self, solo_activos: bool = False) -> List[Abogado]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Abogado]: ...

    @abstractmethod
    def guardar(self, abogado: Abogado) -> Abogado: ...

    @abstractmethod
    def actualizar(self, abogado: Abogado) -> Abogado: ...

    @abstractmethod
    def eliminar(self, id: str) -> None: ...
