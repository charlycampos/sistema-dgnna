"""
Esquemas Pydantic para el microservicio de Consulta Normativa.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class UnidadNormativaSimpleOut(BaseModel):
    id: int
    referencia: str
    articulo: Optional[str] = None
    sumilla: Optional[str] = None
    vigente: int
    modificadoPor: Optional[str] = None
    orden: int
    documentoCodigo: Optional[str] = None

    class Config:
        from_attributes = True


class UnidadNormativaDetalleOut(BaseModel):
    id: int
    documentoId: int
    documentoCodigo: Optional[str] = None
    referencia: str
    libro: Optional[str] = None
    titulo: Optional[str] = None
    capitulo: Optional[str] = None
    articulo: Optional[str] = None
    numeral: Optional[str] = None
    literal: Optional[str] = None
    sumilla: Optional[str] = None
    texto: str
    vigente: int
    modificadoPor: Optional[str] = None
    paginaPdf: Optional[int] = None
    orden: int

    class Config:
        from_attributes = True


class DocumentoNormativoOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    tipo: str
    fechaPublicacion: Optional[str] = None
    versionCorpus: str
    estado: str
    totalArticulos: int
    createdAt: datetime

    class Config:
        from_attributes = True


class BusquedaItemOut(BaseModel):
    referencia: str
    documentoCodigo: str
    articulo: Optional[str] = None
    sumilla: Optional[str] = None
    fragmento: str
    score: float
    conteoCoincidencias: Optional[int] = 1
    vigente: int


class BusquedaRespuestaOut(BaseModel):
    total: int
    query: str
    items: List[BusquedaItemOut]


class ConsultaIARequest(BaseModel):
    pregunta: str = Field(..., min_length=3, max_length=1500)
    proveedor: Optional[str] = Field("deepseek", description="deepseek | gemini | openai | claude")
    modelo: Optional[str] = None
    documentoFiltro: Optional[str] = None  # ej. 'DL-1297' o 'DS-001-2018-MIMP'
    topK: Optional[int] = 4
    usuarioId: Optional[str] = None
    usuarioNombre: Optional[str] = None
    usuarioRol: Optional[str] = None


class CitaItem(BaseModel):
    referencia: str
    documentoCodigo: str
    articulo: Optional[str] = None
    sumilla: Optional[str] = None
    textoExtracto: str


class ConsultaIAResponse(BaseModel):
    id: Optional[int] = None
    pregunta: str
    respuesta: str
    citas: List[CitaItem] = []
    proveedorUsado: str
    modeloUsado: str
    latenciaMs: int
    verificado: bool
    versionCorpus: str = "2026.1"
    limiteAlcanzado: Optional[bool] = False
    consultasRestantesHoy: Optional[int] = None


class ContextoNormativoOut(BaseModel):
    referencia: str
    documentoCodigo: str
    articulo: Optional[str] = None
    sumilla: Optional[str] = None
    texto: str
    vigente: bool
    modificadoPor: Optional[str] = None


class ConfiguracionIAItemOut(BaseModel):
    proveedor: str
    nombreDisplay: str
    apiKeyEnmascarada: str
    tieneKey: bool
    modeloDefecto: str
    activo: int
    updatedAt: Optional[str] = None


class ConfiguracionIAGuardarIn(BaseModel):
    proveedor: str
    apiKey: Optional[str] = None
    modeloDefecto: Optional[str] = None
    activo: Optional[int] = 1


class ProbarConexionIn(BaseModel):
    proveedor: str
    apiKey: str
    modelo: Optional[str] = None


class ProbarConexionOut(BaseModel):
    exito: bool
    mensaje: str
    latenciaMs: int


class MetricasConsumoOut(BaseModel):
    totalConsultasHoy: int
    totalConsultasMes: int
    totalTokensMes: int
    costoEstimadoUSD: float
    limiteDiarioPorUsuario: int
    topUsuarios: List[dict] = []
    consultasRecientes: List[dict] = []


class ActualizarParametroIn(BaseModel):
    clave: str
    valor: str


