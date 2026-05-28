from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
import uuid


@dataclass
class UsuarioModulo:
    usuarioId: str
    modulo:    str
    rolModulo: str
    id:        str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class Usuario:
    nombre:       str
    email:        str
    passwordHash: str
    rol:          str = "usuario"   # admin | usuario
    activo:       bool = True
    id:           str = field(default_factory=lambda: str(uuid.uuid4()))
    modulos:      List[UsuarioModulo] = field(default_factory=list)
    createdAt:    datetime = field(default_factory=datetime.utcnow)
    updatedAt:    datetime = field(default_factory=datetime.utcnow)

    def es_admin(self) -> bool:
        return self.rol == "admin"

    def tiene_acceso_modulo(self, modulo: str) -> bool:
        if self.es_admin():
            return True
        return any(m.modulo == modulo for m in self.modulos)

    def puede_escribir(self, modulo: str) -> bool:
        if self.es_admin():
            return True
        return any(m.modulo == modulo for m in self.modulos)
