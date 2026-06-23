from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ReservaSalaCreate(BaseModel):
    fecha:      str
    titulo:     str
    horaInicio: str
    horaFin:    str
    categoria:  str
    estado:     str = "Programado"
    descripcion: Optional[str] = None
    creadoPor:   Optional[str] = None
    direccionResponsable: Optional[str] = None
    nombreResponsable:    Optional[str] = None

class ReservaSalaUpdate(BaseModel):
    fecha:      Optional[str] = None
    titulo:     Optional[str] = None
    horaInicio: Optional[str] = None
    horaFin:    Optional[str] = None
    categoria:  Optional[str] = None
    estado:     Optional[str] = None
    descripcion: Optional[str] = None
    direccionResponsable: Optional[str] = None
    nombreResponsable:    Optional[str] = None

class ReservaSalaOut(BaseModel):
    id:         str
    fecha:      str
    titulo:     str
    horaInicio: str
    horaFin:    str
    categoria:  str
    estado:     str
    descripcion: Optional[str] = None
    creadoPor:   Optional[str] = None
    direccionResponsable: Optional[str] = None
    nombreResponsable:    Optional[str] = None
    createdAt:   datetime
    updatedAt:   datetime
