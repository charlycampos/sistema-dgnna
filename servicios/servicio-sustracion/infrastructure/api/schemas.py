from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


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

class CasoSustracionCreate(BaseModel):
    codigo:      str
    nnaNombre:   str
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
    estado:              str = "Tramite"
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

class CasoSustracionUpdate(CasoSustracionCreate):
    codigo:      Optional[str] = None
    nnaNombre:   Optional[str] = None
    pais:        Optional[str] = None
    fechaIngreso: Optional[str] = None

class CasoSustracionOut(CasoSustracionCreate):
    id:        str
    createdAt: datetime
    updatedAt: datetime
    bitacora:          List[BitacoraEntradaOut]   = []
    historialJudicial: List[HistorialJudicialOut] = []
