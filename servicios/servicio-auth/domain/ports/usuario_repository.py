from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.usuario import Usuario


class UsuarioRepository(ABC):

    @abstractmethod
    def listar(self) -> List[Usuario]: ...

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Usuario]: ...

    @abstractmethod
    def obtener_por_email(self, email: str) -> Optional[Usuario]: ...

    @abstractmethod
    def guardar(self, usuario: Usuario) -> Usuario: ...

    @abstractmethod
    def actualizar(self, usuario: Usuario) -> Usuario: ...

    @abstractmethod
    def eliminar(self, id: str) -> bool: ...
