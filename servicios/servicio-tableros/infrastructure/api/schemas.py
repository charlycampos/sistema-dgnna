from datetime import datetime
from typing import Literal, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


DireccionCodigo = Literal["DSLD", "DPNNA", "DPE", "DA", "PREVENIR"]
TipoTablero = Literal["powerbi", "proximamente"]
EstadoTablero = Literal["activo", "desarrollo", "planificado"]
POWER_BI_HOSTS = {"app.powerbi.com", "embedded.powerbi.com"}


def validar_url_power_bi(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return None
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.hostname not in POWER_BI_HOSTS:
        raise ValueError("url_embed debe usar HTTPS y un dominio autorizado de Power BI")
    if parsed.username or parsed.password:
        raise ValueError("url_embed no puede contener credenciales")
    return value


class TableroBase(BaseModel):
    codigo_direccion: DireccionCodigo
    titulo: str = Field(..., min_length=1, max_length=200)
    subtitulo: Optional[str] = Field(None, max_length=300)
    tipo: TipoTablero = "powerbi"
    url_embed: Optional[str] = None
    descripcion: Optional[str] = Field(None, max_length=4000)
    responsable: Optional[str] = Field(None, max_length=150)
    estado: EstadoTablero = "activo"
    orden: int = Field(1, ge=0, le=10000)
    activo: bool = True

    _validar_url = field_validator("url_embed")(validar_url_power_bi)


class TableroCreate(TableroBase):
    # Si el cliente no define una posicion, la API la asigna al final de la
    # direccion. Esto evita que todos los submenus nuevos queden en orden 1.
    orden: Optional[int] = Field(None, ge=0, le=10000)

    @model_validator(mode="after")
    def validar_tipo_y_url(self):
        if self.tipo == "powerbi" and not self.url_embed:
            raise ValueError("un tablero powerbi requiere url_embed")
        if self.tipo == "proximamente" and self.url_embed:
            raise ValueError("un tablero proximamente no debe incluir url_embed")
        return self


class TableroUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=200)
    subtitulo: Optional[str] = Field(None, max_length=300)
    codigo_direccion: Optional[DireccionCodigo] = None
    tipo: Optional[TipoTablero] = None
    url_embed: Optional[str] = None
    descripcion: Optional[str] = Field(None, max_length=4000)
    responsable: Optional[str] = Field(None, max_length=150)
    estado: Optional[EstadoTablero] = None
    orden: Optional[int] = Field(None, ge=0, le=10000)
    activo: Optional[bool] = None

    _validar_url = field_validator("url_embed")(validar_url_power_bi)


class TableroOut(TableroBase):
    id: str
    es_personalizado: bool
    creado_en: datetime

    class Config:
        from_attributes = True
