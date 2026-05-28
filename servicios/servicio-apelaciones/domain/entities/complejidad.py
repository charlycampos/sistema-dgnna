from dataclasses import dataclass, field
import uuid


@dataclass
class ComplejidadJuridica:
    nombre: str
    puntos: int
    activo: bool = True
    id:     str = field(default_factory=lambda: str(uuid.uuid4()))
