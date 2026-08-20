import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Actividad:
    nombreActividad: str
    tipoActividad: str
    fecha: str
    departamento: str
    modalidad: str
    estado: str = "Planificada"
    codigo: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    entidadAliada: Optional[str] = None
    publicoObjetivo: Optional[str] = None
    participantesMujeres: int = 0
    participantesHombres: int = 0
    participantesOtros: int = 0
    responsable: Optional[str] = None
    observaciones: Optional[str] = None
    creadoPor: Optional[str] = None
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = field(default_factory=datetime.utcnow)
    updatedAt: datetime = field(default_factory=datetime.utcnow)

    @property
    def totalParticipantes(self) -> int:
        return self.participantesMujeres + self.participantesHombres + self.participantesOtros
