from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.caso_sustracion import CasoSustracion, BitacoraSustracion, HistorialJudicial


class CasoRepository(ABC):

    @abstractmethod
    def listar(self, estado: Optional[str], profesional: Optional[str], pais: Optional[str], q: Optional[str]) -> List[CasoSustracion]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[CasoSustracion]: ...

    @abstractmethod
    def obtener_por_codigo(self, codigo: str) -> Optional[CasoSustracion]: ...

    @abstractmethod
    def guardar(self, caso: CasoSustracion) -> CasoSustracion: ...

    @abstractmethod
    def actualizar(self, caso: CasoSustracion) -> CasoSustracion: ...

    @abstractmethod
    def eliminar(self, id: str) -> bool: ...

    # Bitácora
    @abstractmethod
    def agregar_bitacora(self, entrada: BitacoraSustracion) -> BitacoraSustracion: ...

    @abstractmethod
    def eliminar_bitacora(self, caso_id: str, entrada_id: str) -> bool: ...

    # Historial judicial
    @abstractmethod
    def agregar_historial(self, entrada: HistorialJudicial) -> HistorialJudicial: ...

    @abstractmethod
    def eliminar_historial(self, caso_id: str, entrada_id: str) -> bool: ...

    @abstractmethod
    def ultimo_historial(self, caso_id: str) -> Optional[HistorialJudicial]: ...
