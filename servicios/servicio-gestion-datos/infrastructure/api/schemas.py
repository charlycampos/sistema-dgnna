from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CampoIn(BaseModel):
    nombreCampo:   str
    tipoDato:      str
    longitudMax:   Optional[int] = None
    esObligatorio: Optional[int] = 0
    descripcion:   Optional[str] = None
    ejemplo:       Optional[str] = None


class CampoOut(BaseModel):
    id:            str
    datasetId:     str
    nombreCampo:   str
    tipoDato:      str
    longitudMax:   Optional[int] = None
    esObligatorio: int
    descripcion:   Optional[str] = None
    ejemplo:       Optional[str] = None
    createdAt:     datetime

    class Config:
        from_attributes = True


class DatasetCreate(BaseModel):
    codigo:         str
    nombre:         str
    descripcion:    Optional[str] = None
    direccionLinea: str
    tipoFuente:     Optional[str] = "Sistema Interno"
    frecuenciaAct:  Optional[str] = "Mensual"
    formatoSalida:  Optional[str] = "Excel"
    responsable:    Optional[str] = None
    estado:         Optional[str] = "activo"
    campos:         Optional[List[CampoIn]] = []


class DatasetUpdate(BaseModel):
    nombre:         Optional[str] = None
    descripcion:    Optional[str] = None
    direccionLinea: Optional[str] = None
    tipoFuente:     Optional[str] = None
    frecuenciaAct:  Optional[str] = None
    formatoSalida:  Optional[str] = None
    responsable:    Optional[str] = None
    estado:         Optional[str] = None
    campos:         Optional[List[CampoIn]] = None


class DatasetOut(BaseModel):
    id:             str
    codigo:         str
    nombre:         str
    descripcion:    Optional[str] = None
    direccionLinea: str
    tipoFuente:     str
    frecuenciaAct:  str
    formatoSalida:  str
    responsable:    Optional[str] = None
    estado:         str
    creadoPor:      Optional[str] = None
    createdAt:      datetime
    updatedAt:      datetime
    totalCampos:    int = 0
    campos:         List[CampoOut] = []

    class Config:
        from_attributes = True
