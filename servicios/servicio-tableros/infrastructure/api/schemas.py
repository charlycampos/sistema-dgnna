from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class TableroBase(BaseModel):
    codigo_direccion: str = Field(..., description="DSLD, DPNNA, DPE, DA")
    titulo: str
    subtitulo: Optional[str] = None
    tipo: str = "powerbi"
    url_embed: Optional[str] = None
    descripcion: Optional[str] = None
    responsable: Optional[str] = None
    estado: str = "activo"
    orden: int = 1
    activo: bool = True

class TableroCreate(TableroBase):
    pass

class TableroUpdate(BaseModel):
    titulo: Optional[str] = None
    subtitulo: Optional[str] = None
    codigo_direccion: Optional[str] = None
    tipo: Optional[str] = None
    url_embed: Optional[str] = None
    descripcion: Optional[str] = None
    responsable: Optional[str] = None
    estado: Optional[str] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None

class TableroOut(TableroBase):
    id: str
    es_personalizado: bool
    creado_en: datetime

    class Config:
        from_attributes = True
