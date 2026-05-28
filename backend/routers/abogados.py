from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Abogado
from schemas import AbogadoCreate, AbogadoUpdate, AbogadoOut
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/abogados", tags=["abogados"])


@router.get("", response_model=List[AbogadoOut])
def listar_abogados(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return db.query(Abogado).order_by(Abogado.nombre).all()


@router.post("", response_model=AbogadoOut, status_code=201)
def crear_abogado(
    body: AbogadoCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    abogado = Abogado(nombre=body.nombre.strip(), activo=body.activo)
    db.add(abogado)
    db.commit()
    db.refresh(abogado)
    return abogado


@router.put("/{id}", response_model=AbogadoOut)
def actualizar_abogado(
    id: str,
    body: AbogadoUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    abogado = db.query(Abogado).filter(Abogado.id == id).first()
    if not abogado:
        raise HTTPException(status_code=404, detail="Abogado no encontrado")

    if body.nombre is not None:
        abogado.nombre = body.nombre.strip()
    if body.activo is not None:
        abogado.activo = body.activo

    db.commit()
    db.refresh(abogado)
    return abogado


@router.delete("/{id}")
def eliminar_abogado(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    abogado = db.query(Abogado).filter(Abogado.id == id).first()
    if not abogado:
        raise HTTPException(status_code=404, detail="Abogado no encontrado")
    db.delete(abogado)
    db.commit()
    return {"success": True}
