from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TransparenciaCreate(BaseModel):
    numeroExpediente:   str
    fechaIngreso:       datetime
    documentoIngreso:   Optional[str] = None
    direccion:          List[str]
    estado:             str = "Pendiente"
    fechaAtencion:      Optional[datetime] = None
    asunto:             str
    documentoRespuesta: Optional[str] = None
    categoria:          Optional[List[str]] = None
    plazoInterno:       Optional[datetime] = None
    observaciones:      Optional[str] = None
    creadoPor:          Optional[str] = None


class TransparenciaUpdate(BaseModel):
    numeroExpediente:   Optional[str]       = None
    fechaIngreso:       Optional[datetime]  = None
    documentoIngreso:   Optional[str]       = None
    direccion:          Optional[List[str]] = None
    estado:             Optional[str]       = None
    fechaAtencion:      Optional[datetime]  = None
    asunto:             Optional[str]       = None
    documentoRespuesta: Optional[str]       = None
    categoria:          Optional[List[str]] = None
    plazoInterno:       Optional[datetime]  = None
    observaciones:      Optional[str]       = None
