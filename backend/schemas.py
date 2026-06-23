"""
Schemas Pydantic para validación de requests y serialización de responses.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator


# ─────────────────────────────────────────────
# ABOGADO
# ─────────────────────────────────────────────

class AbogadoBase(BaseModel):
    nombre: str
    activo: bool = True

class AbogadoCreate(AbogadoBase):
    pass

class AbogadoUpdate(BaseModel):
    nombre: Optional[str] = None
    activo: Optional[bool] = None

class AbogadoOut(AbogadoBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# REVISOR
# ─────────────────────────────────────────────

class RevisorBase(BaseModel):
    nombre: str
    activo: bool = True

class RevisorCreate(RevisorBase):
    pass

class RevisorUpdate(BaseModel):
    nombre: Optional[str] = None
    activo: Optional[bool] = None

class RevisorOut(RevisorBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# COMPLEJIDAD JURIDICA
# ─────────────────────────────────────────────

class ComplejidadBase(BaseModel):
    nombre: str
    puntos: int
    activo: bool = True

class ComplejidadCreate(ComplejidadBase):
    pass

class ComplejidadUpdate(BaseModel):
    nombre: Optional[str] = None
    puntos: Optional[int] = None
    activo: Optional[bool] = None

class ComplejidadOut(ComplejidadBase):
    id: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# EXTENSION RANGO
# ─────────────────────────────────────────────

class ExtensionRangoBase(BaseModel):
    descripcion: str
    minFolios: int
    maxFolios: Optional[int] = None
    puntos: int
    activo: bool = True

class ExtensionRangoCreate(ExtensionRangoBase):
    pass

class ExtensionRangoUpdate(BaseModel):
    descripcion: Optional[str] = None
    minFolios: Optional[int] = None
    maxFolios: Optional[int] = None
    puntos: Optional[int] = None
    activo: Optional[bool] = None

class ExtensionRangoOut(ExtensionRangoBase):
    id: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# APELACION
# ─────────────────────────────────────────────

class ApelacionCreate(BaseModel):
    numeroExpediente: str
    fechaIngreso: datetime
    fechaIngresoMIMP: Optional[datetime] = None
    plazoVencimiento: Optional[datetime] = None
    apelante: str
    nnaCar: Optional[str] = None
    procedencia: str
    documento: str
    asunto: str
    folios: int
    complejidadId: str
    abogadoId: str
    revisorId: Optional[str] = None
    fechaRevisor: Optional[datetime] = None
    fechaAsignacion: Optional[datetime] = None
    estado: str = "Pendiente"
    numeroResolucion: Optional[str] = None
    documentoAtencion: Optional[str] = None
    cargos: Optional[str] = None
    observaciones: Optional[str] = None

class ApelacionUpdate(ApelacionCreate):
    pass

class ApelacionOut(BaseModel):
    id: str
    numeroExpediente: str
    fechaIngreso: datetime
    fechaIngresoMIMP: Optional[datetime]
    plazoVencimiento: Optional[datetime]
    apelante: str
    nnaCar: Optional[str]
    procedencia: str
    documento: str
    asunto: str
    folios: int
    puntosExtension: int
    complejidadId: str
    puntosComplejidad: int
    puntosTotal: int
    abogadoId: str
    revisorId: Optional[str] = None
    fechaRevisor: Optional[datetime] = None
    fechaAsignacion: datetime
    estado: str
    numeroResolucion: Optional[str]
    documentoAtencion: Optional[str]
    cargos: Optional[str]
    observaciones: Optional[str]
    createdAt: datetime
    updatedAt: datetime
    abogado: Optional[AbogadoOut] = None
    revisor: Optional[RevisorOut] = None
    complejidad: Optional[ComplejidadOut] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# USUARIO
# ─────────────────────────────────────────────

class ModuloPermisoOut(BaseModel):
    modulo: str
    rolModulo: str

    class Config:
        from_attributes = True

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str = "usuario"
    modulos: Optional[List[ModuloPermisoOut]] = []

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    modulos: Optional[List[ModuloPermisoOut]] = None

class UsuarioOut(BaseModel):
    id: str
    nombre: str
    email: str
    rol: str
    activo: bool
    createdAt: datetime
    modulos: List[ModuloPermisoOut] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    ok: bool
    nombre: str
    rol: str
    modulos: List[ModuloPermisoOut]
    access_token: str
    token_type: str = "bearer"


# ─────────────────────────────────────────────
# SALA DE REUNIONES
# ─────────────────────────────────────────────

class ReservaSalaCreate(BaseModel):
    fecha: str          # YYYY-MM-DD
    titulo: str
    horaInicio: str     # HH:MM
    horaFin: str        # HH:MM
    categoria: str
    estado: str = "Programado"
    descripcion: Optional[str] = None
    creadoPor: Optional[str] = None

class ReservaSalaUpdate(BaseModel):
    fecha: Optional[str] = None
    titulo: Optional[str] = None
    horaInicio: Optional[str] = None
    horaFin: Optional[str] = None
    categoria: Optional[str] = None
    estado: Optional[str] = None
    descripcion: Optional[str] = None

class ReservaSalaOut(BaseModel):
    id: str
    fecha: str
    titulo: str
    horaInicio: str
    horaFin: str
    categoria: str
    estado: str
    descripcion: Optional[str]
    creadoPor: Optional[str]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# SUSTRACCIÓN INTERNACIONAL
# ─────────────────────────────────────────────

class BitacoraEntradaCreate(BaseModel):
    fecha: str        # YYYY-MM-DD
    texto: str
    creadoPor: Optional[str] = None

class BitacoraEntradaOut(BaseModel):
    id: str
    casoId: str
    fecha: str
    texto: str
    creadoPor: Optional[str]
    createdAt: datetime

    class Config:
        from_attributes = True

class HistorialJudicialCreate(BaseModel):
    etapa: str
    fecha: str        # YYYY-MM-DD
    descripcion: Optional[str] = None
    creadoPor: Optional[str] = None

class HistorialJudicialOut(BaseModel):
    id: str
    casoId: str
    etapa: str
    fecha: str
    descripcion: Optional[str]
    creadoPor: Optional[str]
    createdAt: datetime

    class Config:
        from_attributes = True

class CasoSustracionCreate(BaseModel):
    codigo: str
    # NNA
    nnaNombre: str
    nnaSexo: Optional[str] = None
    nnaEdad: Optional[str] = None
    nnaTipoEdad: Optional[str] = None
    nnaFechaNac: Optional[str] = None
    # Trámite
    pais: str
    etapa: Optional[str] = None
    tipoSolicitud: Optional[str] = None
    acPeru: Optional[str] = None
    fechaIngreso: str
    fechaSalida: Optional[str] = None
    # Solicitante
    solicitanteNombre: Optional[str] = None
    solicitanteSexo: Optional[str] = None
    solicitanteTelefono: Optional[str] = None
    solicitanteCorreo: Optional[str] = None
    solicitanteDomicilio: Optional[str] = None
    # Requerido
    requeridoNombre: Optional[str] = None
    requeridoSexo: Optional[str] = None
    requeridoTelefono: Optional[str] = None
    requeridoCorreo: Optional[str] = None
    requeridoDomicilio: Optional[str] = None
    # Gestión
    profesional: Optional[str] = None
    estado: str = "Tramite"
    fechaEntrevista: Optional[str] = None
    resultadoEntrevista: Optional[str] = None
    # Proceso judicial
    estadoJudicial: Optional[str] = None
    fechaDemanda: Optional[str] = None
    numExpedienteJudicial: Optional[str] = None
    juzgado: Optional[str] = None
    sentencia1ra: Optional[str] = None
    sentencia2da: Optional[str] = None
    casacion: Optional[str] = None
    # Cierre
    motivoCierre: Optional[str] = None
    retorno: Optional[str] = None
    observaciones: Optional[str] = None
    creadoPor: Optional[str] = None

class CasoSustracionUpdate(BaseModel):
    codigo: Optional[str] = None
    # NNA
    nnaNombre: Optional[str] = None
    nnaSexo: Optional[str] = None
    nnaEdad: Optional[str] = None
    nnaTipoEdad: Optional[str] = None
    nnaFechaNac: Optional[str] = None
    # Trámite
    pais: Optional[str] = None
    etapa: Optional[str] = None
    tipoSolicitud: Optional[str] = None
    acPeru: Optional[str] = None
    fechaIngreso: Optional[str] = None
    fechaSalida: Optional[str] = None
    # Solicitante
    solicitanteNombre: Optional[str] = None
    solicitanteSexo: Optional[str] = None
    solicitanteTelefono: Optional[str] = None
    solicitanteCorreo: Optional[str] = None
    solicitanteDomicilio: Optional[str] = None
    # Requerido
    requeridoNombre: Optional[str] = None
    requeridoSexo: Optional[str] = None
    requeridoTelefono: Optional[str] = None
    requeridoCorreo: Optional[str] = None
    requeridoDomicilio: Optional[str] = None
    # Gestión
    profesional: Optional[str] = None
    estado: Optional[str] = None
    fechaEntrevista: Optional[str] = None
    resultadoEntrevista: Optional[str] = None
    # Proceso judicial
    estadoJudicial: Optional[str] = None
    fechaDemanda: Optional[str] = None
    numExpedienteJudicial: Optional[str] = None
    juzgado: Optional[str] = None
    sentencia1ra: Optional[str] = None
    sentencia2da: Optional[str] = None
    casacion: Optional[str] = None
    # Cierre
    motivoCierre: Optional[str] = None
    retorno: Optional[str] = None
    observaciones: Optional[str] = None
    creadoPor: Optional[str] = None

class CasoSustracionOut(BaseModel):
    id: str
    codigo: str
    # NNA
    nnaNombre: str
    nnaSexo: Optional[str]
    nnaEdad: Optional[str]
    nnaTipoEdad: Optional[str]
    nnaFechaNac: Optional[str]
    # Trámite
    pais: str
    etapa: Optional[str]
    tipoSolicitud: Optional[str]
    acPeru: Optional[str]
    fechaIngreso: str
    fechaSalida: Optional[str]
    # Solicitante
    solicitanteNombre: Optional[str]
    solicitanteSexo: Optional[str]
    solicitanteTelefono: Optional[str]
    solicitanteCorreo: Optional[str]
    solicitanteDomicilio: Optional[str]
    # Requerido
    requeridoNombre: Optional[str]
    requeridoSexo: Optional[str]
    requeridoTelefono: Optional[str]
    requeridoCorreo: Optional[str]
    requeridoDomicilio: Optional[str]
    # Gestión
    profesional: Optional[str]
    estado: str
    fechaEntrevista: Optional[str]
    resultadoEntrevista: Optional[str]
    # Proceso judicial
    estadoJudicial: Optional[str]
    fechaDemanda: Optional[str]
    numExpedienteJudicial: Optional[str]
    juzgado: Optional[str]
    sentencia1ra: Optional[str]
    sentencia2da: Optional[str]
    casacion: Optional[str]
    # Cierre
    motivoCierre: Optional[str]
    retorno: Optional[str]
    observaciones: Optional[str]
    creadoPor: Optional[str]
    createdAt: datetime
    updatedAt: datetime
    bitacora: List[BitacoraEntradaOut] = []
    historialJudicial: List[HistorialJudicialOut] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

class CargaAbogadoOut(BaseModel):
    abogado: AbogadoOut
    casosActivos: int
    casosResueltos: int
    casosCerrados: int
    puntosActivos: int

class CargaRevisorOut(BaseModel):
    revisor: RevisorOut
    totalCasos: int
    casosPendientes: int
    casosResueltos: int
    casosAtendidos: int

class ItemNombreCantidad(BaseModel):
    nombre: str
    cantidad: int

class DashboardOut(BaseModel):
    totalCasos: int
    casosPendientes: int
    casosResueltos: int
    casosAtendidos: int
    casosConPlazoProximo: int
    cargaPorAbogado: List[CargaAbogadoOut]
    cargaPorRevisor: List[CargaRevisorOut]
    casosPorComplejidad: List[ItemNombreCantidad]
    casosPorProcedencia: List[ItemNombreCantidad]


# ─────────────────────────────────────────────
# REPORTES
# ─────────────────────────────────────────────

class ResumenReporte(BaseModel):
    total: int
    pendientes: int
    atendidos: int
    promedioAtencionXDias: float

class EvolucionItem(BaseModel):
    fecha: str
    cantidad: int

class ProductividadAbogado(BaseModel):
    nombre: str
    asignados: int
    atendidos: int
    puntos: int
    eficiencia: int

class DistribucionComplejidad(BaseModel):
    nombre: str
    cantidad: int
    fill: str

class TopProcedencia(BaseModel):
    nombre: str
    cantidad: int
    porcentaje: int

class ReporteOut(BaseModel):
    resumen: ResumenReporte
    evolucionSemanal: List[EvolucionItem]
    productividadAbogados: List[ProductividadAbogado]
    distribucionComplejidad: List[DistribucionComplejidad]
    topProcedencias: List[TopProcedencia]


# ─────────────────────────────────────────────
# MÓDULO PROYECTOS DE LEY
# ─────────────────────────────────────────────

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

# ── Evento ────────────────────────────────────

class PlEventoCreate(BaseModel):
    tipo: str                              # ingreso | derivacion | informe | opinion_final | reingreso
    fecha: str                             # YYYY-MM-DD
    documento: Optional[str] = None
    expediente: Optional[str] = None
    observaciones: Optional[str] = None
    registradoPor: Optional[str] = None
    # derivacion
    fechaSalidaDireccion: Optional[str] = None
    direccionIds: Optional[List[str]] = []  # IDs de PlDireccion
    profesionalIds: Optional[List[str]] = [] # IDs de PlProfesional
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

# ── Proyecto de Ley ───────────────────────────

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
    # Primer evento de ingreso (obligatorio al crear)
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


# ─────────────────────────────────────────────
# MÓDULO LEY DE TRANSPARENCIA
# ─────────────────────────────────────────────

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
    numeroExpediente:   Optional[str] = None
    fechaIngreso:       Optional[datetime] = None
    documentoIngreso:   Optional[str] = None
    direccion:          Optional[List[str]] = None
    estado:             Optional[str] = None
    fechaAtencion:      Optional[datetime] = None
    asunto:             Optional[str] = None
    documentoRespuesta: Optional[str] = None
    categoria:          Optional[List[str]] = None
    plazoInterno:       Optional[datetime] = None
    observaciones:      Optional[str] = None

class TransparenciaOut(BaseModel):
    id:                 str
    numeroExpediente:   str
    fechaIngreso:       datetime
    documentoIngreso:   Optional[str]
    direccion:          List[str]
    estado:             str
    fechaAtencion:      Optional[datetime]
    asunto:             str
    documentoRespuesta: Optional[str]
    categoria:          Optional[List[str]]
    plazoVencimiento:   Optional[datetime]
    plazoInterno:       Optional[datetime]
    observaciones:      Optional[str]
    creadoPor:          Optional[str]
    createdAt:          datetime
    updatedAt:          datetime

    class Config:
        from_attributes = True

    @field_validator('direccion', 'categoria', mode='before')
    def split_comma_separated(cls, v):
        if isinstance(v, str):
            return [d.strip() for d in v.split(',') if d.strip()]
        return v

class TransparenciaDashboardOut(BaseModel):
    total:           int
    pendientes:      int
    enProceso:       int
    atendidos:       int
    vencidos:        int
    proximosVencer:  int          # vencen en ≤3 días hábiles
    porDireccion:    List[ItemNombreCantidad]
    porCategoria:    List[ItemNombreCantidad]
