"""Entidad de dominio: Revisor."""
import uuid
from dataclasses import dataclass, field


@dataclass
class Revisor:
    nombre: str
    activo: bool = True
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
