"""
Entidad de dominio: Apelacion
Sin dependencias de FastAPI ni SQLAlchemy — lógica pura de negocio.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


def _new_id() -> str:
    return str(uuid.uuid4())


@dataclass
class Apelacion:
    numeroExpediente:  str
    fechaIngreso:      datetime
    procedencia:       str
    documento:         str
    asunto:            str
    folios:            int
    complejidadId:     str
    abogadoId:         str
    fechaAsignacion:   datetime
    apelante:          Optional[str] = None
    puntosExtension:   int = 0
    puntosComplejidad: int = 0
    puntosTotal:       int = 0
    estado:            str = "Pendiente"   # Pendiente | Resuelto | Atendido
    id:                str = field(default_factory=_new_id)
    fechaIngresoMIMP:  Optional[datetime] = None
    plazoVencimiento:  Optional[datetime] = None
    nnaCar:            Optional[str] = None
    numeroResolucion:  Optional[str] = None
    documentoAtencion: Optional[str] = None
    cargos:            Optional[str] = None
    observaciones:     Optional[str] = None
    revisorId:         Optional[str] = None
    apelantes:         list = field(default_factory=list)
    nnas:              list = field(default_factory=list)
    createdAt:         datetime = field(default_factory=datetime.utcnow)
    updatedAt:         datetime = field(default_factory=datetime.utcnow)

    def calcular_puntos(self, puntos_extension: int, puntos_complejidad: int) -> None:
        """Regla de negocio: asigna puntos y recalcula el total."""
        self.puntosExtension   = puntos_extension
        self.puntosComplejidad = puntos_complejidad
        self.puntosTotal       = puntos_extension + puntos_complejidad

    def resolver(self, numero_resolucion: str) -> None:
        """Regla de negocio: marca la apelación como resuelta."""
        self.estado           = "Resuelto"
        self.numeroResolucion = numero_resolucion
        self.updatedAt        = datetime.utcnow()

    def atender(self, documento_atencion: str) -> None:
        """Regla de negocio: marca la apelación como atendida."""
        self.estado            = "Atendido"
        self.documentoAtencion = documento_atencion
        self.updatedAt         = datetime.utcnow()
