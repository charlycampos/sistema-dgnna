"""Puerto (interfaz) del repositorio de procedencias."""
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.procedencia import Procedencia


class ProcedenciaRepository(ABC):

    @abstractmethod
    def listar(self) -> List[Procedencia]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Procedencia]: ...

    @abstractmethod
    def guardar(self, p: Procedencia) -> Procedencia: ...

    @abstractmethod
    def actualizar(self, p: Procedencia) -> Procedencia: ...

    @abstractmethod
    def eliminar(self, id: str) -> None: ...
