import logging
import traceback
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

logger = logging.getLogger(__name__)

from infrastructure.db.database import get_db
from infrastructure.db.models import (
    ProyectoLeyModel, PlEventoModel,
    PlEventoDireccionModel, PlEventoProfesionalModel,
    PlComisionModel, PlCongresistaModel,
    PlTipoOpinionModel, PlDireccionModel, PlProfesionalModel,
)
from infrastructure.api.schemas import (
    ProyectoLeyCreate, ProyectoLeyUpdate,
    PlEventoCreate,
)

router = APIRouter(prefix="/api/proyectos-ley", tags=["proyectos-ley"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/auth/login", auto_error=False)


@router.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    """Diagnóstico: verifica conectividad y conteo de tablas (sin auth)."""
    try:
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) FROM pl_comisiones")).scalar()
        return {"status": "ok", "pl_comisiones": result}
    except Exception as e:
        return {"status": "error", "detalle": traceback.format_exc()}


def get_usuario(token: str = Depends(oauth2_scheme)) -> str:
    import jwt, os
    if not token:
        return ""
    try:
        payload = jwt.decode(token, os.getenv("SESSION_SECRET", ""), algorithms=["HS256"])
        return payload.get("nombre", "")
    except Exception:
        return ""


# ── Helpers de serialización ──────────────────────────────────────────────────

def _dir_out(d) -> dict:
    return {"id": d.id, "nombre": d.nombre, "activo": bool(d.activo)}


def _prof_out(p) -> dict:
    return {"id": p.id, "nombre": p.nombre, "activo": bool(p.activo)}


def _evento_out(ev) -> dict:
    return {
        "id":                   ev.id,
        "proyectoLeyId":        ev.proyectoLeyId,
        "tipo":                 ev.tipo,
        "fecha":                ev.fecha,
        "documento":            ev.documento,
        "expediente":           ev.expediente,
        "observaciones":        ev.observaciones,
        "registradoPor":        ev.registradoPor,
        "fechaSalidaDireccion": ev.fechaSalidaDireccion,
        "numeroInforme":        ev.numeroInforme,
        "opinionDireccion":     ev.opinionDireccion,
        "direccionInforme":     ev.direccionInforme,
        "opinionFinal":         ev.opinionFinal,
        "fechaSalidaDGNNA":     ev.fechaSalidaDGNNA,
        "memoNota":             ev.memoNota,
        "createdAt":            ev.createdAt,
        "direcciones":  [_dir_out(ed.direccion)  for ed in ev.direcciones  if ed.direccion],
        "profesionales": [_prof_out(ep.profesional) for ep in ev.profesionales if ep.profesional],
    }


def _pl_out(pl) -> dict:
    return {
        "id":             pl.id,
        "numeroPL":       pl.numeroPL,
        "expediente":     pl.expediente,
        "documento":      pl.documento,
        "comisionId":     pl.comisionId,
        "congresistaId":  pl.congresistaId,
        "comision":       {"id": pl.comision.id, "nombre": pl.comision.nombre, "activo": bool(pl.comision.activo)} if pl.comision else None,
        "congresista":    {"id": pl.congresista.id, "nombre": pl.congresista.nombre, "partido": pl.congresista.partido, "activo": bool(pl.congresista.activo)} if pl.congresista else None,
        "sumilla":        pl.sumilla,
        "tema":           pl.tema,
        "opinion":        pl.opinion,
        "estado":         pl.estado,
        "estadoCongreso": pl.estadoCongreso,
        "observaciones":  pl.observaciones,
        "creadoPor":      pl.creadoPor,
        "createdAt":      pl.createdAt,
        "updatedAt":      pl.updatedAt,
        "eventos":        [_evento_out(ev) for ev in pl.eventos],
    }


def _load_pl(id: str, db: Session) -> ProyectoLeyModel:
    pl = (
        db.query(ProyectoLeyModel)
        .options(
            joinedload(ProyectoLeyModel.comision),
            joinedload(ProyectoLeyModel.congresista),
            joinedload(ProyectoLeyModel.eventos).joinedload(PlEventoModel.direcciones).joinedload(PlEventoDireccionModel.direccion),
            joinedload(ProyectoLeyModel.eventos).joinedload(PlEventoModel.profesionales).joinedload(PlEventoProfesionalModel.profesional),
        )
        .filter(ProyectoLeyModel.id == id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail=f"Proyecto de ley {id} no encontrado")
    return pl


# ── Rutas ─────────────────────────────────────────────────────────────────────

@router.get("/catalogos")
def obtener_catalogos(db: Session = Depends(get_db)):
    """Devuelve todos los catálogos necesarios para el módulo."""
    try:
        # Usamos == 1 en lugar de == True para evitar problemas con Oracle Boolean/NUMBER(1)
        comisiones   = db.query(PlComisionModel).filter(PlComisionModel.activo == 1).order_by(PlComisionModel.nombre).all()
        congresistas = db.query(PlCongresistaModel).filter(PlCongresistaModel.activo == 1).order_by(PlCongresistaModel.nombre).all()
        tiposOpinion = db.query(PlTipoOpinionModel).filter(PlTipoOpinionModel.activo == 1).order_by(PlTipoOpinionModel.nombre).all()
        direcciones  = db.query(PlDireccionModel).filter(PlDireccionModel.activo == 1).order_by(PlDireccionModel.nombre).all()
        profesionales= db.query(PlProfesionalModel).filter(PlProfesionalModel.activo == 1).order_by(PlProfesionalModel.nombre).all()
        return {
            "comisiones":   [{"id": c.id, "nombre": c.nombre, "activo": bool(c.activo)} for c in comisiones],
            "congresistas": [{"id": c.id, "nombre": c.nombre, "partido": c.partido or "", "activo": bool(c.activo)} for c in congresistas],
            "tiposOpinion": [{"id": t.id, "nombre": t.nombre, "activo": bool(t.activo)} for t in tiposOpinion],
            "direcciones":  [{"id": d.id, "nombre": d.nombre, "activo": bool(d.activo)} for d in direcciones],
            "profesionales":[{"id": p.id, "nombre": p.nombre, "activo": bool(p.activo)} for p in profesionales],
        }
    except Exception as e:
        logger.error("Error en /catalogos:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def listar(
    estado: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Lista proyectos de ley con filtros opcionales."""
    try:
        query = (
            db.query(ProyectoLeyModel)
            .options(
                joinedload(ProyectoLeyModel.comision),
                joinedload(ProyectoLeyModel.congresista),
                joinedload(ProyectoLeyModel.eventos).joinedload(PlEventoModel.direcciones).joinedload(PlEventoDireccionModel.direccion),
                joinedload(ProyectoLeyModel.eventos).joinedload(PlEventoModel.profesionales).joinedload(PlEventoProfesionalModel.profesional),
            )
        )
        if estado:
            query = query.filter(ProyectoLeyModel.estado == estado)
        if q:
            q_upper = q.upper()
            query = query.filter(
                func.upper(ProyectoLeyModel.numeroPL).like(f"%{q_upper}%")
                | func.upper(ProyectoLeyModel.sumilla).like(f"%{q_upper}%")
                | func.upper(ProyectoLeyModel.tema).like(f"%{q_upper}%")
            )
        pls = query.order_by(ProyectoLeyModel.createdAt.desc()).all()
        return [_pl_out(pl) for pl in pls]
    except Exception as e:
        logger.error("Error en listar proyectos:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
def crear(
    body: ProyectoLeyCreate,
    db: Session = Depends(get_db),
    usuario: str = Depends(get_usuario),
):
    """Crea un proyecto de ley con su primer evento de ingreso."""
    try:
        pl = ProyectoLeyModel(
            numeroPL=body.numeroPL,
            expediente=body.expediente,
            documento=body.documento,
            comisionId=body.comisionId or None,
            congresistaId=body.congresistaId or None,
            sumilla=body.sumilla,
            tema=body.tema,
            opinion=body.opinion,
            estado=body.estado or "en_proceso",
            estadoCongreso=body.estadoCongreso,
            observaciones=body.observaciones,
            creadoPor=usuario or body.creadoPor,
        )
        db.add(pl)
        db.flush()  # obtener el id antes del commit

        # Crear evento de ingreso inicial si se proporcionó fecha
        if body.fechaIngreso:
            ev = PlEventoModel(
                proyectoLeyId=pl.id,
                tipo="ingreso",
                fecha=body.fechaIngreso,
                documento=body.documentoIngreso,
                registradoPor=usuario or body.creadoPor,
            )
            db.add(ev)

        db.commit()
        return _load_pl(pl.id, db).__dict__ if False else _pl_out(_load_pl(pl.id, db))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def obtener(id: str, db: Session = Depends(get_db)):
    """Obtiene un proyecto de ley por ID con todos sus eventos."""
    return _pl_out(_load_pl(id, db))


@router.put("/{id}")
def actualizar(
    id: str,
    body: ProyectoLeyUpdate,
    db: Session = Depends(get_db),
):
    """Actualiza los campos del proyecto de ley."""
    pl = _load_pl(id, db)
    try:
        datos = body.model_dump(exclude_unset=True)
        # Convertir strings vacíos a None para FKs
        for fk in ("comisionId", "congresistaId"):
            if fk in datos and datos[fk] == "":
                datos[fk] = None
        for campo, valor in datos.items():
            setattr(pl, campo, valor)
        db.commit()
        return _pl_out(_load_pl(id, db))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, db: Session = Depends(get_db)):
    """Elimina un proyecto de ley y todos sus eventos (cascade)."""
    pl = db.query(ProyectoLeyModel).filter(ProyectoLeyModel.id == id).first()
    if not pl:
        raise HTTPException(status_code=404, detail=f"Proyecto de ley {id} no encontrado")
    try:
        db.delete(pl)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/eventos", status_code=201)
def agregar_evento(
    id: str,
    body: PlEventoCreate,
    db: Session = Depends(get_db),
    usuario: str = Depends(get_usuario),
):
    """Agrega un nuevo evento al timeline del proyecto de ley."""
    # Verificar que el PL existe
    pl = db.query(ProyectoLeyModel).filter(ProyectoLeyModel.id == id).first()
    if not pl:
        raise HTTPException(status_code=404, detail=f"Proyecto de ley {id} no encontrado")

    try:
        ev = PlEventoModel(
            proyectoLeyId=id,
            tipo=body.tipo,
            fecha=body.fecha,
            documento=body.documento,
            expediente=body.expediente,
            observaciones=body.observaciones,
            registradoPor=usuario or body.registradoPor,
            fechaSalidaDireccion=body.fechaSalidaDireccion,
            numeroInforme=body.numeroInforme,
            opinionDireccion=body.opinionDireccion,
            direccionInforme=body.direccionInforme,
            opinionFinal=body.opinionFinal,
            fechaSalidaDGNNA=body.fechaSalidaDGNNA,
            memoNota=body.memoNota,
        )
        db.add(ev)
        db.flush()

        # Asociar direcciones al evento
        for did in (body.direccionIds or []):
            if did:
                db.add(PlEventoDireccionModel(eventoId=ev.id, direccionId=did))

        # Asociar profesionales al evento
        for pid in (body.profesionalIds or []):
            if pid:
                db.add(PlEventoProfesionalModel(eventoId=ev.id, profesionalId=pid))

        # Si es opinion_final, actualizar estado y opinión del proyecto
        if body.tipo == "opinion_final" and body.opinionFinal:
            pl.opinion = body.opinionFinal
            pl.estado = "emitido"

        db.commit()
        return _pl_out(_load_pl(id, db))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/eventos")
def eliminar_eventos(id: str, db: Session = Depends(get_db)):
    """Elimina todos los eventos de un proyecto de ley (rollback del expediente)."""
    pl = db.query(ProyectoLeyModel).filter(ProyectoLeyModel.id == id).first()
    if not pl:
        raise HTTPException(status_code=404, detail=f"Proyecto de ley {id} no encontrado")
    try:
        db.query(PlEventoModel).filter(PlEventoModel.proyectoLeyId == id).delete(synchronize_session=False)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}/eventos/{evento_id}")
def eliminar_evento(id: str, evento_id: str, db: Session = Depends(get_db)):
    """Elimina un evento específico del proyecto de ley."""
    ev = db.query(PlEventoModel).filter(
        PlEventoModel.id == evento_id,
        PlEventoModel.proyectoLeyId == id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Evento {evento_id} no encontrado")
    try:
        db.delete(ev)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
