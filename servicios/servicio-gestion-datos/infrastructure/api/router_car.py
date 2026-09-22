"""
Router API: Suite CAR DPNNA (Directorio y Métricas Ejecutivas de Alto Mando para la Directora DGNNA).
"""

import os
import shutil
import tempfile
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import case, func, text

from infrastructure.db.database import get_db
from infrastructure.db.models import (
    CarCentroModel,
    CarCargaModel,
    CarNnaCorteModel,
)
from domain.services.car_etl import (
    importar_car_centros,
    importar_nna_car,
)

router = APIRouter(prefix="/api/gestion-datos/dpnna", tags=["gestion-datos-dpnna"])


def _poblacion_activa(db: Session):
    """Universo único para cards, ocupación y rankings del último corte."""
    return db.query(CarNnaCorteModel).filter(
        CarNnaCorteModel.esUltimoCorte == "S",
        func.upper(func.trim(CarNnaCorteModel.estadoActual)) == "ACTIVO",
    )


def _aplicar_filtros_nna(
    query,
    db: Session,
    periodo: Optional[str] = None,
    departamento: Optional[str] = None,
    cod_cen: Optional[str] = None,
    sexo: Optional[str] = None,
    grupo_etario: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Aplica filtros del tablero sobre columnas persistidas en Oracle."""
    if periodo and periodo.upper() != "TODOS":
        query = query.filter(CarNnaCorteModel.periodoCorte == periodo)
    else:
        query = query.filter(CarNnaCorteModel.esUltimoCorte == "S")
    if departamento and departamento.upper() != "TODOS":
        codigos = db.query(CarCentroModel.codCen).filter(
            func.upper(func.trim(CarCentroModel.depCen)) == departamento.strip().upper()
        )
        query = query.filter(CarNnaCorteModel.codCen.in_(codigos))
    if cod_cen and cod_cen.upper() != "TODOS":
        query = query.filter(CarNnaCorteModel.codCen == cod_cen)
    if sexo and sexo.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(CarNnaCorteModel.sexo)) == sexo.strip().upper())
    if grupo_etario and grupo_etario.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(CarNnaCorteModel.grupoEtario)) == grupo_etario.strip().upper())
    if estado and estado.upper() != "TODOS":
        query = query.filter(func.upper(func.trim(CarNnaCorteModel.estadoActual)) == estado.strip().upper())
    return query


def _universo_nna(db: Session, **filtros):
    return _aplicar_filtros_nna(db.query(CarNnaCorteModel), db, **filtros)


def _metricas_comunes(base):
    total = base.count()
    activos = base.filter(func.upper(func.trim(CarNnaCorteModel.estadoActual)) == "ACTIVO").count()
    mujeres = base.filter(func.upper(func.trim(CarNnaCorteModel.sexo)).in_(["MUJER", "FEMENINO", "F"])).count()
    hombres = base.filter(func.upper(func.trim(CarNnaCorteModel.sexo)).in_(["HOMBRE", "MASCULINO", "M"])).count()
    con_seguro = base.filter(
        CarNnaCorteModel.seguroSalud.isnot(None),
        ~func.upper(CarNnaCorteModel.seguroSalud).like("%NO TIENE%"),
        ~func.upper(CarNnaCorteModel.seguroSalud).like("%NO SE ENCUENTRA%"),
        ~func.upper(CarNnaCorteModel.seguroSalud).like("%SIN SEGURO%"),
    ).count()
    movimientos = [
        {"nombre": nombre or "SIN DATO", "cantidad": cantidad}
        for nombre, cantidad in base.with_entities(
            CarNnaCorteModel.movimientoPoblacional, func.count(CarNnaCorteModel.id)
        ).group_by(CarNnaCorteModel.movimientoPoblacional).all()
    ]
    return {
        "total": total,
        "activos": activos,
        "inactivos": max(total - activos, 0),
        "sexo": {"mujeres": mujeres, "hombres": hombres, "sinDato": max(total - mujeres - hombres, 0)},
        "seguro": {"conSeguro": con_seguro, "sinSeguroOSinDato": max(total - con_seguro, 0)},
        "movimientos": movimientos,
    }


@router.get("/filtros")
def obtener_filtros(db: Session = Depends(get_db)):
    """Catálogos existentes para construir filtros sin valores codificados en frontend."""
    def distintos(columna):
        return sorted(v[0] for v in db.query(columna).filter(columna.isnot(None)).distinct().all() if str(v[0]).strip())
    centros = db.query(CarCentroModel.codCen, CarCentroModel.nomCen, CarCentroModel.depCen).order_by(CarCentroModel.nomCen).all()
    return {
        "periodos": distintos(CarNnaCorteModel.periodoCorte),
        "departamentos": distintos(CarCentroModel.depCen),
        "sexos": distintos(CarNnaCorteModel.sexo),
        "gruposEtarios": distintos(CarNnaCorteModel.grupoEtario),
        "estados": distintos(CarNnaCorteModel.estadoActual),
        "centros": [{"codigo": c[0], "nombre": c[1], "departamento": c[2]} for c in centros],
    }


@router.get("/cargas")
def listar_cargas(
    tipo: Optional[str] = None,
    periodo: Optional[str] = None,
    estado: Optional[str] = None,
    limite: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(CarCargaModel)
    if tipo and tipo.upper() != "TODOS": query = query.filter(CarCargaModel.tipoCar == tipo.upper())
    if periodo and periodo.upper() != "TODOS": query = query.filter(CarCargaModel.periodoCorte == periodo)
    if estado and estado.upper() != "TODOS": query = query.filter(CarCargaModel.estado == estado.upper())
    cargas = query.order_by(CarCargaModel.fechaCarga.desc()).limit(limite).all()
    return [{
        "id": c.id, "tipoCar": c.tipoCar, "nombreArchivo": c.nombreArchivo,
        "periodoCorte": c.periodoCorte, "usuario": c.usuario,
        "fechaCarga": c.fechaCarga.isoformat() if c.fechaCarga else None,
        "totalRegistros": c.totalRegistros, "estado": c.estado, "mensaje": c.mensaje,
    } for c in cargas]


@router.get("/bandeja/{tipo_car}")
def bandeja_por_centro(
    tipo_car: str,
    periodo: Optional[str] = None,
    departamento: Optional[str] = None,
    codCen: Optional[str] = None,
    sexo: Optional[str] = None,
    grupoEtario: Optional[str] = None,
    db: Session = Depends(get_db),
):
    tipo = tipo_car.upper()
    if tipo not in ("BASICO", "ESPECIALIZADO", "URGENCIA"):
        raise HTTPException(status_code=400, detail="Tipo CAR no reconocido")
    base = _universo_nna(db, periodo=periodo, departamento=departamento,
        cod_cen=codCen, sexo=sexo, grupo_etario=grupoEtario, estado="ACTIVO").filter(
            CarNnaCorteModel.tipoCar == tipo)
    filas = base.with_entities(
        CarNnaCorteModel.codCen,
        func.max(CarNnaCorteModel.nomCen),
        func.count(CarNnaCorteModel.id),
        func.sum(case((CarNnaCorteModel.mayor18Meses == "SI", 1), else_=0)),
        func.sum(case((func.upper(func.trim(CarNnaCorteModel.cuentaPti)).in_(["SI", "SÍ"]), 0), else_=1)),
        func.sum(case((
            (CarNnaCorteModel.seguroSalud.is_(None)) |
            (func.upper(CarNnaCorteModel.seguroSalud).like("%NO TIENE%")) |
            (func.upper(CarNnaCorteModel.seguroSalud).like("%NO SE ENCUENTRA%")) |
            (func.upper(CarNnaCorteModel.seguroSalud).like("%SIN SEGURO%")), 1), else_=0)),
        func.sum(case((CarNnaCorteModel.diasPermanencia > 30, 1), else_=0)),
        func.avg(CarNnaCorteModel.diasPermanencia),
    ).group_by(CarNnaCorteModel.codCen).all()
    centros = {c.codCen: c for c in db.query(CarCentroModel).all()}
    resultado = []
    for codigo, nombre, poblacion, mayor18, pti_pendiente, sin_seguro, mayor30, promedio in filas:
        centro = centros.get(codigo)
        capacidad = (centro.capReal if centro else None) or 0
        ocupacion = round(poblacion / capacidad * 100, 1) if capacidad else None
        promedio_num = round(float(promedio), 1) if promedio is not None else None
        resultado.append({
            "centro": nombre or (centro.nomCen if centro else "CENTRO NO ASIGNADO"),
            "codigoCentro": codigo,
            "departamento": centro.depCen if centro else None,
            "poblacionActiva": poblacion,
            "capacidadReal": capacidad or None,
            "ocupacion": ocupacion,
            "mayor18": int(mayor18 or 0),
            "ptiPendiente": int(pti_pendiente or 0),
            "sinSeguro": int(sin_seguro or 0),
            "estanciaPromedio": promedio_num,
            "permanenciaSobreUmbral": int(mayor30 or 0) if tipo == "URGENCIA" else int(mayor18 or 0),
        })
    return sorted(resultado, key=lambda x: x["poblacionActiva"], reverse=True)


@router.get("/resumen")
def obtener_resumen_dpnna(
    periodo: Optional[str] = None, departamento: Optional[str] = None,
    codCen: Optional[str] = None, sexo: Optional[str] = None,
    grupoEtario: Optional[str] = None, estado: Optional[str] = "ACTIVO",
    db: Session = Depends(get_db)
):
    """Retorna métricas clave para el panel ejecutivo de la Directora DGNNA."""
    centros_query = db.query(CarCentroModel)
    if departamento and departamento.upper() != "TODOS":
        centros_query = centros_query.filter(func.upper(func.trim(CarCentroModel.depCen)) == departamento.strip().upper())
    if codCen and codCen.upper() != "TODOS":
        centros_query = centros_query.filter(CarCentroModel.codCen == codCen)
    total_centros = centros_query.count()
    cap_instalada = centros_query.with_entities(func.sum(CarCentroModel.capInstalada)).scalar() or 0
    cap_real = centros_query.with_entities(func.sum(CarCentroModel.capReal)).scalar() or 0
    centros_acreditados = centros_query.filter(CarCentroModel.acreditado == "SI").count()

    # NNA en el último corte
    nna_query = _universo_nna(db, periodo=periodo, departamento=departamento,
        cod_cen=codCen, sexo=sexo, grupo_etario=grupoEtario, estado=estado)
    total_nna = nna_query.count()
    
    basico = nna_query.filter(CarNnaCorteModel.tipoCar == "BASICO").count()
    especializado = nna_query.filter(CarNnaCorteModel.tipoCar == "ESPECIALIZADO").count()
    urgencia = nna_query.filter(CarNnaCorteModel.tipoCar == "URGENCIA").count()

    mayor_18 = nna_query.filter(CarNnaCorteModel.mayor18Meses == "SI").count()
    tasa_ocupacion = round((total_nna / cap_real * 100), 1) if cap_real > 0 else 0
    periodos = [p[0] for p in db.query(CarNnaCorteModel.periodoCorte).distinct().all() if p[0]]

    return {
        "totalCentros": total_centros,
        "capacidadInstalada": cap_instalada,
        "capacidadReal": cap_real,
        "centrosAcreditados": centros_acreditados,
        "centrosNoAcreditados": total_centros - centros_acreditados,
        "totalNna": total_nna,
        "tasaOcupacion": tasa_ocupacion,
        "mayor18Meses": mayor_18,
        "menor18Meses": total_nna - mayor_18,
        "pctMayor18Meses": round((mayor_18 / total_nna * 100), 1) if total_nna > 0 else 0,
        "periodosCorte": sorted(periodos),
        "distribucionTipoCar": {
            "basico": basico,
            "especializado": especializado,
            "urgencia": urgencia,
        },
        "metricasComunes": _metricas_comunes(nna_query),
    }


@router.get("/centros")
def listar_centros(
    q: Optional[str] = None,
    departamento: Optional[str] = None,
    tipo: Optional[str] = None,
    acreditado: Optional[str] = None,
    periodo: Optional[str] = None,
    codCen: Optional[str] = None,
    sexo: Optional[str] = None,
    grupoEtario: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista el directorio de 54 Centros CAR con NNA albergados reales por centro."""
    query = db.query(CarCentroModel)
    if departamento and departamento != "TODOS":
        query = query.filter(CarCentroModel.depCen == departamento.upper())
    if tipo and tipo != "TODOS":
        query = query.filter(CarCentroModel.tipCen.ilike(f"%{tipo}%"))
    if acreditado and acreditado != "TODOS":
        query = query.filter(CarCentroModel.acreditado == acreditado.upper())
    if codCen and codCen.upper() != "TODOS":
        query = query.filter(CarCentroModel.codCen == codCen)
    if q:
        query = query.filter(
            (CarCentroModel.nomCen.ilike(f"%{q}%")) |
            (CarCentroModel.codCen.ilike(f"%{q}%"))
        )

    centros = query.order_by(CarCentroModel.nomCen.asc()).all()
    
    # Obtenemos conteo de NNA por centro en corte activo
    poblacion_filtrada = _universo_nna(
        db, periodo=periodo, departamento=departamento, cod_cen=codCen,
        sexo=sexo, grupo_etario=grupoEtario, estado="ACTIVO"
    )
    conteo_nna = dict(
        poblacion_filtrada.with_entities(CarNnaCorteModel.codCen, func.count(CarNnaCorteModel.id))
        .group_by(CarNnaCorteModel.codCen)
        .all()
    )

    resultados = []
    for c in centros:
        poblacion = conteo_nna.get(c.codCen, 0)
        cap = c.capReal or 0
        ocupacion = round((poblacion / cap * 100), 1) if cap > 0 else None

        # Semáforo de saturación
        if ocupacion is None:
            estado_saturacion = "SIN_DATO"
        elif ocupacion > 100:
            estado_saturacion = "SOBREDEMANDA"
        elif ocupacion >= 85:
            estado_saturacion = "ALERTA"
        else:
            estado_saturacion = "DISPONIBLE"

        resultados.append({
            "id": c.id,
            "codigo": c.codCen,
            "codigoDgnna": c.codDgnna,
            "nombre": c.nomCen,
            "tipo": c.tipCen,
            "tipoEspecifico": c.tipCenEsp,
            "departamento": c.depCen,
            "provincia": c.provCen,
            "distrito": c.disCen,
            "ubigeo": c.ubigeo,
            "unidadLinea": c.uniLin,
            "capacidadInstalada": c.capInstalada,
            "capacidadReal": c.capReal,
            "poblacionActual": poblacion,
            "tasaOcupacion": ocupacion,
            "estadoSaturacion": estado_saturacion,
            "acreditado": c.acreditado,
            "nroConstancia": c.nroConstancia,
            "resolucion": c.rd,
            "vigencia": c.vigencia,
            "latitud": c.latitud,
            "longitud": c.longitud,
        })
    return resultados


@router.get("/metricas/basico")
def metricas_car_basico(periodo: Optional[str] = None, departamento: Optional[str] = None,
    codCen: Optional[str] = None, sexo: Optional[str] = None, grupoEtario: Optional[str] = None,
    estado: Optional[str] = "ACTIVO", db: Session = Depends(get_db)):
    """Métricas cuantitativas agregadas de CAR Básico (1,344 NNA)."""
    base = _universo_nna(db, periodo=periodo, departamento=departamento, cod_cen=codCen,
        sexo=sexo, grupo_etario=grupoEtario, estado=estado).filter(
        CarNnaCorteModel.tipoCar == "BASICO"
    )
    total = base.count()

    # 1. Alerta > 18 meses
    mayor_18 = base.filter(CarNnaCorteModel.mayor18Meses == "SI").count()
    menor_18 = total - mayor_18

    # 2. PTI
    pti_si = base.filter(CarNnaCorteModel.cuentaPti.in_(["SI", "SÍ"])).count()
    pti_sin_dato = base.filter(CarNnaCorteModel.cuentaPti.is_(None)).count()
    pti_no = max(total - pti_si - pti_sin_dato, 0)

    # 3. Sexo
    mujeres = base.filter(CarNnaCorteModel.sexo.ilike("MUJ%")).count()
    hombres = base.filter(CarNnaCorteModel.sexo.ilike("HOM%")).count()

    # 4. Top Situación Legal
    sit_legal = [
        {"nombre": row[0] or "EN EVALUACIÓN", "cantidad": row[1]}
        for row in base.with_entities(CarNnaCorteModel.situacionLegal, func.count(CarNnaCorteModel.id))
        .group_by(CarNnaCorteModel.situacionLegal)
        .order_by(func.count(CarNnaCorteModel.id).desc())
        .limit(5)
        .all()
    ]

    # 5. Grupos Etarios
    grupos_etarios = [
        {"grupo": row[0] or "OTROS", "cantidad": row[1]}
        for row in base.with_entities(CarNnaCorteModel.grupoEtario, func.count(CarNnaCorteModel.id))
        .group_by(CarNnaCorteModel.grupoEtario)
        .order_by(func.count(CarNnaCorteModel.id).desc())
        .limit(6)
        .all()
    ]

    # 6. Seguro de Salud
    con_seguro = base.filter(
        CarNnaCorteModel.seguroSalud.isnot(None),
        ~CarNnaCorteModel.seguroSalud.ilike("%NO%"),
        ~CarNnaCorteModel.seguroSalud.ilike("%SIN%")
    ).count()

    # 7. Discapacidad
    con_discapacidad = base.filter(
        CarNnaCorteModel.tieneDiscapacidad.in_(["SI", "SÍ"])
    ).count()

    return {
        "totalNna": total,
        "permanencia": {
            "mayor18Meses": mayor_18,
            "menor18Meses": menor_18,
            "pctMayor18": round((mayor_18 / total * 100), 1) if total > 0 else 0
        },
        "pti": {
            "aprobado": pti_si,
            "pendiente": pti_no,
            "sinDato": pti_sin_dato,
            "pctAprobado": round((pti_si / total * 100), 1) if total > 0 else 0
        },
        "demografia": {
            "mujeres": mujeres,
            "hombres": hombres,
            "gruposEtarios": grupos_etarios
        },
        "saludEducacion": {
            "conSeguro": con_seguro,
            "sinSeguro": total - con_seguro,
            "conDiscapacidad": con_discapacidad
        },
        "topSituacionLegal": sit_legal,
        "metricasComunes": _metricas_comunes(base),
    }


@router.get("/metricas/especializado")
def metricas_car_especializado(periodo: Optional[str] = None, departamento: Optional[str] = None,
    codCen: Optional[str] = None, sexo: Optional[str] = None, grupoEtario: Optional[str] = None,
    estado: Optional[str] = "ACTIVO", db: Session = Depends(get_db)):
    """Métricas cuantitativas agregadas de CAR Especializado (291 NNA)."""
    base = _universo_nna(db, periodo=periodo, departamento=departamento, cod_cen=codCen,
        sexo=sexo, grupo_etario=grupoEtario, estado=estado).filter(
        CarNnaCorteModel.tipoCar == "ESPECIALIZADO"
    )
    total = base.count()

    # 1. Discapacidad
    con_discapacidad = base.filter(CarNnaCorteModel.tieneDiscapacidad.in_(["SI", "SÍ"])).count()
    
    # 2. Permanencia > 18 meses
    mayor_18 = base.filter(CarNnaCorteModel.mayor18Meses == "SI").count()

    # 3. Top Centros Especializados
    top_centros = [
        {"centro": row[0] or "CENTRO NO ASIGNADO", "cantidad": row[1]}
        for row in base.with_entities(CarNnaCorteModel.nomCen, func.count(CarNnaCorteModel.id))
        .group_by(CarNnaCorteModel.nomCen)
        .order_by(func.count(CarNnaCorteModel.id).desc())
        .limit(6)
        .all()
    ]

    # 4. Sexo
    mujeres = base.filter(CarNnaCorteModel.sexo.ilike("MUJ%")).count()
    hombres = base.filter(CarNnaCorteModel.sexo.ilike("HOM%")).count()

    return {
        "totalNna": total,
        "conDiscapacidad": con_discapacidad,
        "pctDiscapacidad": round((con_discapacidad / total * 100), 1) if total > 0 else 0,
        "mayor18Meses": mayor_18,
        "pctMayor18": round((mayor_18 / total * 100), 1) if total > 0 else 0,
        "demografia": {
            "mujeres": mujeres,
            "hombres": hombres
        },
        "topCentros": top_centros,
        "metricasComunes": _metricas_comunes(base),
    }


@router.get("/metricas/urgencia")
def metricas_car_urgencia(periodo: Optional[str] = None, departamento: Optional[str] = None,
    codCen: Optional[str] = None, sexo: Optional[str] = None, grupoEtario: Optional[str] = None,
    estado: Optional[str] = "ACTIVO", db: Session = Depends(get_db)):
    """Métricas cuantitativas agregadas de CAR Urgencia (196 NNA)."""
    base = _universo_nna(db, periodo=periodo, departamento=departamento, cod_cen=codCen,
        sexo=sexo, grupo_etario=grupoEtario, estado=estado).filter(
        CarNnaCorteModel.tipoCar == "URGENCIA"
    )
    total = base.count()

    # Permanencia en urgencia
    dias_promedio = base.with_entities(func.avg(CarNnaCorteModel.diasPermanencia)).scalar() or 0

    mayor_30_dias = base.filter(CarNnaCorteModel.diasPermanencia > 30).count()

    # Top Centros de Urgencia
    top_centros = [
        {"centro": row[0] or "CENTRO URGENCIA", "cantidad": row[1]}
        for row in base.with_entities(CarNnaCorteModel.nomCen, func.count(CarNnaCorteModel.id))
        .group_by(CarNnaCorteModel.nomCen)
        .order_by(func.count(CarNnaCorteModel.id).desc())
        .limit(5)
        .all()
    ]

    # Sexo
    mujeres = base.filter(CarNnaCorteModel.sexo.ilike("MUJ%")).count()
    hombres = base.filter(CarNnaCorteModel.sexo.ilike("HOM%")).count()

    return {
        "totalNna": total,
        "diasPromedioEstancia": round(float(dias_promedio), 0),
        "estanciaProlongadaUrgencia": mayor_30_dias, # Urgencias no debería superar 30 días
        "pctProlongada": round((mayor_30_dias / total * 100), 1) if total > 0 else 0,
        "demografia": {
            "mujeres": mujeres,
            "hombres": hombres
        },
        "topCentros": top_centros,
        "metricasComunes": _metricas_comunes(base),
    }


@router.post("/importar")
async def importar_archivo_car(
    file: UploadFile = File(...),
    tipo: str = Form(...), # CENTROS, BASICO, ESPECIALIZADO, URGENCIA
    periodoCorte: Optional[str] = Form(None),
    usuario: str = Form("ADMIN_DGNNA"),
    db: Session = Depends(get_db)
):
    """Endpoint para la importación periódica de los Excels de DPNNA/CAR."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        tipo_up = tipo.upper()
        periodo = periodoCorte or date.today().strftime("%Y-%m")
        if tipo_up == "CENTROS":
            res = importar_car_centros(tmp_path, db, usuario=usuario)
        elif tipo_up in ("BASICO", "ESPECIALIZADO", "URGENCIA"):
            res = importar_nna_car(tmp_path, tipo_up, periodo, db, usuario=usuario)
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo '{tipo}' no reconocido.")
        carga = db.query(CarCargaModel).filter(CarCargaModel.id == res.get("carga_id")).first()
        if carga and file.filename:
            carga.nombreArchivo = file.filename
            db.commit()
        return {"success": True, "resultado": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la importación: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
