from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Apelaciones ───────────────────────────────────────────────────────────────

class ApelanteDetalleCreate(BaseModel):
    tipo:            str
    nombres:         Optional[str] = None
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None
    institucion:     Optional[str] = None
    documento:       Optional[str] = None

class ApelanteDetalleOut(BaseModel):
    id:              str
    tipo:            str
    nombres:         Optional[str] = None
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None
    institucion:     Optional[str] = None
    documento:       Optional[str] = None

    class Config:
        from_attributes = True

class NnaDetalleCreate(BaseModel):
    tipo:            str
    nombres:         Optional[str] = None
    primerApellido:  Optional[str] = None
    segundoApellido: Optional[str] = None
    edad:            Optional[int] = None
    institucion:     Optional[str] = None

class NnaDetalleOut(BaseModel):
    id:              str
    tipo:            str
    nombres:         Optional[str] = None
    primerApellido:  Optional[str] = None
    segundoApellido: Optional[str] = None
    edad:            Optional[int] = None
    institucion:     Optional[str] = None

    class Config:
        from_attributes = True


class ApelacionCreate(BaseModel):
    numeroExpediente:  str
    fechaIngreso:      datetime
    fechaIngresoMIMP:  Optional[datetime] = None
    plazoVencimiento:  Optional[datetime] = None
    apelante:          Optional[str] = None
    nnaCar:            Optional[str] = None
    procedencia:       str
    documento:         str
    asunto:            str
    folios:            int
    complejidadId:     str
    abogadoId:         str
    fechaAsignacion:   Optional[datetime] = None
    estado:            str = "Pendiente"
    numeroResolucion:  Optional[str] = None
    documentoAtencion: Optional[str] = None
    cargos:            Optional[str] = None
    observaciones:     Optional[str] = None
    revisorId:         Optional[str] = None
    apelantes:         Optional[List[ApelanteDetalleCreate]] = None
    nnas:              Optional[List[NnaDetalleCreate]] = None


class ApelacionUpdate(ApelacionCreate):
    pass


class AbogadoNested(BaseModel):
    id:     str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class RevisorNested(BaseModel):
    id:     str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class ComplejidadNested(BaseModel):
    id:     str
    nombre: str
    puntos: int
    activo: bool

    class Config:
        from_attributes = True


class ApelacionOut(BaseModel):
    id:                str
    numeroExpediente:  str
    fechaIngreso:      datetime
    fechaIngresoMIMP:  Optional[datetime] = None
    plazoVencimiento:  Optional[datetime] = None
    apelante:          Optional[str] = None
    nnaCar:            Optional[str] = None
    procedencia:       str
    documento:         str
    asunto:            str
    folios:            int
    puntosExtension:   int
    complejidadId:     str
    complejidad:       Optional[ComplejidadNested] = None
    puntosComplejidad: int
    puntosTotal:       int
    abogadoId:         str
    abogado:           Optional[AbogadoNested] = None
    revisorId:         Optional[str] = None
    revisor:           Optional[RevisorNested] = None
    fechaAsignacion:   datetime
    estado:            str
    numeroResolucion:  Optional[str] = None
    documentoAtencion: Optional[str] = None
    cargos:            Optional[str] = None
    observaciones:     Optional[str] = None
    createdAt:         datetime
    updatedAt:         datetime
    apelantes:         Optional[List[ApelanteDetalleOut]] = []
    nnas:              Optional[List[NnaDetalleOut]] = []

    class Config:
        from_attributes = True


# ── Abogados ──────────────────────────────────────────────────────────────────

class AbogadoCreate(BaseModel):
    nombre: str
    activo: bool = True


class AbogadoUpdate(AbogadoCreate):
    pass


class AbogadoOut(BaseModel):
    id:        str
    nombre:    str
    activo:    bool
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ── Complejidades ─────────────────────────────────────────────────────────────

class ComplejidadCreate(BaseModel):
    nombre: str
    puntos: int
    activo: bool = True


class ComplejidadUpdate(ComplejidadCreate):
    pass


class ComplejidadOut(BaseModel):
    id:     str
    nombre: str
    puntos: int
    activo: bool

    class Config:
        from_attributes = True


# ── Revisores ─────────────────────────────────────────────────────────────────

class RevisorCreate(BaseModel):
    nombre: str
    activo: bool = True


class RevisorUpdate(BaseModel):
    nombre: Optional[str] = None
    activo: Optional[bool] = None


class RevisorOut(BaseModel):
    id:     str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


# ── Procedencias ──────────────────────────────────────────────────────────────

class ProcedenciaCreate(BaseModel):
    nombre: str
    activo: bool = True


class ProcedenciaUpdate(BaseModel):
    nombre: Optional[str] = None
    activo: Optional[bool] = None


class ProcedenciaOut(BaseModel):
    id:     str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


# ── Extensión rangos ──────────────────────────────────────────────────────────

class ExtensionCreate(BaseModel):
    descripcion: str
    minFolios:   int
    maxFolios:   Optional[int] = None
    puntos:      int
    activo:      bool = True


class ExtensionUpdate(ExtensionCreate):
    pass


class ExtensionOut(BaseModel):
    id:          str
    descripcion: str
    minFolios:   int
    maxFolios:   Optional[int] = None
    puntos:      int
    activo:      bool

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class CargaAbogado(BaseModel):
    abogado:        AbogadoNested
    casosActivos:   int
    casosResueltos: int
    casosCerrados:  int
    puntosActivos:  int


class DashboardOut(BaseModel):
    totalCasos:            int
    casosPendientes:       int
    casosResueltos:        int
    casosAtendidos:        int
    casosConPlazoProximo:  int
    cargaPorAbogado:       List[CargaAbogado]
    casosPorComplejidad:   List[dict]
    casosPorProcedencia:   List[dict]


# ── Reportes ──────────────────────────────────────────────────────────────────

class ResumenReporte(BaseModel):
    total:                int
    pendientes:           int
    atendidos:            int
    promedioAtencionXDias: float


class EvolucionItem(BaseModel):
    fecha:    str
    cantidad: int


class ProductividadAbogado(BaseModel):
    nombre:     str
    asignados:  int
    atendidos:  int
    puntos:     int
    eficiencia: int


class DistribucionComplejidad(BaseModel):
    nombre:   str
    cantidad: int
    fill:     str


class TopProcedencia(BaseModel):
    nombre:     str
    cantidad:   int
    porcentaje: int


class ReporteOut(BaseModel):
    resumen:                ResumenReporte
    evolucionSemanal:       List[EvolucionItem]
    productividadAbogados:  List[ProductividadAbogado]
    distribucionComplejidad: List[DistribucionComplejidad]
    topProcedencias:        List[TopProcedencia]
