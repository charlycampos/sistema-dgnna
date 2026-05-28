"""Entidad de dominio: Procedencia."""
import uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Procedencia:
    nombre: str
    activo: bool = True
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
