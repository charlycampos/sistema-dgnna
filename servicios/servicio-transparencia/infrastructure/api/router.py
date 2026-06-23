"""
Router del Módulo Ley de Transparencia.
Plazo legal: 10 días hábiles desde la fecha de ingreso (Ley N° 27806).
Feriados nacionales peruanos fijos incluidos en el cálculo.
"""
import logging
import traceback
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func

from infrastructure.db.database import get_db
from infrastructure.db.models import TransparenciaModel
from infrastructure.api.schemas import TransparenciaCreate, TransparenciaUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transparencia", tags=["transparencia"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/auth/login", auto_error=False)

# ── Feriados nacionales peruanos fijos (MM-DD) ────────────────────────────────
_FERIADOS_FIJOS = {
    "01-01", "05-01", "06-29", "07-28", "07-29",
    "08-30", "10-08", "11-01", "12-08", "12-09", "12-25",
}


def _es_dia_habil(fecha: datetime) -> bool:
    dow = fecha.weekday()  # 0=lunes … 6=domingo
    if dow >= 5:
        return False
    clave = fecha.strftime("%m-%d")
    return clave not in _FERIADOS_FIJOS


def calcular_plazo_habiles(fecha_inicio: datetime, dias: int = 10) -> datetime:
    resultado = fecha_inicio
    contados = 0
    while contados < dias:
        resultado += timedelta(days=1)
        if _es_dia_habil(resultado):
            contados += 1
    return resultado


def get_usuario(token: str = Depends(oauth2_scheme)) -> str:
    import jwt, os
    if not token:
        return ""
    try:
        payload = jwt.decode(token, os.getenv("SESSION_SECRET", ""), algorithms=["HS256"])
        return payload.get("nombre", "")
    except Exception:
        return ""


def _split(v) -> list:
    """Convierte una cadena separada por comas en lista (vacío -> [])."""
    if not v:
        return []
    if isinstance(v, list):
        return v
    return [s.strip() for s in v.split(",") if s.strip()]


def _out(r: TransparenciaModel) -> dict:
    return {
        "id":                 r.id,
        "numeroExpediente":   r.numeroExpediente,
        "fechaIngreso":       r.fechaIngreso,
        "documentoIngreso":   r.documentoIngreso,
        "direccion":          _split(r.direccion),
        "estado":             r.estado,
        "fechaAtencion":      r.fechaAtencion,
        "asunto":             r.asunto,
        "documentoRespuesta": r.documentoRespuesta,
        "categoria":          _split(r.categoria),
        "plazoVencimiento":   r.plazoVencimiento,
        "plazoInterno":       r.plazoInterno,
        "observaciones":      r.observaciones,
        "creadoPor":          r.creadoPor,
        "createdAt":          r.createdAt,
        "updatedAt":          r.updatedAt,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def listar(
    estado:    Optional[str] = Query(None),
    direccion: Optional[str] = Query(None),
    q:         Optional[str] = Query(None),
    db:        Session       = Depends(get_db),
):
    try:
        query = db.query(TransparenciaModel)
        if estado:
            query = query.filter(TransparenciaModel.estado == estado)
        if direccion:
            query = query.filter(TransparenciaModel.direccion == direccion)
        if q:
            q_upper = q.upper()
            query = query.filter(
                func.upper(TransparenciaModel.numeroExpediente).like(f"%{q_upper}%")
                | func.upper(TransparenciaModel.asunto).like(f"%{q_upper}%")
            )
        registros = query.order_by(TransparenciaModel.createdAt.desc()).all()
        return [_out(r) for r in registros]
    except Exception as e:
        logger.error("Error listando transparencia:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    try:
        ahora = datetime.utcnow()
        tres_dias = ahora + timedelta(days=3)

        total          = db.query(func.count(TransparenciaModel.id)).scalar() or 0
        pendientes     = db.query(func.count(TransparenciaModel.id)).filter(TransparenciaModel.estado == "Pendiente").scalar() or 0
        en_proceso     = db.query(func.count(TransparenciaModel.id)).filter(TransparenciaModel.estado == "En Proceso").scalar() or 0
        atendidos      = db.query(func.count(TransparenciaModel.id)).filter(TransparenciaModel.estado == "Atendido").scalar() or 0
        vencidos       = db.query(func.count(TransparenciaModel.id)).filter(
            TransparenciaModel.plazoVencimiento < ahora,
            TransparenciaModel.estado != "Atendido",
        ).scalar() or 0
        proximos_vencer = db.query(func.count(TransparenciaModel.id)).filter(
            TransparenciaModel.plazoVencimiento >= ahora,
            TransparenciaModel.plazoVencimiento <= tres_dias,
            TransparenciaModel.estado != "Atendido",
        ).scalar() or 0

        # Agrupados por dirección
        por_direccion = (
            db.query(TransparenciaModel.direccion, func.count(TransparenciaModel.id).label("cantidad"))
            .group_by(TransparenciaModel.direccion)
            .all()
        )

        # Agrupados por categoría
        por_categoria = (
            db.query(TransparenciaModel.categoria, func.count(TransparenciaModel.id).label("cantidad"))
            .filter(TransparenciaModel.categoria != None)
            .group_by(TransparenciaModel.categoria)
            .all()
        )

        return {
            "total":           total,
            "pendientes":      pendientes,
            "enProceso":       en_proceso,
            "atendidos":       atendidos,
            "vencidos":        vencidos,
            "proximosVencer":  proximos_vencer,
            "porDireccion":    [{"nombre": row[0] or "Sin dirección", "cantidad": row[1]} for row in por_direccion],
            "porCategoria":    [{"nombre": row[0] or "Sin categoría", "cantidad": row[1]} for row in por_categoria],
        }
    except Exception as e:
        logger.error("Error en dashboard transparencia:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}")
def obtener(id: str, db: Session = Depends(get_db)):
    r = db.query(TransparenciaModel).filter(TransparenciaModel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Registro {id} no encontrado")
    return _out(r)


@router.post("", status_code=201)
def crear(
    body:    TransparenciaCreate,
    db:      Session = Depends(get_db),
    usuario: str     = Depends(get_usuario),
):
    try:
        plazo = calcular_plazo_habiles(body.fechaIngreso, 10)
        r = TransparenciaModel(
            numeroExpediente=   body.numeroExpediente,
            fechaIngreso=       body.fechaIngreso,
            documentoIngreso=   body.documentoIngreso,
            direccion=          ", ".join(body.direccion) if body.direccion else "",
            estado=             body.estado or "Pendiente",
            fechaAtencion=      body.fechaAtencion,
            asunto=             body.asunto,
            documentoRespuesta= body.documentoRespuesta,
            categoria=          ", ".join(body.categoria) if body.categoria else None,
            plazoVencimiento=   plazo,
            plazoInterno=       body.plazoInterno,
            observaciones=      body.observaciones,
            creadoPor=          usuario or body.creadoPor,
        )
        db.add(r)
        db.commit()
        db.refresh(r)
        return _out(r)
    except Exception as e:
        db.rollback()
        logger.error("Error creando transparencia:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
def actualizar(
    id:   str,
    body: TransparenciaUpdate,
    db:   Session = Depends(get_db),
):
    r = db.query(TransparenciaModel).filter(TransparenciaModel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Registro {id} no encontrado")
    try:
        datos = body.model_dump(exclude_unset=True)
        # Recalcular plazo si cambia la fechaIngreso
        if "fechaIngreso" in datos and datos["fechaIngreso"]:
            datos["plazoVencimiento"] = calcular_plazo_habiles(datos["fechaIngreso"], 10)
        for campo, valor in datos.items():
            if campo in ("direccion", "categoria") and isinstance(valor, list):
                valor = ", ".join(valor) if valor else ("" if campo == "direccion" else None)
            setattr(r, campo, valor)
        db.commit()
        db.refresh(r)
        return _out(r)
    except Exception as e:
        db.rollback()
        logger.error("Error actualizando transparencia:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, db: Session = Depends(get_db)):
    r = db.query(TransparenciaModel).filter(TransparenciaModel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Registro {id} no encontrado")
    try:
        db.delete(r)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
