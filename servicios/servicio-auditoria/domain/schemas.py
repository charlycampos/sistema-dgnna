"""
Esquemas Pydantic para el servicio de Auditoría y Trazabilidad.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AuditoriaEventoCreate(BaseModel):
    modulo: str = Field(..., description="Nombre del módulo (sustracion, apelaciones, proyectos-ley, etc.)")
    tablaAfectada: str = Field(..., description="Nombre de la tabla afectada")
    registroId: str = Field(..., description="ID del registro modificado")
    codigoReferencia: Optional[str] = Field(None, description="Número de expediente, código o referencia visible")
    accion: str = Field(..., description="Tipo de acción: CREAR, MODIFICAR, ELIMINAR, LOGIN, PERMISOS, EXPORTAR")
    camposCambiados: Optional[str] = Field(None, description="Campos modificados separados por coma")
    valoresPrevios: Optional[str] = Field(None, description="JSON string con valores anteriores")
    valoresNuevos: Optional[str] = Field(None, description="JSON string con valores nuevos")
    usuarioId: str = Field(..., description="ID del usuario ejecutor")
    usuarioNombre: str = Field(..., description="Nombre del usuario ejecutor")
    usuarioRol: Optional[str] = Field(None, description="Rol del usuario")
    ipOrigen: Optional[str] = Field(None, description="Dirección IP de origen")


class DiffItem(BaseModel):
    campo: str
    antes: Optional[Any] = None
    despues: Optional[Any] = None


class AuditoriaLogOut(BaseModel):
    id: str
    modulo: str
    tablaAfectada: str
    registroId: str
    codigoReferencia: Optional[str] = None
    accion: str
    camposCambiados: Optional[str] = None
    valoresPrevios: Optional[str] = None
    valoresNuevos: Optional[str] = None
    usuarioId: str
    usuarioNombre: str
    usuarioRol: Optional[str] = None
    ipOrigen: Optional[str] = None
    createdAt: datetime
    diffs: Optional[List[DiffItem]] = []

    class Config:
        from_attributes = True


class AuditoriaPaginadaOut(BaseModel):
    total: int
    page: int
    limit: int
    items: List[AuditoriaLogOut]


class AuditoriaKPIsOut(BaseModel):
    totalHoy: int
    totalModificaciones: int
    totalCreaciones: int
    totalEliminaciones: int
    totalSeguridad: int
    totalGeneral: int
    porModulo: Dict[str, int]
