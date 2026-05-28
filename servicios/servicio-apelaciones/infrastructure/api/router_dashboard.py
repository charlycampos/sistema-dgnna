"""Router de dashboard — estructura exacta que espera el frontend Next.js."""
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from infrastructure.db.database import get_db
from infrastructure.db.models import ApelacionModel, AbogadoModel
from infrastructure.api.schemas import DashboardOut, CargaAbogado, AbogadoNested

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    apelaciones = (
        db.query(ApelacionModel)
        .options(
            selectinload(ApelacionModel.abogado),
            selectinload(ApelacionModel.complejidad),
        )
        .all()
    )

    total_casos      = len(apelaciones)
    casos_pendientes = sum(1 for a in apelaciones if a.estado == "Pendiente")
    casos_resueltos  = sum(1 for a in apelaciones if a.estado == "Resuelto")
    casos_atendidos  = sum(1 for a in apelaciones if a.estado == "Atendido")

    # Plazos próximos a vencer (≤ 5 días, activos: Pendiente o Resuelto)
    hoy  = datetime.utcnow()
    en5d = hoy + timedelta(days=5)
    casos_con_plazo_proximo = sum(
        1 for a in apelaciones
        if a.plazoVencimiento and hoy <= a.plazoVencimiento <= en5d
        and a.estado in ("Pendiente", "Resuelto")
    )

    # Carga por abogado — necesita { abogado: {id, nombre, activo}, casosActivos, puntosActivos, casosCerrados }
    abogados_db = db.query(AbogadoModel).filter(AbogadoModel.activo == True).all()
    ab_stats: dict = {
        ab.id: {
            "model": ab,
            "casosActivos":   0,
            "casosResueltos": 0,
            "casosCerrados":  0,
            "puntosActivos":  0,
        }
        for ab in abogados_db
    }

    for a in apelaciones:
        if a.abogadoId not in ab_stats:
            continue
        stats = ab_stats[a.abogadoId]
        if a.estado == "Pendiente":
            stats["casosActivos"]  += 1
        elif a.estado == "Resuelto":
            stats["casosResueltos"] += 1
        else:  # Atendido
            stats["casosCerrados"] += 1
        
        # Sumamos puntos de todos los casos (al margen de su estado)
        stats["puntosActivos"] += (a.puntosTotal or 0)

    carga_por_abogado = sorted(
        [
            CargaAbogado(
                abogado=AbogadoNested(
                    id=v["model"].id,
                    nombre=v["model"].nombre,
                    activo=v["model"].activo,
                ),
                casosActivos=v["casosActivos"],
                casosResueltos=v["casosResueltos"],
                casosCerrados=v["casosCerrados"],
                puntosActivos=v["puntosActivos"],
            )
            for v in ab_stats.values()
        ],
        key=lambda x: x.puntosActivos,
    )

    # Por complejidad
    comp_map: dict = defaultdict(int)
    for a in apelaciones:
        nombre = a.complejidad.nombre if a.complejidad else "Sin complejidad"
        comp_map[nombre] += 1
    casos_por_complejidad = [{"nombre": k, "cantidad": v} for k, v in comp_map.items()]

    # Top procedencias — solo casos Pendientes
    proc_map: dict = defaultdict(int)
    for a in apelaciones:
        if a.estado == "Pendiente":
            proc_map[a.procedencia] += 1
    casos_por_procedencia = sorted(
        [{"nombre": k, "cantidad": v} for k, v in proc_map.items()],
        key=lambda x: x["cantidad"],
        reverse=True,
    )[:10]

    return DashboardOut(
        totalCasos=total_casos,
        casosPendientes=casos_pendientes,
        casosResueltos=casos_resueltos,
        casosAtendidos=casos_atendidos,
        casosConPlazoProximo=casos_con_plazo_proximo,
        cargaPorAbogado=carga_por_abogado,
        casosPorComplejidad=casos_por_complejidad,
        casosPorProcedencia=casos_por_procedencia,
    )
