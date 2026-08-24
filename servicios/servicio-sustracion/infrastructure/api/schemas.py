from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class BitacoraEntradaCreate(BaseModel):
    fecha:     str
    texto:     str
    creadoPor: Optional[str] = None

class BitacoraEntradaOut(BaseModel):
    id:        str
    casoId:    str
    fecha:     str
    texto:     str
    creadoPor: Optional[str] = None
    createdAt: datetime

class HistorialJudicialCreate(BaseModel):
    etapa:       str
    fecha:       str
    descripcion: Optional[str] = None
    creadoPor:   Optional[str] = None

class HistorialJudicialOut(BaseModel):
    id:          str
    casoId:      str
    etapa:       str
    fecha:       str
    descripcion: Optional[str] = None
    creadoPor:   Optional[str] = None
    createdAt:   datetime

class NnaCreate(BaseModel):
    nombres: str
    primerApellido: str
    segundoApellido: Optional[str] = None
    sexo: Optional[str] = None
    fechaNacimiento: Optional[str] = None
    edad: Optional[str] = None
    tipoEdad: Optional[str] = None

class NnaOut(NnaCreate):
    id: str
    casoId: str
    createdAt: datetime

class RequisitoProceso(BaseModel):
    id: str
    nombre: str
    estado: str

class ProcesoOperativoUpdate(BaseModel):
    faseOperativa: Optional[str] = None
    evaluacionResultado: Optional[str] = None
    requisitos: Optional[List[RequisitoProceso]] = None
    fechaObservacion: Optional[str] = None
    fechaNotificacion: Optional[str] = None
    fechaLimiteSubsanacion: Optional[str] = None
    ampliacionSubsanacion: Optional[str] = None
    fechaRespuestaSubsanacion: Optional[str] = None
    resultadoSubsanacion: Optional[str] = None
    detalleSubsanacion: Optional[str] = None
    destinatarioGestion: Optional[str] = None
    tipoComunicacion: Optional[str] = None
    fechaEnvio: Optional[str] = None
    referenciaSgd: Optional[str] = None
    respuestaEsperada: Optional[str] = None
    proximaAccion: Optional[str] = None
    fechaLimite: Optional[str] = None
    respuestaRecibida: Optional[str] = None
    estadoCooperacion: Optional[str] = None
    estadoRetornoVoluntario: Optional[str] = None
    propuestaRetorno: Optional[str] = None
    fechaPrevistaRetorno: Optional[str] = None
    compromisosRetorno: Optional[str] = None
    fechaAcuerdo: Optional[str] = None
    fechaLimitePasajes: Optional[str] = None
    pasajesRecibidos: Optional[str] = None
    fechaRetornoEfectivo: Optional[str] = None
    fechaEntrevista: Optional[str] = None
    resultadoEntrevista: Optional[str] = None

class ProcesoOperativoOut(ProcesoOperativoUpdate):
    casoId: str
    faseOperativa: str
    requisitos: List[RequisitoProceso] = Field(default_factory=list)
    updatedAt: datetime

class CasoSustracionCreate(BaseModel):
    codigo:      str
    nnaNombres:   Optional[str] = None
    nnaPrimerApellido: Optional[str] = None
    nnaSegundoApellido: Optional[str] = None
    pais:        str
    fechaIngreso: str
    nnaSexo:     Optional[str] = None
    nnaEdad:     Optional[str] = None
    nnaTipoEdad: Optional[str] = None
    nnaFechaNac: Optional[str] = None
    etapa:           Optional[str] = None
    tipoSolicitud:   Optional[str] = None
    acPeru:          Optional[str] = None
    fechaSalida:     Optional[str] = None
    solicitanteNombre:    Optional[str] = None
    solicitanteSexo:      Optional[str] = None
    solicitanteTelefono:  Optional[str] = None
    solicitanteCorreo:    Optional[str] = None
    solicitanteDomicilio: Optional[str] = None
    requeridoNombre:    Optional[str] = None
    requeridoSexo:      Optional[str] = None
    requeridoTelefono:  Optional[str] = None
    requeridoCorreo:    Optional[str] = None
    requeridoDomicilio: Optional[str] = None
    profesional:         Optional[str] = None
    estado:              str = "Pendiente"
    fechaEntrevista:     Optional[str] = None
    resultadoEntrevista: Optional[str] = None
    estadoJudicial:        Optional[str] = None
    fechaDemanda:          Optional[str] = None
    numExpedienteJudicial: Optional[str] = None
    juzgado:               Optional[str] = None
    sentencia1ra:          Optional[str] = None
    sentencia2da:          Optional[str] = None
    casacion:              Optional[str] = None
    motivoCierre: Optional[str] = None
    retorno:      Optional[str] = None
    observaciones: Optional[str] = None
    creadoPor:     Optional[str] = None
    nna: List[NnaCreate] = Field(default_factory=list)

class CasoSustracionUpdate(CasoSustracionCreate):
    codigo:      Optional[str] = None
    nnaNombres:   Optional[str] = None
    nnaPrimerApellido: Optional[str] = None
    nnaSegundoApellido: Optional[str] = None
    pais:        Optional[str] = None
    fechaIngreso: Optional[str] = None

class CasoSustracionOut(CasoSustracionCreate):
    id:        str
    createdAt: datetime
    updatedAt: datetime
    bitacora:          List[BitacoraEntradaOut]   = Field(default_factory=list)
    historialJudicial: List[HistorialJudicialOut] = Field(default_factory=list)
    nna: List[NnaOut] = Field(default_factory=list)
    procesoOperativo: Optional[ProcesoOperativoOut] = None
