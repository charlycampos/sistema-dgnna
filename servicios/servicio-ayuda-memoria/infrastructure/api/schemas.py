import json
from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


# ─── Enumeraciones Formales ──────────────────────────────────────────

class EstadoDocumento(str, Enum):
    BORRADOR = "BORRADOR"
    EN_REVISION = "EN_REVISION"
    APROBADO = "APROBADO"
    PUBLICADO = "PUBLICADO"
    HISTORICO = "HISTORICO"


class TipoAmbito(str, Enum):
    NACIONAL = "NACIONAL"
    REGIONAL = "REGIONAL"
    ESPECIFICO = "ESPECIFICO"


class DireccionDgnna(str, Enum):
    DPE = "DPE"
    DA = "DA"
    DSLD = "DSLD"
    DPNNA = "DPNNA"
    MULTIDIRECCIONAL = "MULTIDIRECCIONAL"
    COLABORATIVO = "COLABORATIVO"
    CONSOLIDADO = "CONSOLIDADO"


class TipoSeccion(str, Enum):
    TEXTO = "TEXTO"
    TABLA_DATOS = "TABLA_DATOS"
    GRAFICO = "GRAFICO"
    BITACORA = "BITACORA"
    CONCLUSIONES = "CONCLUSIONES"


class NivelRiesgo(str, Enum):
    BAJO = "BAJO"
    MODERADO = "MODERADO"
    ALTO = "ALTO"
    CRITICO = "CRITICO"


class EstadoPlantilla(str, Enum):
    BORRADOR = "BORRADOR"
    EN_REVISION = "EN_REVISION"
    VIGENTE = "VIGENTE"
    RETIRADA = "RETIRADA"


# ─── Schemas de Configuración y Plantillas ──────────────────────────

class SeccionConfig(BaseModel):
    id: Optional[str] = None
    orden: int = Field(default=1, ge=1, le=100)
    titulo: str = Field(min_length=1, max_length=250)
    tipoSeccion: TipoSeccion = TipoSeccion.TEXTO
    guiaLlenado: Optional[str] = Field(default=None, max_length=500)
    direccionSugerida: Optional[str] = Field(default=None, max_length=30)
    configuracionJson: Optional[str] = None

    @field_validator("configuracionJson")
    @classmethod
    def validar_json(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            try:
                json.loads(v)
            except Exception as e:
                raise ValueError(f"JSON de configuración inválido: {e}")
        return v


class PlantillaCreate(BaseModel):
    codigo: Optional[str] = Field(default=None, max_length=50)
    nombre: str = Field(min_length=2, max_length=250)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    tipoAmbito: TipoAmbito = TipoAmbito.NACIONAL
    direccionDuena: DireccionDgnna = DireccionDgnna.MULTIDIRECCIONAL
    esOficial: bool = False
    version: str = Field(default="1.0", max_length=20)
    estadoPlantilla: EstadoPlantilla = EstadoPlantilla.VIGENTE
    secciones: List[SeccionConfig] = Field(default_factory=list)


class PlantillaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=250)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    tipoAmbito: Optional[TipoAmbito] = None
    direccionDuena: Optional[DireccionDgnna] = None
    version: Optional[str] = Field(default=None, max_length=20)
    estadoPlantilla: Optional[EstadoPlantilla] = None
    secciones: Optional[List[SeccionConfig]] = None


class PlantillaClonarRequest(BaseModel):
    nuevoCodigo: Optional[str] = Field(default=None, max_length=50)
    nuevoNombre: Optional[str] = Field(default=None, min_length=2, max_length=250)
    nuevaVersion: str = Field(default="1.0", max_length=20)


# ─── Schemas de Documentos y Valores ────────────────────────────────

class DocumentoCreate(BaseModel):
    plantillaId: str = Field(min_length=1, max_length=36)
    titulo: str = Field(min_length=3, max_length=300)
    region: Optional[str] = Field(default=None, max_length=100)
    fechaCorte: Optional[str] = Field(default=None, max_length=50)
    direccion: DireccionDgnna = DireccionDgnna.DPE
    nivelRiesgo: Optional[NivelRiesgo] = None
    servicioMimp: Optional[str] = Field(default=None, max_length=200)


class ValorUpdate(BaseModel):
    seccionId: str = Field(min_length=1, max_length=36)
    textoContenido: Optional[str] = Field(default=None, max_length=50000)
    datosTablaJson: Optional[str] = None
    datosGraficoJson: Optional[str] = None
    cifraCorte: Optional[str] = Field(default=None, max_length=100)

    @field_validator("datosTablaJson", "datosGraficoJson")
    @classmethod
    def validar_json_datos(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            try:
                parsed = json.loads(v)
                if not isinstance(parsed, (list, dict)):
                    raise ValueError("El JSON debe contener un arreglo o un objeto")
            except Exception as e:
                raise ValueError(f"Formato JSON inválido: {e}")
        return v


class DocumentoUpdate(BaseModel):
    # Nota: "estado" no forma parte de este esquema a propósito. Los cambios de
    # estado se hacen exclusivamente a través de /revisar, /observar, /aprobar,
    # /publicar y /versionar, cada uno con su propia validación de permisos.
    titulo: Optional[str] = Field(default=None, min_length=3, max_length=300)
    region: Optional[str] = Field(default=None, max_length=100)
    fechaCorte: Optional[str] = Field(default=None, max_length=50)
    direccion: Optional[DireccionDgnna] = None
    nivelRiesgo: Optional[NivelRiesgo] = None
    servicioMimp: Optional[str] = Field(default=None, max_length=200)
    valores: List[ValorUpdate] = Field(default_factory=list)


class AccionCreate(BaseModel):
    fecha: str = Field(min_length=1, max_length=50)
    institucion: Optional[str] = Field(default=None, max_length=200)
    descripcion: str = Field(min_length=2, max_length=10000)


class DocumentoObservarRequest(BaseModel):
    observaciones: str = Field(min_length=3, max_length=5000)


class DocumentoVersionarRequest(BaseModel):
    nuevaVersion: str = Field(default="2.0", max_length=20)
    motivo: Optional[str] = Field(default=None, max_length=500)


