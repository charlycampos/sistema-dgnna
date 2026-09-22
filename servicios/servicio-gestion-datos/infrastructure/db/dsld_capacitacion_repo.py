"""
Repositorio DSLD · Capacitación a defensores (Oracle).

- `importar_capacitacion`: lee TB_CAPA_DEMUNA, seudonimiza el DNI, valida y reemplaza
  los datos en una sola transacción; cada intento queda en DSLD_CARGAS.
- Consultas del tablero: equivalentes a las medidas de capacitación del Power BI
  (solo filas APROBADO).
"""

from __future__ import annotations

import json
import logging
import os
import secrets
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import case, delete, distinct, func, select
from sqlalchemy.orm import Session

from domain.services.dsld_capacitacion_etl import (
    COLUMNAS_REQUERIDAS,
    COLUMNAS_USADAS,
    ESTADO_APROBADO,
    TABLA_EXCEL,
    ClaveSeudonimoError,
    EtlCapacitacionError,
    transformar_capacitacion,
    validar_clave,
)
from domain.services.dsld_excel_reader import ExcelLecturaError, leer_tabla_excel
from infrastructure.db.dsld_demuna_repo import (
    CargaError,
    _a_columnas,
    _corte_mismo_mes,
    _filtros_geo,
    _insertar,
    _mapa,
    _marcar_fallida,
    _sha256,
    ultima_carga_exitosa,
)
from infrastructure.db.dsld_modo_ninez_repo import _catalogo_ubigeo
from infrastructure.db.models import (
    DsldCapacitacionModel,
    DsldCargaModel,
    DsldDemunaModel,
    DsldParametroModel,
    DsldUbigeoModel,
)

logger = logging.getLogger("dsld_capacitacion")

ORIGEN_CAPACITACION = "CAPACITACION"
VARIABLE_CLAVE = "DSLD_CLAVE_SEUDONIMO"
PARAMETRO_CLAVE = "clave_seudonimo_dni"


def obtener_clave(db: Session) -> bytes:
    """
    Clave con la que el DNI se convierte en un código irreversible.

    1. La variable de entorno DSLD_CLAVE_SEUDONIMO, si está configurada.
    2. Si no, la clave guardada en DSLD_PARAMETROS.
    3. Si tampoco existe, se genera una al azar y se guarda ahí mismo, para que las
       siguientes importaciones produzcan los mismos códigos y los conteos de personas
       distintas sigan cuadrando. El DNI nunca se guarda.
    """
    del_entorno = os.getenv(VARIABLE_CLAVE)
    if del_entorno:
        return validar_clave(del_entorno)

    guardada = db.get(DsldParametroModel, PARAMETRO_CLAVE)
    if guardada and guardada.valor:
        return validar_clave(guardada.valor)

    nueva = secrets.token_hex(32)
    db.add(DsldParametroModel(clave=PARAMETRO_CLAVE, valor=nueva))
    db.commit()
    logger.info("Se generó automáticamente la clave de seudonimización del DNI y se guardó en DSLD_PARAMETROS.")
    return validar_clave(nueva)


def importar_capacitacion(db: Session, ruta: str, nombre_archivo: str, usuario: Optional[str]) -> Dict[str, Any]:
    """Importa el Excel de capacitación. Lanza CargaError si falla (sin modificar los datos)."""
    try:
        clave = obtener_clave(db)
    except ClaveSeudonimoError as exc:
        db.rollback()
        raise CargaError(str(exc), None, 500) from exc

    carga = DsldCargaModel(
        origen=ORIGEN_CAPACITACION,
        archivo=(nombre_archivo or ruta)[:500],
        archivoHash=_sha256(ruta),
        archivoFecha=datetime.fromtimestamp(os.path.getmtime(ruta)),
        usuario=(usuario or None) and usuario[:100],
        estado="EN_PROCESO",
        fechaInicio=datetime.now(),
    )
    db.add(carga)
    db.commit()
    carga_id = carga.id

    try:
        df = leer_tabla_excel(ruta, TABLA_EXCEL, COLUMNAS_USADAS, COLUMNAS_REQUERIDAS)
        padron = dict(db.execute(select(DsldDemunaModel.codigo, DsldDemunaModel.ubigeo)).all())
        res = transformar_capacitacion(df, clave, padron, _catalogo_ubigeo(db))
        del df

        db.execute(delete(DsldCapacitacionModel))
        _insertar(db, DsldCapacitacionModel, _a_columnas(res.participaciones, _mapa(res.participaciones), carga_id))

        resumen = res.resumen()
        carga = db.get(DsldCargaModel, carga_id)
        carga.estado = "EXITOSA"
        carga.fechaFin = datetime.now()
        carga.registrosLeidos = res.leidos
        carga.registrosCargados = len(res.participaciones)
        carga.registrosRechazados = res.descartados
        carga.detalle = json.dumps(resumen, ensure_ascii=False)[:4000]
        db.commit()
        resumen["cargaId"] = carga_id
        return resumen

    except (ExcelLecturaError, EtlCapacitacionError) as exc:
        db.rollback()
        _marcar_fallida(db, carga_id, str(exc))
        raise CargaError(str(exc), carga_id, 400) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error importando capacitación (carga %s)", carga_id)
        _marcar_fallida(db, carga_id, f"Error interno: {type(exc).__name__}")
        raise CargaError(f"Error al guardar en la base de datos: {type(exc).__name__}", carga_id, 500) from exc


# ─── Consultas del tablero ───────────────────────────────────────────────────

def _filtros_geo_anio(q, departamento: Optional[str], provincia: Optional[str], anio: Optional[int] = None):
    C = DsldCapacitacionModel
    if departamento and departamento.upper() not in ("TODOS", "TODAS"):
        q = q.where(C.departamentoMod == departamento.upper())
    if provincia and provincia.upper() not in ("TODOS", "TODAS"):
        q = q.where(C.provincia == provincia.upper())
    if anio:
        q = q.where(C.anio == anio)
    return q


def _filtros(q, departamento: Optional[str], provincia: Optional[str], anio: Optional[int] = None):
    """Filtros del tablero: solo APROBADO (regla del Power BI)."""
    return _filtros_geo_anio(q.where(DsldCapacitacionModel.estado == ESTADO_APROBADO), departamento, provincia, anio)


def _metricas(C):
    return [
        func.count().label("participaciones"),
        func.count(C.personaId).label("personas"),
        func.count(distinct(C.personaId)).label("distintas"),
        func.sum(case((C.tipoCapacitacion == "VIRTUAL", 1), else_=0)).label("virtual"),
        func.sum(case((C.tipoCapacitacion == "PRESENCIAL", 1), else_=0)).label("presencial"),
        func.count(distinct(C.codigoDemuna)).label("demunas"),
    ]


def _fila(r) -> Dict[str, int]:
    return {
        "participaciones": int(r.participaciones or 0),
        "personas": int(r.personas or 0),
        "personasDistintas": int(r.distintas or 0),
        "virtual": int(r.virtual or 0),
        "presencial": int(r.presencial or 0),
        "demunas": int(r.demunas or 0),
    }


def _pct(a: int, b: int) -> float:
    return round(a / b * 100, 1) if b else 0.0


def resumen_capacitacion(
    db: Session,
    departamento: Optional[str] = None,
    provincia: Optional[str] = None,
    anio: Optional[int] = None,
) -> Dict[str, Any]:
    C = DsldCapacitacionModel
    f = lambda q: _filtros(q, departamento, provincia, anio)  # noqa: E731

    r = db.execute(f(select(
        *_metricas(C),
        func.count(distinct(C.ubigeo)).label("distritos"),
        func.count(distinct(func.substr(C.ubigeo, 1, 4))).label("provincias"),
        func.count(distinct(C.ccdd)).label("departamentos"),
        func.sum(case((C.sexo == "M", 1), else_=0)).label("mujeres"),
        func.sum(case((C.sexo == "H", 1), else_=0)).label("hombres"),
        func.max(C.fechaInicio).label("ultima"),
        func.min(C.fechaInicio).label("primera"),
    ))).one()
    base = _fila(r)

    # Universo: DEMUNA del padrón (Total_Distritos / Total_Provincias / Total_Departamentos)
    D, U = DsldDemunaModel, DsldUbigeoModel
    t = db.execute(_filtros_geo(
        select(
            func.count(distinct(D.ubigeo)),
            func.count(distinct(func.substr(D.ubigeo, 1, 4))),
            func.count(distinct(func.substr(D.ubigeo, 1, 2))),
            func.count(distinct(D.codigo)),
        ).select_from(D).join(U, U.ubigeo == D.ubigeo),
        departamento, provincia,
    )).one()
    tot_dist, tot_prov, tot_dep, tot_demunas = (int(x or 0) for x in t)

    # Tasa de aprobación: aprobados / (aprobados + desaprobados)
    estados = dict(db.execute(_filtros_geo_anio(
        select(C.estado, func.count()).where(C.estado.in_([ESTADO_APROBADO, "DESAPROBADO"])).group_by(C.estado),
        departamento, provincia, anio,
    )).all())
    aprob, desap = int(estados.get(ESTADO_APROBADO, 0)), int(estados.get("DESAPROBADO", 0))

    por_anio = []
    for fila in db.execute(_filtros(
        select(C.anio, *_metricas(C)).group_by(C.anio).order_by(C.anio), departamento, provincia
    )).all():
        por_anio.append({"anio": int(fila.anio), **_fila(fila)})

    # Comparativo al mismo corte (COUNT(DNI) como el Power BI)
    anios_disp = [a["anio"] for a in por_anio]
    comparativo = None
    if anios_disp:
        actual = max(anios_disp)
        fechas: Dict[int, list] = defaultdict(list)
        for anio_f, fecha in db.execute(_filtros(
            select(C.anio, C.fechaInicio).where(C.personaId.isnot(None), C.anio.in_([actual, actual - 1])),
            departamento, provincia,
        )).all():
            fechas[int(anio_f)].append(fecha)
        comparativo = _corte_mismo_mes(fechas, actual)

    por_curso = []
    for fila in db.execute(f(
        select(C.curso, func.max(C.siglasCurso).label("siglas"), *_metricas(C))
        .group_by(C.curso).order_by(func.count().desc())
    )).all():
        por_curso.append({"curso": fila.curso or "SIN CURSO", "siglas": fila.siglas, **_fila(fila)})

    asistentes = {
        (a or "SIN DATO"): int(n)
        for a, n in db.execute(f(select(C.tipoAsistente, func.count()).group_by(C.tipoAsistente))).all()
    }
    anios_todos = [int(a) for (a,) in db.execute(
        select(distinct(C.anio)).where(C.estado == ESTADO_APROBADO).order_by(C.anio)
    ).all()]

    mujeres, hombres = int(r.mujeres or 0), int(r.hombres or 0)
    distritos, provincias, departamentos = int(r.distritos or 0), int(r.provincias or 0), int(r.departamentos or 0)
    return {
        "migrado": True,
        **base,
        "totalPersonas": base["personas"],   # compatibilidad con el bloque anterior
        "pctVirtual": _pct(base["virtual"], base["participaciones"]),
        "pctPresencial": _pct(base["presencial"], base["participaciones"]),
        "mujeres": mujeres,
        "hombres": hombres,
        "pctMujeres": _pct(mujeres, mujeres + hombres),
        "pctHombres": _pct(hombres, mujeres + hombres),
        "tasaAprobacion": _pct(aprob, aprob + desap),
        "desaprobados": desap,
        "cobertura": {
            "distritos": distritos, "totalDistritos": tot_dist, "pctDistritos": _pct(distritos, tot_dist),
            "provincias": provincias, "totalProvincias": tot_prov, "pctProvincias": _pct(provincias, tot_prov),
            "departamentos": departamentos, "totalDepartamentos": tot_dep,
            "pctDepartamentos": _pct(departamentos, tot_dep),
            "demunas": base["demunas"], "totalDemunas": tot_demunas, "pctDemunas": _pct(base["demunas"], tot_demunas),
        },
        "primeraFecha": r.primera.isoformat() if r.primera else None,
        "ultimaActualizacion": r.ultima.isoformat() if r.ultima else None,
        "anio": anio,
        "anios": anios_todos,
        "porAnio": por_anio,
        "comparativoCorte": comparativo,
        "porCurso": por_curso,
        "porTipoAsistente": asistentes,
        "ultimaCarga": ultima_carga_exitosa(db, ORIGEN_CAPACITACION),
    }


def capacitacion_por_departamento(db: Session, anio: Optional[int] = None) -> List[Dict[str, Any]]:
    """Ranking por departamento analítico con cobertura de DEMUNA del padrón."""
    C, D, U = DsldCapacitacionModel, DsldDemunaModel, DsldUbigeoModel
    totales = dict(db.execute(
        select(U.departamentoMod, func.count(distinct(D.codigo)))
        .select_from(D).join(U, U.ubigeo == D.ubigeo).group_by(U.departamentoMod)
    ).all())
    salida = []
    for fila in db.execute(_filtros(
        select(C.departamentoMod, *_metricas(C)).group_by(C.departamentoMod).order_by(func.count().desc()),
        None, None, anio,
    )).all():
        dep = fila.departamentoMod or "SIN DEPARTAMENTO"
        datos = _fila(fila)
        total = int(totales.get(fila.departamentoMod, 0))
        salida.append({
            "departamento": dep, **datos, "totalDemunas": total,
            "pctDemunas": _pct(datos["demunas"], total) if total else None,
        })
    return salida
