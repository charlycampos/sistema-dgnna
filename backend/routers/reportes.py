from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Apelacion
from schemas import (
    ReporteOut, ResumenReporte, EvolucionItem,
    ProductividadAbogado, DistribucionComplejidad, TopProcedencia
)
from auth import get_current_user

router = APIRouter(prefix="/api/reportes", tags=["reportes"])

COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]


@router.get("", response_model=ReporteOut)
def reporte(
    fechaInicio: Optional[str] = Query(None),
    fechaFin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = db.query(Apelacion)

    if fechaInicio and fechaFin:
        inicio = datetime.fromisoformat(fechaInicio).replace(hour=0, minute=0, second=0)
        fin    = datetime.fromisoformat(fechaFin).replace(hour=23, minute=59, second=59)
        q = q.filter(Apelacion.fechaIngreso >= inicio, Apelacion.fechaIngreso <= fin)

    apelaciones = q.order_by(Apelacion.fechaIngreso).all()

    total      = len(apelaciones)
    pendientes = sum(1 for a in apelaciones if a.estado == "Pendiente")
    resueltos  = sum(1 for a in apelaciones if a.estado == "Resuelto")
    atendidos  = sum(1 for a in apelaciones if a.estado == "Atendido")

    # En el resumen del reporte, podemos agrupar Pendientes + Resueltos como "Pendientes" 
    # si el schema no permite más campos, pero lo ideal es ser preciso.
    # Dado que ResumenReporte solo tiene 'pendientes' y 'atendidos', 
    # sumaremos resueltos a pendientes para que el total cierre.
    pendientes_totales = pendientes + resueltos

    # Promedio días de atención
    dias_total = 0
    casos_con_fecha = 0
    for a in apelaciones:
        if a.estado == "Atendido" and a.updatedAt:
            dias = (a.updatedAt - a.fechaIngreso).days
            dias_total += max(0, dias)
            casos_con_fecha += 1
    promedio = round(dias_total / casos_con_fecha, 1) if casos_con_fecha > 0 else 0.0

    # Evolución diaria (por fecha ingreso)
    evol_map: dict = {}
    for a in apelaciones:
        fecha_str = a.fechaIngreso.strftime("%d/%m")
        evol_map[fecha_str] = evol_map.get(fecha_str, 0) + 1
    evolucion = [EvolucionItem(fecha=k, cantidad=v) for k, v in evol_map.items()]

    # Productividad por abogado
    ab_map: dict = defaultdict(lambda: {"asignados": 0, "atendidos": 0, "puntos": 0})
    for a in apelaciones:
        nombre = a.abogado.nombre if a.abogado else "Sin abogado"
        ab_map[nombre]["asignados"] += 1
        if a.estado == "Atendido":
            ab_map[nombre]["atendidos"] += 1
            ab_map[nombre]["puntos"] += (a.puntosTotal or 0)
            
    productividad = [
        ProductividadAbogado(
            nombre    = nombre,
            asignados = d["asignados"],
            atendidos = d["atendidos"],
            puntos    = d["puntos"],
            eficiencia = round((d["atendidos"] / d["asignados"]) * 100) if d["asignados"] > 0 else 0,
        )
        for nombre, d in ab_map.items()
    ]

    # Distribución complejidad
    comp_map: dict = {}
    for a in apelaciones:
        nombre = a.complejidad.nombre if a.complejidad else "Sin complejidad"
        comp_map[nombre] = comp_map.get(nombre, 0) + 1
    distribucion = [
        DistribucionComplejidad(nombre=nombre, cantidad=cant, fill=COLORS[i % len(COLORS)])
        for i, (nombre, cant) in enumerate(comp_map.items())
    ]

    # Top procedencias
    proc_map: dict = {}
    for a in apelaciones:
        proc_map[a.procedencia] = proc_map.get(a.procedencia, 0) + 1
    top_proc = sorted(
        [
            TopProcedencia(
                nombre     = nombre,
                cantidad   = cant,
                porcentaje = round((cant / total) * 100) if total > 0 else 0,
            )
            for nombre, cant in proc_map.items()
        ],
        key=lambda x: x.cantidad, reverse=True,
    )

    return ReporteOut(
        resumen               = ResumenReporte(
            total=total, pendientes=pendientes_totales,
            atendidos=atendidos, promedioAtencionXDias=promedio
        ),
        evolucionSemanal      = evolucion,
        productividadAbogados = productividad,
        distribucionComplejidad = distribucion,
        topProcedencias       = top_proc,
    )
