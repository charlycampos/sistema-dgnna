"""
Router: Ley de Transparencia y Acceso a la Información Pública
Plazo legal de respuesta: 10 días hábiles desde la fecha de ingreso.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Transparencia
from schemas import (
    TransparenciaCreate, TransparenciaUpdate,
    TransparenciaOut, TransparenciaDashboardOut,
    ItemNombreCantidad,
)
from auth import require_module_access, can_write

router = APIRouter(prefix="/api/transparencia", tags=["transparencia"])

MODULO = "transparencia"

# Feriados fijos peruanos (MM-DD)
_FERIADOS_FIJOS = {
    "01-01",  # Año Nuevo
    "05-01",  # Día del Trabajo
    "06-29",  # San Pedro y San Pablo
    "07-28",  # Fiestas Patrias
    "07-29",  # Fiestas Patrias
    "08-30",  # Santa Rosa de Lima
    "10-08",  # Combate de Angamos
    "11-01",  # Todos los Santos
    "12-08",  # Inmaculada Concepción
    "12-09",  # Batalla de Ayacucho
    "12-25",  # Navidad
}


def _es_dia_habil(fecha: datetime) -> bool:
    """Retorna True si la fecha es un día hábil (lunes–viernes, no feriado)."""
    if fecha.weekday() >= 5:          # sábado=5, domingo=6
        return False
    if fecha.strftime("%m-%d") in _FERIADOS_FIJOS:
        return False
    return True


def calcular_plazo_habiles(fecha_inicio: datetime, dias: int = 10) -> datetime:
    """
    Devuelve la fecha límite sumando `dias` días hábiles a `fecha_inicio`.
    Los días hábiles excluyen sábados, domingos y feriados peruanos fijos.
    """
    fecha = fecha_inicio
    contados = 0
    while contados < dias:
        fecha = fecha + timedelta(days=1)
        if _es_dia_habil(fecha):
            contados += 1
    return fecha


def _dias_habiles_restantes(desde: datetime, hasta: datetime) -> int:
    """Cuenta días hábiles entre dos fechas (positivo = faltan, negativo = vencido)."""
    hoy = desde
    dias = 0
    cursor = hoy
    if hoy > hasta:
        # Ya venció: contar días hábiles transcurridos desde vencimiento
        cursor = hasta
        while cursor < hoy:
            cursor += timedelta(days=1)
            if _es_dia_habil(cursor):
                dias -= 1
        return dias
    else:
        while cursor < hasta:
            cursor += timedelta(days=1)
            if _es_dia_habil(cursor):
                dias += 1
        return dias


# ─── GET /api/transparencia ──────────────────────────────────────

@router.get("", response_model=List[TransparenciaOut])
def listar(
    estado:    Optional[str] = Query(None),
    direccion: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict    = Depends(require_module_access(MODULO)),
):
    q = db.query(Transparencia)
    if estado:
        q = q.filter(Transparencia.estado == estado)
    if direccion:
        q = q.filter(Transparencia.direccion == direccion)
    if categoria:
        q = q.filter(Transparencia.categoria == categoria)
    return q.order_by(Transparencia.createdAt.desc()).all()


# ─── GET /api/transparencia/dashboard ───────────────────────────

@router.get("/dashboard", response_model=TransparenciaDashboardOut)
def dashboard(
    db: Session = Depends(get_db),
    _: dict     = Depends(require_module_access(MODULO)),
):
    todos = db.query(Transparencia).all()
    hoy   = datetime.utcnow()

    total      = len(todos)
    pendientes = sum(1 for t in todos if t.estado == "Pendiente")
    en_proceso = sum(1 for t in todos if t.estado == "En Proceso")
    atendidos  = sum(1 for t in todos if t.estado == "Atendido")

    # Vencidos: plazo superado y no atendidos
    vencidos = sum(
        1 for t in todos
        if t.plazoVencimiento
        and t.estado != "Atendido"
        and t.plazoVencimiento < hoy
    )

    # Próximos a vencer: ≤3 días hábiles, no atendidos, no vencidos
    proximos = 0
    for t in todos:
        if t.plazoVencimiento and t.estado != "Atendido" and t.plazoVencimiento >= hoy:
            restantes = _dias_habiles_restantes(hoy, t.plazoVencimiento)
            if 0 <= restantes <= 3:
                proximos += 1

    # Por dirección
    dir_map: dict = {}
    for t in todos:
        dirs = [d.strip() for d in t.direccion.split(',')] if t.direccion else []
        for d in dirs:
            if d:
                dir_map[d] = dir_map.get(d, 0) + 1
    por_direccion = [ItemNombreCantidad(nombre=k, cantidad=v) for k, v in dir_map.items()]

    # Por categoría
    cat_map: dict = {}
    for t in todos:
        cats = [c.strip() for c in t.categoria.split(',')] if t.categoria else ["Sin categoría"]
        for c in cats:
            if c:
                cat_map[c] = cat_map.get(c, 0) + 1
    por_categoria = [ItemNombreCantidad(nombre=k, cantidad=v) for k, v in cat_map.items()]

    return TransparenciaDashboardOut(
        total          = total,
        pendientes     = pendientes,
        enProceso      = en_proceso,
        atendidos      = atendidos,
        vencidos       = vencidos,
        proximosVencer = proximos,
        porDireccion   = por_direccion,
        porCategoria   = por_categoria,
    )


# ─── GET /api/transparencia/{id} ────────────────────────────────

@router.get("/{id}", response_model=TransparenciaOut)
def obtener(
    id: str,
    db: Session = Depends(get_db),
    _: dict     = Depends(require_module_access(MODULO)),
):
    registro = db.query(Transparencia).filter(Transparencia.id == id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return registro


# ─── POST /api/transparencia ────────────────────────────────────

@router.post("", response_model=TransparenciaOut, status_code=201)
def crear(
    body: TransparenciaCreate,
    db: Session   = Depends(get_db),
    current: dict = Depends(can_write(MODULO)),
):
    plazo = calcular_plazo_habiles(body.fechaIngreso, 10)

    registro = Transparencia(
        numeroExpediente   = body.numeroExpediente,
        fechaIngreso       = body.fechaIngreso,
        documentoIngreso   = body.documentoIngreso,
        direccion          = ", ".join(body.direccion) if body.direccion else "",
        estado             = body.estado or "Pendiente",
        fechaAtencion      = body.fechaAtencion,
        asunto             = body.asunto,
        documentoRespuesta = body.documentoRespuesta,
        categoria          = ", ".join(body.categoria) if body.categoria else None,
        plazoVencimiento   = plazo,
        plazoInterno       = body.plazoInterno,
        observaciones      = body.observaciones,
        creadoPor          = body.creadoPor or current.get("nombre"),
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


# ─── PUT /api/transparencia/{id} ────────────────────────────────

@router.put("/{id}", response_model=TransparenciaOut)
def actualizar(
    id: str,
    body: TransparenciaUpdate,
    db: Session = Depends(get_db),
    _: dict     = Depends(can_write(MODULO)),
):
    registro = db.query(Transparencia).filter(Transparencia.id == id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    for campo, valor in body.model_dump(exclude_unset=True).items():
        if campo in ["direccion", "categoria"] and valor is not None:
            setattr(registro, campo, ", ".join(valor))
        else:
            setattr(registro, campo, valor)

    # Si cambia la fecha de ingreso, recalcular el plazo
    if body.fechaIngreso is not None:
        registro.plazoVencimiento = calcular_plazo_habiles(body.fechaIngreso, 10)

    registro.updatedAt = datetime.utcnow()
    db.commit()
    db.refresh(registro)
    return registro


# ─── DELETE /api/transparencia/{id} ─────────────────────────────

@router.delete("/{id}", status_code=204)
def eliminar(
    id: str,
    db: Session = Depends(get_db),
    _: dict     = Depends(can_write(MODULO)),
):
    registro = db.query(Transparencia).filter(Transparencia.id == id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(registro)
    db.commit()
