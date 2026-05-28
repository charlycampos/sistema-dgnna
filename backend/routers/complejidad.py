from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import ComplejidadJuridica
from schemas import ComplejidadCreate, ComplejidadUpdate, ComplejidadOut
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/complejidad", tags=["complejidad"])


@router.get("", response_model=List[ComplejidadOut])
def listar(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return db.query(ComplejidadJuridica).order_by(ComplejidadJuridica.puntos).all()


@router.post("", response_model=ComplejidadOut, status_code=201)
def crear(
    body: ComplejidadCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    existente = db.query(ComplejidadJuridica).filter(
        ComplejidadJuridica.nombre == body.nombre
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe esa complejidad")

    obj = ComplejidadJuridica(nombre=body.nombre, puntos=body.puntos, activo=body.activo)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{id}", response_model=ComplejidadOut)
def actualizar(
    id: str,
    body: ComplejidadUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    obj = db.query(ComplejidadJuridica).filter(ComplejidadJuridica.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Complejidad no encontrada")

    if body.nombre is not None:
        obj.nombre = body.nombre
    if body.puntos is not None:
        obj.puntos = body.puntos
    if body.activo is not None:
        obj.activo = body.activo

    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}")
def eliminar(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    obj = db.query(ComplejidadJuridica).filter(ComplejidadJuridica.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Complejidad no encontrada")
    db.delete(obj)
    db.commit()
    return {"success": True}
