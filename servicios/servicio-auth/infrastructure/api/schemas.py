from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ModuloPermisoIn(BaseModel):
    modulo:    str
    rolModulo: str

class ModuloPermisoOut(BaseModel):
    modulo:    str
    rolModulo: str

class LoginRequest(BaseModel):
    email:    str
    password: str

class LoginResponse(BaseModel):
    ok:           bool
    nombre:       str
    rol:          str
    modulos:      List[ModuloPermisoOut]
    access_token: str

class UsuarioCreate(BaseModel):
    nombre:   str
    email:    str
    password: str
    rol:      str = "usuario"
    modulos:  Optional[List[ModuloPermisoIn]] = None

class UsuarioUpdate(BaseModel):
    nombre:   Optional[str] = None
    email:    Optional[str] = None
    password: Optional[str] = None
    rol:      Optional[str] = None
    activo:   Optional[bool] = None
    modulos:  Optional[List[ModuloPermisoIn]] = None

class UsuarioOut(BaseModel):
    id:        str
    nombre:    str
    email:     str
    rol:       str
    activo:    bool
    modulos:   List[ModuloPermisoOut] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
