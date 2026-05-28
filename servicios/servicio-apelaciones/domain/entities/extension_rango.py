from dataclasses import dataclass, field
from typing import Optional
import uuid


@dataclass
class ExtensionRango:
    descripcion: str
    minFolios:   int
    puntos:      int
    maxFolios:   Optional[int] = None   # None = sin límite superior
    activo:      bool = True
    id:          str = field(default_factory=lambda: str(uuid.uuid4()))

    def aplica_para(self, folios: int) -> bool:
        """Regla de negocio: verifica si este rango aplica para los folios dados."""
        return folios >= self.minFolios and (self.maxFolios is None or folios <= self.maxFolios)
