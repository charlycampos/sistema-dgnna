from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ActividadCreate(BaseModel):
    codigo: Optional[str] = None
    nombreActividad: str
    tipoActividad: str
    fecha: str
    departamento: str
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    entidadAliada: Optional[str] = None
    modalidad: str
    publicoObjetivo: Optional[str] = None
    participantesMujeres: int = Field(0, ge=0)
    participantesHombres: int = Field(0, ge=0)
    participantesOtros: int = Field(0, ge=0)
    responsable: Optional[str] = None
    estado: str = "Planificada"
    observaciones: Optional[str] = None
    creadoPor: Optional[str] = None


class ActividadUpdate(BaseModel):
    codigo: Optional[str] = None
    nombreActividad: Optional[str] = None
    tipoActividad: Optional[str] = None
    fecha: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    entidadAliada: Optional[str] = None
    modalidad: Optional[str] = None
    publicoObjetivo: Optional[str] = None
    participantesMujeres: Optional[int] = Field(None, ge=0)
    participantesHombres: Optional[int] = Field(None, ge=0)
    participantesOtros: Optional[int] = Field(None, ge=0)
    responsable: Optional[str] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None


class ActividadOut(ActividadCreate):
    id: str
    totalParticipantes: int
    createdAt: datetime
    updatedAt: datetime
