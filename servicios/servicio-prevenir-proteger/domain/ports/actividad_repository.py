from abc import ABC, abstractmethod
from typing import List, Optional

from domain.entities.actividad import Actividad


class ActividadRepository(ABC):
    @abstractmethod
    def listar(self, q=None, estado=None, tipo=None, departamento=None) -> List[Actividad]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Actividad]: ...

    @abstractmethod
    def guardar(self, actividad: Actividad) -> Actividad: ...

    @abstractmethod
    def actualizar(self, actividad: Actividad) -> Actividad: ...

    @abstractmethod
    def eliminar(self, id: str) -> bool: ...
