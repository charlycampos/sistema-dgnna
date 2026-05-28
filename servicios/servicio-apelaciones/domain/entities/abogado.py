from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class Abogado:
    nombre:    str
    activo:    bool = True
    id:        str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = field(default_factory=datetime.utcnow)
    updatedAt: datetime = field(default_factory=datetime.utcnow)
