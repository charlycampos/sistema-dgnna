import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional

from database import get_db
from models import CasoSustracion, BitacoraSustracion, HistorialJudicial
from schemas import (
    CasoSustracionCreate, CasoSustracionUpdate, CasoSustracionOut,
    BitacoraEntradaCreate, BitacoraEntradaOut,
    HistorialJudicialCreate, HistorialJudicialOut,
)
from auth import get_current_user

router = APIRouter(prefix="/api/sustracion", tags=["sustracion"])


# ── Casos ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[CasoSustracionOut])
def listar_casos(
    estado: Optional[str] = None,
    profesional: Optional[str] = None,
    pais: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        query = db.query(CasoSustracion).options(
            selectinload(CasoSustracion.bitacora),
            selectinload(CasoSustracion.historialJudicial),
        )
        if estado:
            query = query.filter(CasoSustracion.estado == estado)
        if profesional:
            query = query.filter(CasoSustracion.profesional == profesional)
        if pais:
            query = query.filter(CasoSustracion.pais == pais)
        if q:
            like = f"%{q}%"
            query = query.filter(
                CasoSustracion.nnaNombre.ilike(like) |
                CasoSustracion.codigo.ilike(like)
            )
        return query.order_by(CasoSustracion.createdAt.desc()).all()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CasoSustracionOut, status_code=201)
def crear_caso(
    body: CasoSustracionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        existe = db.query(CasoSustracion).filter(CasoSustracion.codigo == body.codigo).first()
        if existe:
            raise HTTPException(status_code=409, detail=f"El código '{body.codigo}' ya existe")

        data = body.model_dump()
        data["codigo"]    = data["codigo"].strip()
        data["nnaNombre"] = data["nnaNombre"].strip()
        data["pais"]      = data["pais"].strip()
        data["creadoPor"] = data.get("creadoPor") or current_user.get("nombre", "")

        caso = CasoSustracion(**data)
        db.add(caso)
        db.commit()
        db.refresh(caso)
        return caso
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=CasoSustracionOut)
def obtener_caso(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    caso = db.query(CasoSustracion).options(
        selectinload(CasoSustracion.bitacora),
        selectinload(CasoSustracion.historialJudicial),
    ).filter(CasoSustracion.id == id).first()
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@router.put("/{id}", response_model=CasoSustracionOut)
def actualizar_caso(
    id: str,
    body: CasoSustracionUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        caso = db.query(CasoSustracion).filter(CasoSustracion.id == id).first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

        # Actualizar campos dinámicamente
        # Usamos exclude_unset=True para permitir enviar nulls explícitos si fuera necesario
        update_data = body.model_dump(exclude_unset=True)
        
        # Si se intenta cambiar el código, verificar que no exista otro con el mismo
        if "codigo" in update_data and update_data["codigo"] != caso.codigo:
            nuevo_codigo = update_data["codigo"].strip()
            existe = db.query(CasoSustracion).filter(
                CasoSustracion.codigo == nuevo_codigo,
                CasoSustracion.id != id
            ).first()
            if existe:
                raise HTTPException(status_code=409, detail=f"El código '{nuevo_codigo}' ya está en uso por otro caso")
            update_data["codigo"] = nuevo_codigo

        for field, val in update_data.items():
            if isinstance(val, str) and field != "codigo": # código ya se limpió arriba
                val = val.strip()
            setattr(caso, field, val)

        from datetime import datetime
        caso.updatedAt = datetime.utcnow()

        db.commit()
        
        # Volvemos a cargar con relaciones para el response_model
        return db.query(CasoSustracion).options(
            selectinload(CasoSustracion.bitacora),
            selectinload(CasoSustracion.historialJudicial),
        ).filter(CasoSustracion.id == id).first()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar_caso(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    caso = db.query(CasoSustracion).filter(CasoSustracion.id == id).first()
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    db.delete(caso)
    db.commit()
    return {"success": True}


# ── Bitácora ──────────────────────────────────────────────────────────

@router.post("/{id}/bitacora", response_model=BitacoraEntradaOut, status_code=201)
def agregar_bitacora(
    id: str,
    body: BitacoraEntradaCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        caso = db.query(CasoSustracion).filter(CasoSustracion.id == id).first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

        entrada = BitacoraSustracion(
            casoId    = id,
            fecha     = body.fecha,
            texto     = body.texto.strip(),
            creadoPor = body.creadoPor or current_user.get("nombre", ""),
        )
        db.add(entrada)
        db.commit()
        db.refresh(entrada)
        return entrada
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/bitacora/{entradaId}")
def eliminar_bitacora(
    id: str,
    entradaId: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    entrada = db.query(BitacoraSustracion).filter(
        BitacoraSustracion.id == entradaId,
        BitacoraSustracion.casoId == id,
    ).first()
    if not entrada:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    db.delete(entrada)
    db.commit()
    return {"success": True}


# ── Historial Judicial ────────────────────────────────────────────────

@router.post("/{id}/historial-judicial", response_model=HistorialJudicialOut, status_code=201)
def agregar_historial_judicial(
    id: str,
    body: HistorialJudicialCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        caso = db.query(CasoSustracion).filter(CasoSustracion.id == id).first()
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

        entrada = HistorialJudicial(
            casoId      = id,
            etapa       = body.etapa,
            fecha       = body.fecha,
            descripcion = body.descripcion,
            creadoPor   = body.creadoPor or current_user.get("nombre", ""),
        )
        db.add(entrada)

        # Actualizar estadoJudicial al del evento registrado
        caso.estadoJudicial = body.etapa

        db.commit()
        db.refresh(entrada)
        return entrada
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/historial-judicial/{entradaId}")
def eliminar_historial_judicial(
    id: str,
    entradaId: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    try:
        entrada = db.query(HistorialJudicial).filter(
            HistorialJudicial.id == entradaId,
            HistorialJudicial.casoId == id,
        ).first()
        if not entrada:
            raise HTTPException(status_code=404, detail="Entrada no encontrada")

        db.delete(entrada)
        db.flush()

        # Recalcular estadoJudicial desde las entradas restantes (más reciente)
        caso = db.query(CasoSustracion).filter(CasoSustracion.id == id).first()
        ultima = (
            db.query(HistorialJudicial)
            .filter(HistorialJudicial.casoId == id)
            .order_by(HistorialJudicial.fecha.desc(), HistorialJudicial.createdAt.desc())
            .first()
        )
        caso.estadoJudicial = ultima.etapa if ultima else "Sin demanda"

        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
