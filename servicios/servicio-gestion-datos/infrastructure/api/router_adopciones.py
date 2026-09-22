"""
Router API: Suite Dirección de Adopciones (DA) y Postadopción (RPADO).
Proporciona endpoints analíticos, agregados y de trazabilidad para la Directora DGNNA.
"""

import os
import shutil
import tempfile
import logging
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import case, func, text

from infrastructure.db.database import get_db
from infrastructure.api.router import get_usuario_escritura_gestion_datos
from infrastructure.db.models import (
    DaCargaModel,
    DaNnaAdopcionModel,
    DaRpadoSeguimientoModel,
)
from domain.services.adopciones_etl import (
    importar_rene_adopciones,
    importar_rpado_seguimiento,
)

router = APIRouter(prefix="/api/gestion-datos/adopciones", tags=["gestion-datos-adopciones"])
logger = logging.getLogger("router_adopciones")


def _estado_normalizado(columna):
    return func.upper(func.trim(columna))


def _es_adoptable(columna):
    """Solo el estado oficial ADOPTABLE; evita incluir valores como NO ADOPTABLE."""
    return _estado_normalizado(columna) == "ADOPTABLE"


def _es_fallida_rpado():
    estado = _estado_normalizado(DaRpadoSeguimientoModel.estado)
    flag = _estado_normalizado(DaRpadoSeguimientoModel.esFallida)
    return estado.in_(["FALLIDO", "FINALIZADOFALLIDO"]) | (flag == "SI")


def _aplicar_filtros_rpado(
    query,
    periodo: Optional[str] = None,
    sede: Optional[str] = None,
    estado: Optional[str] = None,
):
    if periodo and periodo.upper() != "TODOS":
        query = query.filter(DaRpadoSeguimientoModel.periodoCorte == periodo)
    else:
        query = query.filter(DaRpadoSeguimientoModel.esUltimoCorte == "S")
    if sede and sede.upper() != "TODOS":
        query = query.filter(_estado_normalizado(DaRpadoSeguimientoModel.sede) == sede.strip().upper())
    if estado and estado.upper() != "TODOS":
        query = query.filter(_estado_normalizado(DaRpadoSeguimientoModel.estado) == estado.strip().upper())
    return query


def _aplicar_filtros_adopciones(
    query,
    db: Session,
    periodo: Optional[str] = None,
    sede: Optional[str] = None,
    tipo_adopcion: Optional[str] = None,
    grupo_ref: Optional[str] = None,
    sexo: Optional[str] = None,
):
    if periodo and periodo.upper() != "TODOS":
        query = query.filter(DaNnaAdopcionModel.periodoCorte == periodo)
    else:
        query = query.filter(DaNnaAdopcionModel.esUltimoCorte == "S")

    if sede and sede.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(DaNnaAdopcionModel.sede)) == sede.strip().upper())
    if tipo_adopcion and tipo_adopcion.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(DaNnaAdopcionModel.tipoAdopcion)) == tipo_adopcion.strip().upper())
    if grupo_ref and grupo_ref.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(DaNnaAdopcionModel.grupoReferencia)) == grupo_ref.strip().upper())
    if sexo and sexo.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(DaNnaAdopcionModel.sexo)) == sexo.strip().upper())

    return query


@router.get("/filtros")
def obtener_filtros_da(db: Session = Depends(get_db)):
    """Catálogos dinámicos para filtros de la Dirección de Adopciones."""
    def distintos(columna):
        return sorted(v[0] for v in db.query(columna).filter(columna.isnot(None)).distinct().all() if str(v[0]).strip())

    periodos = sorted(set(
        distintos(DaNnaAdopcionModel.periodoCorte)
        + distintos(DaRpadoSeguimientoModel.periodoCorte)
    ), reverse=True)

    return {
        "sedes": distintos(DaNnaAdopcionModel.sede),
        "periodos": periodos,
        "tiposAdopcion": distintos(DaNnaAdopcionModel.tipoAdopcion),
        "gruposReferencia": distintos(DaNnaAdopcionModel.grupoReferencia),
        "sexos": ["HOMBRE", "MUJER"],
    }


@router.get("/resumen")
def obtener_resumen_adopciones(
    periodo: Optional[str] = None,
    sede: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Métricas macro del proceso de adopción para la Directora DGNNA."""
    base_adop = _aplicar_filtros_adopciones(db.query(DaNnaAdopcionModel), db, periodo=periodo, sede=sede)

    # Conteo por estados principales
    estado_adop = _estado_normalizado(DaNnaAdopcionModel.estado)
    adoptables = base_adop.filter(_es_adoptable(DaNnaAdopcionModel.estado)).count()
    adoptados = base_adop.filter(estado_adop == "ADOPTADO").count()
    archivo_definitivo = base_adop.filter(estado_adop == "ARCHIVO DEFINITIVO").count()
    evaluacion = base_adop.filter(estado_adop == "EVALUACIÓN").count()
    designados = base_adop.filter(estado_adop == "DESIGNADO").count()
    acogimiento = base_adop.filter(estado_adop.in_(["ACOGIMIENTO FAMILIAR", "ACOGIMIENTO PREADOPTIVO"])).count()
    total_expedientes = base_adop.count()
    adopcion_especial = base_adop.filter(
        _es_adoptable(DaNnaAdopcionModel.estado),
        _estado_normalizado(DaNnaAdopcionModel.tipoAdopcion).like("%ESPECIAL%"),
    ).count()
    porcentaje_especial = round(adopcion_especial / adoptables * 100, 1) if adoptables else 0

    # RPADO - Postadopción
    query_rpado = _aplicar_filtros_rpado(
        db.query(DaRpadoSeguimientoModel), periodo=periodo, sede=sede
    )
    
    total_familias_rpado = query_rpado.count()
    estado_rpado = _estado_normalizado(DaRpadoSeguimientoModel.estado)
    rpado_en_proceso = query_rpado.filter(estado_rpado == "EN PROCESO").count()
    rpado_finalizados = query_rpado.filter(estado_rpado == "FINALIZADO").count()
    rpado_fallidos = query_rpado.filter(_es_fallida_rpado()).count()

    # Distribución por Sedes UA
    sedes_dist = [
        {"sede": row[0] or "SIN SEDE", "cantidad": row[1]}
        for row in base_adop.with_entities(DaNnaAdopcionModel.sede, func.count(DaNnaAdopcionModel.id))
        .group_by(DaNnaAdopcionModel.sede)
        .order_by(func.count(DaNnaAdopcionModel.id).desc())
        .all()
    ]

    tasa_fallida = round((rpado_fallidos / total_familias_rpado * 100), 1) if total_familias_rpado > 0 else 0

    return {
        "kpis": {
            "totalExpedientes": total_expedientes,
            "adoptables": adoptables,
            "adopcionEspecial": adopcion_especial,
            "porcentajeAdopcionEspecial": porcentaje_especial,
            "adoptados": adoptados,
            "archivoDefinitivo": archivo_definitivo,
            "enEvaluacion": evaluacion,
            "designados": designados,
            "enAcogimiento": acogimiento,
            "postadopcionActiva": rpado_en_proceso,
            "postadopcionFinalizada": rpado_finalizados,
            "adopcionesFallidas": rpado_fallidos,
            "tasaFallidaPct": tasa_fallida,
        },
        "sedes": sedes_dist,
        "funnel": [
            {"etapa": "Evaluación Inicial", "cantidad": evaluacion, "color": "#2563EB"},
            {"etapa": "Adoptables (En Espera)", "cantidad": adoptables, "color": "#D97706"},
            {"etapa": "Designados", "cantidad": designados, "color": "#7C3AED"},
            {"etapa": "Acogimiento Preadoptivo", "cantidad": acogimiento, "color": "#0284C7"},
            {"etapa": "Adopciones Concluidas", "cantidad": adoptados, "color": "#16A34A"},
            {"etapa": "Seguimiento Postadopción Activo", "cantidad": rpado_en_proceso, "color": "#059669"},
        ]
    }


@router.get("/adoptabilidad")
def obtener_metricas_adoptabilidad(
    periodo: Optional[str] = None,
    sede: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Análisis cuantitativo de los NNA actualmente Adoptables (Adopción Especial y Necesidades)."""
    base = _aplicar_filtros_adopciones(db.query(DaNnaAdopcionModel), db, periodo=periodo, sede=sede).filter(
        _es_adoptable(DaNnaAdopcionModel.estado)
    )
    total_adoptables = base.count()

    adopcion_especial = base.filter(
        _estado_normalizado(DaNnaAdopcionModel.tipoAdopcion).like("%ESPECIAL%")
    ).count()
    porcentaje_especial = round(adopcion_especial / total_adoptables * 100, 1) if total_adoptables else 0
    edad_promedio = base.with_entities(func.avg(DaNnaAdopcionModel.edad)).scalar()

    # Tipos de adopción (Especial vs Regular)
    tipos = [
        {"tipo": row[0] or "SIN DATO", "cantidad": row[1]}
        for row in base.with_entities(DaNnaAdopcionModel.tipoAdopcion, func.count(DaNnaAdopcionModel.id))
        .group_by(DaNnaAdopcionModel.tipoAdopcion)
        .order_by(func.count(DaNnaAdopcionModel.id).desc())
        .all()
    ]

    # Grupos de Referencia prioritarios
    grupos_ref = [
        {"grupo": row[0] or "REGULAR / OTROS", "cantidad": row[1]}
        for row in base.with_entities(DaNnaAdopcionModel.grupoReferencia, func.count(DaNnaAdopcionModel.id))
        .group_by(DaNnaAdopcionModel.grupoReferencia)
        .order_by(func.count(DaNnaAdopcionModel.id).desc())
        .all()
    ]

    # Grupos Etarios
    grupos_etarios = [
        {"grupo": row[0] or "SIN DATO", "cantidad": row[1]}
        for row in base.with_entities(DaNnaAdopcionModel.grupoEtario, func.count(DaNnaAdopcionModel.id))
        .group_by(DaNnaAdopcionModel.grupoEtario)
        .order_by(func.count(DaNnaAdopcionModel.id).desc())
        .all()
    ]

    # Sexo
    mujeres = base.filter(func.upper(DaNnaAdopcionModel.sexo).in_(["MUJER", "FEMENINO", "F"])).count()
    hombres = base.filter(func.upper(DaNnaAdopcionModel.sexo).in_(["HOMBRE", "MASCULINO", "M"])).count()

    # Cruce con CAR de acogimiento actual
    top_cars = [
        {"car": row[0] or "CENTRO NO DECLARADO", "cantidad": row[1], "departamento": row[2]}
        for row in base.with_entities(
            DaNnaAdopcionModel.nomCar,
            func.count(DaNnaAdopcionModel.id),
            func.max(DaNnaAdopcionModel.depCar)
        )
        .group_by(DaNnaAdopcionModel.nomCar)
        .order_by(func.count(DaNnaAdopcionModel.id).desc())
        .limit(10)
        .all()
    ]

    # Condición última
    condicion_ultima = [
        {"condicion": row[0] or "SIN DATO", "cantidad": row[1]}
        for row in base.with_entities(DaNnaAdopcionModel.condicionUltima, func.count(DaNnaAdopcionModel.id))
        .group_by(DaNnaAdopcionModel.condicionUltima)
        .order_by(func.count(DaNnaAdopcionModel.id).desc())
        .limit(8)
        .all()
    ]

    return {
        "totalAdoptables": total_adoptables,
        "adopcionEspecial": adopcion_especial,
        "porcentajeAdopcionEspecial": porcentaje_especial,
        "edadPromedio": round(float(edad_promedio), 1) if edad_promedio is not None else None,
        "demografia": {
            "mujeres": mujeres,
            "hombres": hombres,
            "gruposEtarios": grupos_etarios,
        },
        "tiposAdopcion": tipos,
        "gruposReferencia": grupos_ref,
        "condicionUltima": condicion_ultima,
        "topCars": top_cars,
    }


@router.get("/postadopcion")
def obtener_seguimiento_postadopcion(
    periodo: Optional[str] = None,
    sede: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Monitoreo y alertas del Registro de Postadopción (RPADO)."""
    query = _aplicar_filtros_rpado(
        db.query(DaRpadoSeguimientoModel), periodo=periodo, sede=sede, estado=estado
    )

    total = query.count()
    estado_rpado = _estado_normalizado(DaRpadoSeguimientoModel.estado)
    en_proceso = query.filter(estado_rpado == "EN PROCESO").count()
    finalizados = query.filter(estado_rpado == "FINALIZADO").count()
    fallidos = query.filter(_es_fallida_rpado()).count()

    # Alertas de visitas / informes pendientes
    pendientes_informe = [
        {"hito": row[0] or "FINALIZADO", "cantidad": row[1]}
        for row in query.filter(estado_rpado == "EN PROCESO")
        .with_entities(DaRpadoSeguimientoModel.faltaInforme, func.count(DaRpadoSeguimientoModel.id))
        .group_by(DaRpadoSeguimientoModel.faltaInforme)
        .order_by(func.count(DaRpadoSeguimientoModel.id).desc())
        .all()
    ]

    # Carga por Sede
    sedes_rpado = [
        {
            "sede": row[0] or "SIN SEDE",
            "total": row[1],
            "enProceso": row[2],
            "finalizados": row[3],
            "fallidos": row[4],
        }
        for row in query.with_entities(
            DaRpadoSeguimientoModel.sede,
            func.count(DaRpadoSeguimientoModel.id),
            func.sum(case((estado_rpado == "EN PROCESO", 1), else_=0)),
            func.sum(case((estado_rpado == "FINALIZADO", 1), else_=0)),
            func.sum(case((_es_fallida_rpado(), 1), else_=0)),
        )
        .group_by(DaRpadoSeguimientoModel.sede)
        .order_by(func.count(DaRpadoSeguimientoModel.id).desc())
        .all()
    ]

    return {
        "resumen": {
            "total": total,
            "enProceso": en_proceso,
            "finalizados": finalizados,
            "fallidos": fallidos,
            "tasaFallida": round((fallidos / total * 100), 1) if total > 0 else 0,
        },
        "pendientesPorHito": pendientes_informe,
        "cargaPorSede": sedes_rpado,
    }


@router.get("/cargas")
def listar_cargas_da(
    tipo: Optional[str] = None,
    limite: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Historial de cargas periódicas de la Dirección de Adopciones."""
    query = db.query(DaCargaModel)
    if tipo and tipo.upper() != "TODOS":
        query = query.filter(DaCargaModel.tipoArchivo == tipo.upper())
    cargas = query.order_by(DaCargaModel.fechaCarga.desc()).limit(limite).all()

    return [{
        "id": c.id,
        "tipoArchivo": c.tipoArchivo,
        "nombreArchivo": c.nombreArchivo,
        "periodoCorte": c.periodoCorte,
        "usuario": c.usuario,
        "fechaCarga": c.fechaCarga.isoformat() if c.fechaCarga else None,
        "totalRegistros": c.totalRegistros,
        "estado": c.estado,
        "mensaje": c.mensaje,
    } for c in cargas]


@router.post("/importar")
async def importar_archivo_da(
    file: UploadFile = File(...),
    tipo: str = Form(...), # ADOPCIONES / RPADO
    periodoCorte: Optional[str] = Form(None),
    usuario: str = Depends(get_usuario_escritura_gestion_datos),
    db: Session = Depends(get_db)
):
    """Endpoint para cargar periódicamente los Excels de RENE Adopciones y RPADO."""
    if not usuario:
        raise HTTPException(status_code=401, detail="Se requiere una sesión autenticada para cargar archivos.")
    nombre_original = file.filename or "archivo_sin_nombre.xlsx"
    extension = os.path.splitext(nombre_original)[1].lower()
    if extension not in {".xlsx", ".xlsm"}:
        raise HTTPException(status_code=400, detail="Solo se admiten archivos Excel .xlsx o .xlsm.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        if os.path.getsize(tmp_path) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="El archivo supera el límite de 50 MB.")
        with open(tmp_path, "rb") as excel_file:
            if excel_file.read(2) != b"PK":
                raise HTTPException(status_code=400, detail="El archivo no tiene una estructura Excel válida.")

        tipo_up = tipo.upper()
        periodo = periodoCorte or date.today().strftime("%Y-%m")
        if tipo_up == "ADOPCIONES":
            res = importar_rene_adopciones(tmp_path, periodo, db, usuario=usuario)
        elif tipo_up == "RPADO":
            res = importar_rpado_seguimiento(tmp_path, periodo, db, usuario=usuario)
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo '{tipo}' no reconocido.")

        # Guardar nombre original
        carga = db.query(DaCargaModel).filter(DaCargaModel.id == res.get("carga_id")).first()
        if carga and file.filename:
            carga.nombreArchivo = file.filename
            db.commit()

        return {"success": True, "resultado": res}
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception:
        db.rollback()
        logger.exception("Error durante la importación DA/RPADO")
        raise HTTPException(
            status_code=422,
            detail="No se pudo importar el archivo. Verifique la hoja y los encabezados requeridos."
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
