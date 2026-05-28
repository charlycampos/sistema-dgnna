from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ── Catálogos ─────────────────────────────────────────────────────────────────

class PlComisionOut(BaseModel):
    id: str
    nombre: str
    activo: bool
    class Config:
        from_attributes = True


class PlCongresistaOut(BaseModel):
    id: str
    nombre: str
    partido: str
    activo: bool
    class Config:
        from_attributes = True


class PlTipoOpinionOut(BaseModel):
    id: str
    nombre: str
    activo: bool
    class Config:
        from_attributes = True


class PlDireccionOut(BaseModel):
    id: str
    nombre: str
    activo: bool
    class Config:
        from_attributes = True


class PlProfesionalOut(BaseModel):
    id: str
    nombre: str
    activo: bool
    class Config:
        from_attributes = True


class CatalogosPlOut(BaseModel):
    comisiones: List[PlComisionOut]
    congresistas: List[PlCongresistaOut]
    tiposOpinion: List[PlTipoOpinionOut]
    direcciones: List[PlDireccionOut]
    profesionales: List[PlProfesionalOut]


# ── Evento ────────────────────────────────────────────────────────────────────

class PlEventoCreate(BaseModel):
    tipo: str                                          # ingreso | derivacion | informe | opinion_final | reingreso
    fecha: str                                         # YYYY-MM-DD
    documento: Optional[str] = None
    expediente: Optional[str] = None
    observaciones: Optional[str] = None
    registradoPor: Optional[str] = None
    # derivacion
    fechaSalidaDireccion: Optional[str] = None
    direccionIds: Optional[List[str]] = []
    profesionalIds: Optional[List[str]] = []
    # informe
    numeroInforme: Optional[str] = None
    opinionDireccion: Optional[str] = None
    direccionInforme: Optional[str] = None
    # opinion_final
    opinionFinal: Optional[str] = None
    fechaSalidaDGNNA: Optional[str] = None
    memoNota: Optional[str] = None


class PlEventoOut(BaseModel):
    id: str
    proyectoLeyId: str
    tipo: str
    fecha: str
    documento: Optional[str] = None
    expediente: Optional[str] = None
    observaciones: Optional[str] = None
    registradoPor: Optional[str] = None
    fechaSalidaDireccion: Optional[str] = None
    numeroInforme: Optional[str] = None
    opinionDireccion: Optional[str] = None
    direccionInforme: Optional[str] = None
    opinionFinal: Optional[str] = None
    fechaSalidaDGNNA: Optional[str] = None
    memoNota: Optional[str] = None
    direcciones: List[PlDireccionOut] = []
    profesionales: List[PlProfesionalOut] = []
    createdAt: datetime

    class Config:
        from_attributes = True


# ── Proyecto de Ley ───────────────────────────────────────────────────────────

class ProyectoLeyCreate(BaseModel):
    numeroPL: str
    expediente: Optional[str] = None
    documento: Optional[str] = None
    comisionId: Optional[str] = None
    congresistaId: Optional[str] = None
    sumilla: Optional[str] = None
    tema: Optional[str] = None
    opinion: Optional[str] = None
    estado: Optional[str] = "en_proceso"
    estadoCongreso: Optional[str] = None
    observaciones: Optional[str] = None
    creadoPor: Optional[str] = None
    # Primer evento de ingreso
    fechaIngreso: str = ""
    documentoIngreso: Optional[str] = None


class ProyectoLeyUpdate(BaseModel):
    numeroPL: Optional[str] = None
    expediente: Optional[str] = None
    documento: Optional[str] = None
    comisionId: Optional[str] = None
    congresistaId: Optional[str] = None
    sumilla: Optional[str] = None
    tema: Optional[str] = None
    opinion: Optional[str] = None
    estado: Optional[str] = None
    estadoCongreso: Optional[str] = None
    observaciones: Optional[str] = None


class ProyectoLeyOut(BaseModel):
    id: str
    numeroPL: str
    expediente: Optional[str] = None
    documento: Optional[str] = None
    comisionId: Optional[str] = None
    congresistaId: Optional[str] = None
    comision: Optional[PlComisionOut] = None
    congresista: Optional[PlCongresistaOut] = None
    sumilla: Optional[str] = None
    tema: Optional[str] = None
    opinion: Optional[str] = None
    estado: str
    estadoCongreso: Optional[str] = None
    observaciones: Optional[str] = None
    creadoPor: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    eventos: List[PlEventoOut] = []

    class Config:
        from_attributes = True
