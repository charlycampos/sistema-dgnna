from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
import uuid


@dataclass
class BitacoraSustracion:
    casoId:    str
    fecha:     str
    texto:     str
    creadoPor: Optional[str] = None
    id:        str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = field(default_factory=datetime.utcnow)


@dataclass
class HistorialJudicial:
    casoId:      str
    etapa:       str
    fecha:       str
    descripcion: Optional[str] = None
    creadoPor:   Optional[str] = None
    id:          str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt:   datetime = field(default_factory=datetime.utcnow)


@dataclass
class CasoSustracion:
    codigo:      str
    nnaNombre:   str
    pais:        str
    fechaIngreso: str
    # NNA
    nnaSexo:     Optional[str] = None
    nnaEdad:     Optional[str] = None
    nnaTipoEdad: Optional[str] = None
    nnaFechaNac: Optional[str] = None
    # Trámite
    etapa:           Optional[str] = None
    tipoSolicitud:   Optional[str] = None
    acPeru:          Optional[str] = None
    fechaSalida:     Optional[str] = None
    # Solicitante
    solicitanteNombre:    Optional[str] = None
    solicitanteSexo:      Optional[str] = None
    solicitanteTelefono:  Optional[str] = None
    solicitanteCorreo:    Optional[str] = None
    solicitanteDomicilio: Optional[str] = None
    # Requerido
    requeridoNombre:    Optional[str] = None
    requeridoSexo:      Optional[str] = None
    requeridoTelefono:  Optional[str] = None
    requeridoCorreo:    Optional[str] = None
    requeridoDomicilio: Optional[str] = None
    # Gestión
    profesional:         Optional[str] = None
    estado:              str = "Tramite"
    fechaEntrevista:     Optional[str] = None
    resultadoEntrevista: Optional[str] = None
    # Judicial
    estadoJudicial:        Optional[str] = None
    fechaDemanda:          Optional[str] = None
    numExpedienteJudicial: Optional[str] = None
    juzgado:               Optional[str] = None
    sentencia1ra:          Optional[str] = None
    sentencia2da:          Optional[str] = None
    casacion:              Optional[str] = None
    # Cierre
    motivoCierre: Optional[str] = None
    retorno:      Optional[str] = None
    # General
    observaciones: Optional[str] = None
    creadoPor:     Optional[str] = None
    id:            str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt:     datetime = field(default_factory=datetime.utcnow)
    updatedAt:     datetime = field(default_factory=datetime.utcnow)
    bitacora:          List[BitacoraSustracion] = field(default_factory=list)
    historialJudicial: List[HistorialJudicial]  = field(default_factory=list)

    def actualizar_estado_judicial(self) -> None:
        """Regla de negocio: el estado judicial es la etapa más reciente del historial."""
        if self.historialJudicial:
            ultimo = sorted(self.historialJudicial, key=lambda h: (h.fecha, h.createdAt), reverse=True)[0]
            self.estadoJudicial = ultimo.etapa
        else:
            self.estadoJudicial = "Sin demanda"
