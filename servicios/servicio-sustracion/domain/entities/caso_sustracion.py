from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
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
class NnaSustracion:
    casoId: str
    nombres: str
    primerApellido: str
    segundoApellido: Optional[str] = None
    sexo: Optional[str] = None
    fechaNacimiento: Optional[str] = None
    edad: Optional[str] = None
    tipoEdad: Optional[str] = None
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ProcesoOperativoSustracion:
    casoId: str
    faseOperativa: str = "Evaluación"
    evaluacionResultado: Optional[str] = None
    requisitos: List[Dict[str, Any]] = field(default_factory=list)
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
    updatedAt: datetime = field(default_factory=datetime.utcnow)


@dataclass
class CasoSustracion:
    codigo:      str
    pais:        str
    fechaIngreso: str
    # NNA
    nnaNombres:   Optional[str] = None
    nnaPrimerApellido: Optional[str] = None
    nnaSegundoApellido: Optional[str] = None
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
    estado:              str = "Pendiente"
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
    nna:               List[NnaSustracion] = field(default_factory=list)
    procesoOperativo:  Optional[ProcesoOperativoSustracion] = None

    def actualizar_estado_judicial(self) -> None:
        """Regla de negocio: el estado judicial es la etapa más reciente del historial."""
        if self.historialJudicial:
            ultimo = sorted(self.historialJudicial, key=lambda h: (h.fecha, h.createdAt), reverse=True)[0]
            self.estadoJudicial = ultimo.etapa
        else:
            self.estadoJudicial = "Sin demanda"
