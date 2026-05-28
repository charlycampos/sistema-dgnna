from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


@dataclass
class ReservaSala:
    fecha:      str    # YYYY-MM-DD
    titulo:     str
    horaInicio: str    # HH:MM
    horaFin:    str    # HH:MM
    categoria:  str
    estado:     str = "Programado"  # Programado | Realizado | Cancelado | Reprogramado
    descripcion: Optional[str] = None
    creadoPor:   Optional[str] = None
    id:          str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt:   datetime = field(default_factory=datetime.utcnow)
    updatedAt:   datetime = field(default_factory=datetime.utcnow)

    def tiene_conflicto_con(self, otra: "ReservaSala") -> bool:
        """Regla de negocio: dos reservas se solapan si sus horarios se cruzan."""
        if otra.estado == "Cancelado" or self.estado == "Cancelado":
            return False
        if otra.fecha != self.fecha:
            return False
        return self.horaInicio < otra.horaFin and self.horaFin > otra.horaInicio
