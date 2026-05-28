from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Apelacion, ComplejidadJuridica, ExtensionRango
from schemas import ApelacionCreate, ApelacionUpdate, ApelacionOut
from auth import require_module_access, can_write

router = APIRouter(prefix="/api/apelaciones", tags=["apelaciones"])

MODULO = "apelaciones"


def _calcular_puntos(db: Session, complejidad_id: str, folios: int):
    """Calcula puntosExtension y puntosComplejidad dado un complejidadId y folios."""
    complejidad = db.query(ComplejidadJuridica).filter(
        ComplejidadJuridica.id == complejidad_id
    ).first()
    if not complejidad:
        raise HTTPException(status_code=400, detail="Complejidad no encontrada")

    rangos = db.query(ExtensionRango).all()
    puntos_extension = 1
    for r in rangos:
        if folios >= r.minFolios and (r.maxFolios is None or folios <= r.maxFolios):
            puntos_extension = r.puntos
            break

    return puntos_extension, complejidad.puntos, puntos_extension + complejidad.puntos


# ─── GET /api/apelaciones ────────────────────────────────────────

@router.get("", response_model=List[ApelacionOut])
def listar(
    estado: Optional[str] = Query(None),
    abogadoId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_module_access(MODULO)),
):
    q = db.query(Apelacion)
    if estado:
        q = q.filter(Apelacion.estado == estado)
    if abogadoId:
        q = q.filter(Apelacion.abogadoId == abogadoId)
    return q.order_by(Apelacion.createdAt.desc()).all()


# ─── GET /api/apelaciones/{id} ───────────────────────────────────

@router.get("/{id}", response_model=ApelacionOut)
def obtener(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_module_access(MODULO)),
):
    ap = db.query(Apelacion).filter(Apelacion.id == id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Apelación no encontrada")
    return ap


# ─── POST /api/apelaciones ───────────────────────────────────────

@router.post("", response_model=ApelacionOut, status_code=201)
def crear(
    body: ApelacionCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(can_write(MODULO)),
):
    pts_ext, pts_comp, pts_total = _calcular_puntos(db, body.complejidadId, body.folios)

    ap = Apelacion(
        numeroExpediente  = body.numeroExpediente,
        fechaIngreso      = body.fechaIngreso,
        fechaIngresoMIMP  = body.fechaIngresoMIMP,
        plazoVencimiento  = body.plazoVencimiento,
        apelante          = body.apelante,
        nnaCar            = body.nnaCar,
        procedencia       = body.procedencia,
        documento         = body.documento,
        asunto            = body.asunto,
        folios            = body.folios,
        puntosExtension   = pts_ext,
        complejidadId     = body.complejidadId,
        puntosComplejidad = pts_comp,
        puntosTotal       = pts_total,
        abogadoId         = body.abogadoId,
        revisorId         = body.revisorId,
        fechaRevisor      = datetime.utcnow() if body.revisorId else None,
        fechaAsignacion   = body.fechaAsignacion or datetime.utcnow(),
        estado            = body.estado,
        numeroResolucion  = body.numeroResolucion,
        documentoAtencion = body.documentoAtencion,
        cargos            = body.cargos,
        observaciones     = body.observaciones,
    )
    db.add(ap)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al registrar apelación")
    db.refresh(ap)
    return ap


# ─── PUT /api/apelaciones/{id} ───────────────────────────────────

@router.put("/{id}", response_model=ApelacionOut)
def actualizar(
    id: str,
    body: ApelacionUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(can_write(MODULO)),
):
    ap = db.query(Apelacion).filter(Apelacion.id == id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Apelación no encontrada")

    pts_ext, pts_comp, pts_total = _calcular_puntos(db, body.complejidadId, body.folios)

    ap.numeroExpediente  = body.numeroExpediente
    ap.fechaIngreso      = body.fechaIngreso
    ap.fechaIngresoMIMP  = body.fechaIngresoMIMP
    ap.plazoVencimiento  = body.plazoVencimiento
    ap.apelante          = body.apelante
    ap.nnaCar            = body.nnaCar
    ap.procedencia       = body.procedencia
    ap.documento         = body.documento
    ap.asunto            = body.asunto
    ap.folios            = body.folios
    ap.puntosExtension   = pts_ext
    ap.complejidadId     = body.complejidadId
    ap.puntosComplejidad = pts_comp
    ap.puntosTotal       = pts_total
    ap.abogadoId         = body.abogadoId
    
    # Si el revisor asignado cambia, actualizamos automáticamente la fecha de revisor
    if body.revisorId != ap.revisorId:
        if body.revisorId:
            ap.fechaRevisor = datetime.utcnow()
        else:
            ap.fechaRevisor = None
            
    ap.revisorId         = body.revisorId
    if body.fechaAsignacion:
        ap.fechaAsignacion = body.fechaAsignacion
    ap.estado            = body.estado
    ap.numeroResolucion  = body.numeroResolucion
    ap.documentoAtencion = body.documentoAtencion
    ap.cargos            = body.cargos
    ap.observaciones     = body.observaciones
    ap.updatedAt         = datetime.utcnow()

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al actualizar apelación")
    db.refresh(ap)
    return ap


# ─── DELETE /api/apelaciones/{id} ────────────────────────────────

@router.delete("/{id}")
def eliminar(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(can_write(MODULO)),
):
    ap = db.query(Apelacion).filter(Apelacion.id == id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Apelación no encontrada")
    db.delete(ap)
    db.commit()
    return {"success": True}
