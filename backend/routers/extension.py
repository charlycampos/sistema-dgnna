from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import ExtensionRango
from schemas import ExtensionRangoCreate, ExtensionRangoUpdate, ExtensionRangoOut
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/extension", tags=["extension"])


@router.get("", response_model=List[ExtensionRangoOut])
def listar(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return db.query(ExtensionRango).order_by(ExtensionRango.minFolios).all()


@router.post("", response_model=ExtensionRangoOut, status_code=201)
def crear(
    body: ExtensionRangoCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    obj = ExtensionRango(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{id}", response_model=ExtensionRangoOut)
def actualizar(
    id: str,
    body: ExtensionRangoUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    obj = db.query(ExtensionRango).filter(ExtensionRango.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Rango no encontrado")

    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(obj, campo, valor)

    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}")
def eliminar(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    obj = db.query(ExtensionRango).filter(ExtensionRango.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Rango no encontrado")
    db.delete(obj)
    db.commit()
    return {"success": True}
