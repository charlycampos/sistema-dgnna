"""Puerto (interfaz) para el repositorio de extensión de rangos."""
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.extension_rango import ExtensionRango


class ExtensionRepository(ABC):

    @abstractmethod
    def listar(self) -> List[ExtensionRango]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[ExtensionRango]: ...

    @abstractmethod
    def guardar(self, rango: ExtensionRango) -> ExtensionRango: ...

    @abstractmethod
    def actualizar(self, rango: ExtensionRango) -> ExtensionRango: ...

    @abstractmethod
    def eliminar(self, id: str) -> None: ...
