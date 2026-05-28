import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import ReservaSala
from schemas import ReservaSalaCreate, ReservaSalaUpdate, ReservaSalaOut
from auth import get_current_user

router = APIRouter(prefix="/api/sala-reuniones", tags=["sala-reuniones"])


@router.get("", response_model=List[ReservaSalaOut])
def listar_reservas(
    mes: Optional[str] = None,
    estado: Optional[str] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        q = db.query(ReservaSala)
        if mes:
            q = q.filter(ReservaSala.fecha.startswith(mes))
        if estado:
            q = q.filter(ReservaSala.estado == estado)
        if categoria:
            q = q.filter(ReservaSala.categoria == categoria)
        return q.order_by(ReservaSala.fecha, ReservaSala.horaInicio).all()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ReservaSalaOut, status_code=201)
def crear_reserva(
    body: ReservaSalaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        existentes = db.query(ReservaSala).filter(
            ReservaSala.fecha == body.fecha,
            ReservaSala.estado != "Cancelado",
        ).all()
        for ev in existentes:
            if body.horaInicio < ev.horaFin and body.horaFin > ev.horaInicio:
                raise HTTPException(
                    status_code=409,
                    detail=f"Conflicto con '{ev.titulo}' ({ev.horaInicio}–{ev.horaFin})"
                )

        reserva = ReservaSala(
            fecha       = body.fecha,
            titulo      = body.titulo.strip(),
            horaInicio  = body.horaInicio,
            horaFin     = body.horaFin,
            categoria   = body.categoria.strip(),
            estado      = body.estado,
            descripcion = body.descripcion,
            creadoPor   = body.creadoPor or current_user.get("nombre", ""),
        )
        db.add(reserva)
        db.commit()
        db.refresh(reserva)
        return reserva
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=ReservaSalaOut)
def actualizar_reserva(
    id: str,
    body: ReservaSalaUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        reserva = db.query(ReservaSala).filter(ReservaSala.id == id).first()
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        fecha       = body.fecha or reserva.fecha
        horaInicio  = body.horaInicio or reserva.horaInicio
        horaFin     = body.horaFin or reserva.horaFin
        nuevoEstado = body.estado or reserva.estado

        if nuevoEstado != "Cancelado":
            existentes = db.query(ReservaSala).filter(
                ReservaSala.fecha == fecha,
                ReservaSala.id != id,
                ReservaSala.estado != "Cancelado",
            ).all()
            for ev in existentes:
                if horaInicio < ev.horaFin and horaFin > ev.horaInicio:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Conflicto con '{ev.titulo}' ({ev.horaInicio}–{ev.horaFin})"
                    )

        if body.fecha is not None:       reserva.fecha       = body.fecha
        if body.titulo is not None:      reserva.titulo      = body.titulo.strip()
        if body.horaInicio is not None:  reserva.horaInicio  = body.horaInicio
        if body.horaFin is not None:     reserva.horaFin     = body.horaFin
        if body.categoria is not None:   reserva.categoria   = body.categoria.strip()
        if body.estado is not None:      reserva.estado      = body.estado
        if body.descripcion is not None: reserva.descripcion = body.descripcion

        db.commit()
        db.refresh(reserva)
        return reserva
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar_reserva(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    reserva = db.query(ReservaSala).filter(ReservaSala.id == id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    db.delete(reserva)
    db.commit()
    return {"success": True}
