from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.complejidad import ComplejidadJuridica
from domain.entities.extension_rango import ExtensionRango


class ComplejidadRepository(ABC):

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[ComplejidadJuridica]: ...

    @abstractmethod
    def listar(self) -> List[ComplejidadJuridica]: ...

    @abstractmethod
    def listar_rangos(self) -> List[ExtensionRango]: ...

    @abstractmethod
    def guardar(self, c: ComplejidadJuridica) -> ComplejidadJuridica: ...

    @abstractmethod
    def actualizar(self, c: ComplejidadJuridica) -> ComplejidadJuridica: ...

    @abstractmethod
    def eliminar(self, id: str) -> None: ...
