from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.reserva_sala import ReservaSala


class SalaRepository(ABC):

    @abstractmethod
    def listar(self, mes: Optional[str], estado: Optional[str], categoria: Optional[str]) -> List[ReservaSala]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[ReservaSala]: ...

    @abstractmethod
    def listar_por_fecha(self, fecha: str, excluir_id: Optional[str] = None) -> List[ReservaSala]: ...

    @abstractmethod
    def guardar(self, reserva: ReservaSala) -> ReservaSala: ...

    @abstractmethod
    def actualizar(self, reserva: ReservaSala) -> ReservaSala: ...

    @abstractmethod
    def eliminar(self, id: str) -> bool: ...
