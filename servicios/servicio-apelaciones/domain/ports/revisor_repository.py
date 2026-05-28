"""Puerto (interfaz) del repositorio de revisores."""
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.revisor import Revisor


class RevisorRepository(ABC):

    @abstractmethod
    def listar(self) -> List[Revisor]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Revisor]: ...

    @abstractmethod
    def guardar(self, r: Revisor) -> Revisor: ...

    @abstractmethod
    def actualizar(self, r: Revisor) -> Revisor: ...

    @abstractmethod
    def eliminar(self, id: str) -> None: ...
