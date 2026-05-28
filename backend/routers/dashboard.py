from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Abogado, Revisor, Apelacion
from schemas import (
    DashboardOut, CargaAbogadoOut, CargaRevisorOut,
    AbogadoOut, RevisorOut, ItemNombreCantidad
)
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    abogados = db.query(Abogado).filter(Abogado.activo == True).all()
    todas = db.query(Apelacion).all()

    # Carga por abogado
    carga_por_abogado = []
    for ab in abogados:
        aps = [a for a in todas if a.abogadoId == ab.id]
        pendientes = [a for a in aps if a.estado == "Pendiente"]
        resueltos  = [a for a in aps if a.estado == "Resuelto"]
        atendidos  = [a for a in aps if a.estado == "Atendido"]
        
        # Puntos activos = Todos los casos asignados (según requerimiento del usuario)
        puntos_activos = sum((a.puntosTotal or 0) for a in aps)
        
        carga_por_abogado.append(CargaAbogadoOut(
            abogado        = AbogadoOut.model_validate(ab),
            casosActivos   = len(pendientes),
            casosResueltos = len(resueltos),
            casosCerrados  = len(atendidos),
            puntosActivos  = puntos_activos,
        ))

    # Carga por revisor
    revisores = db.query(Revisor).filter(Revisor.activo == True).all()
    carga_por_revisor = []
    for rv in revisores:
        aps_rv = [a for a in todas if a.revisorId == rv.id]
        carga_por_revisor.append(CargaRevisorOut(
            revisor        = RevisorOut.model_validate(rv),
            totalCasos     = len(aps_rv),
            casosPendientes= sum(1 for a in aps_rv if a.estado == "Pendiente"),
            casosResueltos = sum(1 for a in aps_rv if a.estado == "Resuelto"),
            casosAtendidos = sum(1 for a in aps_rv if a.estado == "Atendido"),
        ))

    # Estadísticas generales
    total          = len(todas)
    pendientes     = sum(1 for a in todas if a.estado == "Pendiente")
    resueltos      = sum(1 for a in todas if a.estado == "Resuelto")
    atendidos      = sum(1 for a in todas if a.estado == "Atendido")

    # Plazos próximos (≤5 días, solo activos: Pendiente o Resuelto)
    hoy    = datetime.utcnow()
    en5    = hoy + timedelta(days=5)
    proximos = sum(
        1 for a in todas
        if a.plazoVencimiento and a.estado in ("Pendiente", "Resuelto")
        and hoy <= a.plazoVencimiento <= en5
    )

    # Por complejidad
    comp_map: dict = {}
    for a in todas:
        nombre = a.complejidad.nombre if a.complejidad else "Sin complejidad"
        comp_map[nombre] = comp_map.get(nombre, 0) + 1
    por_complejidad = [ItemNombreCantidad(nombre=k, cantidad=v) for k, v in comp_map.items()]

    # Por procedencia (top 10)
    proc_map: dict = {}
    for a in todas:
        proc_map[a.procedencia] = proc_map.get(a.procedencia, 0) + 1
    por_procedencia = sorted(
        [ItemNombreCantidad(nombre=k, cantidad=v) for k, v in proc_map.items()],
        key=lambda x: x.cantidad, reverse=True
    )[:10]

    return DashboardOut(
        totalCasos             = total,
        casosPendientes        = pendientes,
        casosResueltos         = resueltos,
        casosAtendidos         = atendidos,
        casosConPlazoProximo   = proximos,
        cargaPorAbogado        = carga_por_abogado,
        cargaPorRevisor        = carga_por_revisor,
        casosPorComplejidad    = por_complejidad,
        casosPorProcedencia    = por_procedencia,
    )
