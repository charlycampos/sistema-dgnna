import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional

from database import get_db
from models import (
    ProyectoLey, PlEvento, PlEventoDireccion, PlEventoProfesional,
    PlComision, PlCongresista, PlTipoOpinion, PlDireccion, PlProfesional,
)
from schemas import (
    ProyectoLeyCreate, ProyectoLeyUpdate, ProyectoLeyOut,
    PlEventoCreate, PlEventoOut,
    CatalogosPlOut,
    PlComisionOut, PlCongresistaOut, PlTipoOpinionOut, PlDireccionOut, PlProfesionalOut,
)
from auth import get_current_user

router = APIRouter(prefix="/api/proyectos-ley", tags=["proyectos-ley"])


def _cargar_pl(db: Session, id: str) -> ProyectoLey:
    """Carga un PL con todas sus relaciones."""
    pl = (
        db.query(ProyectoLey)
        .options(
            selectinload(ProyectoLey.comision),
            selectinload(ProyectoLey.congresista),
            selectinload(ProyectoLey.eventos).selectinload(PlEvento.direcciones).selectinload(PlEventoDireccion.direccion),
            selectinload(ProyectoLey.eventos).selectinload(PlEvento.profesionales).selectinload(PlEventoProfesional.profesional),
        )
        .filter(ProyectoLey.id == id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Proyecto de Ley no encontrado")
    return pl


# ── Catálogos ──────────────────────────────────────────────────────

@router.get("/catalogos", response_model=CatalogosPlOut)
def obtener_catalogos(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Devuelve todas las listas de opciones para los formularios."""
    return CatalogosPlOut(
        comisiones   = db.query(PlComision).filter(PlComision.activo == True).order_by(PlComision.nombre).all(),
        congresistas = db.query(PlCongresista).filter(PlCongresista.activo == True).order_by(PlCongresista.nombre).all(),
        tiposOpinion = db.query(PlTipoOpinion).filter(PlTipoOpinion.activo == True).order_by(PlTipoOpinion.nombre).all(),
        direcciones  = db.query(PlDireccion).filter(PlDireccion.activo == True).order_by(PlDireccion.nombre).all(),
        profesionales= db.query(PlProfesional).filter(PlProfesional.activo == True).order_by(PlProfesional.nombre).all(),
    )


# ── Listado ────────────────────────────────────────────────────────

@router.get("", response_model=List[ProyectoLeyOut])
def listar_proyectos(
    q:       Optional[str] = None,
    opinion: Optional[str] = None,
    estado:  Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        query = (
            db.query(ProyectoLey)
            .options(
                selectinload(ProyectoLey.comision),
                selectinload(ProyectoLey.congresista),
                selectinload(ProyectoLey.eventos)
                    .selectinload(PlEvento.direcciones)
                    .selectinload(PlEventoDireccion.direccion),
                selectinload(ProyectoLey.eventos)
                    .selectinload(PlEvento.profesionales)
                    .selectinload(PlEventoProfesional.profesional),
            )
        )
        if estado:
            query = query.filter(ProyectoLey.estado == estado)
        if opinion:
            query = query.filter(ProyectoLey.opinion == opinion)
        if q:
            like = f"%{q}%"
            query = query.filter(
                ProyectoLey.numeroPL.ilike(like) |
                ProyectoLey.sumilla.ilike(like) |
                ProyectoLey.expediente.ilike(like)
            )
        return query.order_by(ProyectoLey.createdAt.desc()).all()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Crear ──────────────────────────────────────────────────────────

@router.post("", response_model=ProyectoLeyOut, status_code=201)
def crear_proyecto(
    body: ProyectoLeyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        data = body.model_dump()
        fecha_ingreso     = data.pop("fechaIngreso", "")
        documento_ingreso = data.pop("documentoIngreso", None)
        data["creadoPor"] = data.get("creadoPor") or current_user.get("nombre", "")

        pl = ProyectoLey(**data)
        db.add(pl)
        db.flush()  # genera el ID

        # Crear el primer evento de ingreso automáticamente
        if fecha_ingreso:
            evento = PlEvento(
                proyectoLeyId = pl.id,
                tipo          = "ingreso",
                fecha         = fecha_ingreso,
                documento     = documento_ingreso,
                registradoPor = data["creadoPor"],
            )
            db.add(evento)

        db.commit()
        return _cargar_pl(db, pl.id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Detalle ────────────────────────────────────────────────────────

@router.get("/{id}", response_model=ProyectoLeyOut)
def obtener_proyecto(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return _cargar_pl(db, id)


# ── Editar ─────────────────────────────────────────────────────────

@router.put("/{id}", response_model=ProyectoLeyOut)
def actualizar_proyecto(
    id: str,
    body: ProyectoLeyUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        pl = db.query(ProyectoLey).filter(ProyectoLey.id == id).first()
        if not pl:
            raise HTTPException(status_code=404, detail="Proyecto de Ley no encontrado")

        from datetime import datetime
        for field, val in body.model_dump(exclude_unset=True).items():
            setattr(pl, field, val)
        pl.updatedAt = datetime.utcnow()

        db.commit()
        return _cargar_pl(db, id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Eliminar ───────────────────────────────────────────────────────

@router.delete("/{id}")
def eliminar_proyecto(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    pl = db.query(ProyectoLey).filter(ProyectoLey.id == id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Proyecto de Ley no encontrado")
    db.delete(pl)
    db.commit()
    return {"success": True}


# ── Agregar evento ─────────────────────────────────────────────────

@router.post("/{id}/eventos", response_model=PlEventoOut, status_code=201)
def agregar_evento(
    id: str,
    body: PlEventoCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        pl = db.query(ProyectoLey).filter(ProyectoLey.id == id).first()
        if not pl:
            raise HTTPException(status_code=404, detail="Proyecto de Ley no encontrado")

        data = body.model_dump()
        direccion_ids  = data.pop("direccionIds", []) or []
        profesional_ids = data.pop("profesionalIds", []) or []
        data["registradoPor"] = data.get("registradoPor") or current_user.get("nombre", "")

        evento = PlEvento(proyectoLeyId=id, **data)
        db.add(evento)
        db.flush()

        # Relaciones N:N
        for did in direccion_ids:
            db.add(PlEventoDireccion(eventoId=evento.id, direccionId=did))
        for pid in profesional_ids:
            db.add(PlEventoProfesional(eventoId=evento.id, profesionalId=pid))

        # Si es opinion_final, actualizar estado y opinion del PL
        if body.tipo == "opinion_final" and body.opinionFinal:
            pl.opinion = body.opinionFinal
            pl.estado  = "emitido"

        from datetime import datetime
        pl.updatedAt = datetime.utcnow()

        db.commit()
        db.refresh(evento)

        # Recargar con relaciones
        return (
            db.query(PlEvento)
            .options(
                selectinload(PlEvento.direcciones).selectinload(PlEventoDireccion.direccion),
                selectinload(PlEvento.profesionales).selectinload(PlEventoProfesional.profesional),
            )
            .filter(PlEvento.id == evento.id)
            .first()
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Eliminar evento ────────────────────────────────────────────────

@router.delete("/{id}/eventos/{eventoId}")
def eliminar_evento(
    id: str,
    eventoId: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    evento = db.query(PlEvento).filter(
        PlEvento.id == eventoId,
        PlEvento.proyectoLeyId == id,
    ).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    db.delete(evento)
    db.commit()
    return {"success": True}
