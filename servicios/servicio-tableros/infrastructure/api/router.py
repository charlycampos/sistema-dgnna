import os
import uuid
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

from infrastructure.api.schemas import TableroCreate, TableroOut, TableroUpdate
from infrastructure.db.database import get_db
from infrastructure.db.models import TableroModel


router = APIRouter(prefix="/api/tableros", tags=["Tableros de Direcciones"])
bearer = HTTPBearer(auto_error=False)
SECRET_KEY = os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026")


def usuario_autenticado(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")


def gestor_tableros(usuario: dict = Depends(usuario_autenticado)) -> dict:
    if usuario.get("rol") in {"admin", "director", "directora"}:
        return usuario
    for permiso in usuario.get("modulos") or []:
        if (
            permiso.get("modulo") in {"tableros-direcciones", "director"}
            and permiso.get("rolModulo") in {"registrador", "admin"}
        ):
            return usuario
    raise HTTPException(status_code=403, detail="No autorizado para gestionar tableros")


@router.get("", response_model=List[TableroOut])
def listar_tableros(
    direccion: Optional[str] = None,
    solo_activos: bool = True,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(usuario_autenticado),
):
    query = db.query(TableroModel)
    if solo_activos:
        query = query.filter(TableroModel.activo == True)
    if direccion:
        query = query.filter(TableroModel.codigo_direccion == direccion.upper())
    return query.order_by(
        TableroModel.codigo_direccion,
        TableroModel.orden,
        TableroModel.creado_en,
        TableroModel.id,
    ).all()


@router.get("/{tablero_id}", response_model=TableroOut)
def obtener_tablero(
    tablero_id: str,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(usuario_autenticado),
):
    tablero = db.query(TableroModel).filter(TableroModel.id == tablero_id).first()
    if not tablero:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    return tablero


@router.post("", response_model=TableroOut, status_code=status.HTTP_201_CREATED)
def crear_tablero(
    payload: TableroCreate,
    db: Session = Depends(get_db),
    _gestor: dict = Depends(gestor_tableros),
):
    tablero_id = f"tablero-{payload.codigo_direccion.lower()}-{uuid.uuid4().hex[:8]}"
    orden = payload.orden
    if orden is None:
        ultimo_orden = (
            db.query(func.max(TableroModel.orden))
            .filter(TableroModel.codigo_direccion == payload.codigo_direccion.upper())
            .scalar()
        )
        orden = (ultimo_orden or 0) + 1
    nuevo = TableroModel(
        id=tablero_id,
        codigo_direccion=payload.codigo_direccion.upper(),
        titulo=payload.titulo,
        subtitulo=payload.subtitulo,
        tipo=payload.tipo,
        url_embed=payload.url_embed,
        descripcion=payload.descripcion,
        responsable=payload.responsable,
        estado=payload.estado,
        orden=orden,
        activo=payload.activo,
        es_personalizado=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/{tablero_id}", response_model=TableroOut)
def actualizar_tablero(
    tablero_id: str,
    payload: TableroUpdate,
    db: Session = Depends(get_db),
    _gestor: dict = Depends(gestor_tableros),
):
    tablero = db.query(TableroModel).filter(TableroModel.id == tablero_id).first()
    if not tablero:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "codigo_direccion" in update_data and update_data["codigo_direccion"]:
        update_data["codigo_direccion"] = update_data["codigo_direccion"].upper()

    tipo_final = update_data.get("tipo", tablero.tipo)
    url_final = update_data.get("url_embed", tablero.url_embed)
    if tipo_final == "powerbi" and not url_final:
        raise HTTPException(status_code=422, detail="un tablero powerbi requiere url_embed")
    if tipo_final == "proximamente" and url_final:
        raise HTTPException(status_code=422, detail="un tablero proximamente no debe incluir url_embed")

    for key, value in update_data.items():
        setattr(tablero, key, value)

    db.commit()
    db.refresh(tablero)
    return tablero


@router.delete("/{tablero_id}")
def eliminar_tablero(
    tablero_id: str,
    db: Session = Depends(get_db),
    _gestor: dict = Depends(gestor_tableros),
):
    tablero = db.query(TableroModel).filter(TableroModel.id == tablero_id).first()
    if not tablero:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    db.delete(tablero)
    db.commit()
    return {"mensaje": "Tablero eliminado correctamente", "id": tablero_id}
