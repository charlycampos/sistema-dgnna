"""
Repositorio DSLD · CCONNA (Oracle).

- `importar_cconna`: lee las hojas "BD ORGANIZACIONAL" y "BD NOMINAL", valida y reemplaza
  los datos en una sola transacción; cada intento queda en DSLD_CARGAS.
- Consultas del tablero: equivalentes a las medidas MEDIDA_CCONNA del Power BI.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import case, delete, distinct, func, or_, select
from sqlalchemy.orm import Session

from domain.services.dsld_cconna_etl import (
    COLUMNAS_INTEGRANTES,
    COLUMNAS_ORGANIZACIONES,
    CONDICION_EX,
    CONDICION_INTEGRANTE,
    REQUERIDAS_INTEGRANTES,
    REQUERIDAS_ORGANIZACIONES,
    TABLA_INTEGRANTES,
    TABLA_ORGANIZACIONES,
    EtlCconnaError,
    transformar_cconna,
)
from domain.services.dsld_excel_reader import ExcelLecturaError, leer_tablas_excel
from infrastructure.db.dsld_demuna_repo import (
    CargaError,
    _a_columnas,
    _filtros_geo,
    _insertar,
    _mapa,
    _marcar_fallida,
    _sha256,
    ultima_carga_exitosa,
)
from infrastructure.db.dsld_modo_ninez_repo import _catalogo_ubigeo
from infrastructure.db.models import (
    DsldCargaModel,
    DsldCconnaIntegranteModel,
    DsldCconnaModel,
    DsldDemunaModel,
    DsldUbigeoModel,
)

logger = logging.getLogger("dsld_cconna")

ORIGEN_CCONNA = "CCONNA"
NIVELES = ("DISTRITAL", "PROVINCIAL", "REGIONAL")


def importar_cconna(db: Session, ruta: str, nombre_archivo: str, usuario: Optional[str]) -> Dict[str, Any]:
    """Importa el Excel de CCONNA. Lanza CargaError si falla (sin modificar los datos)."""
    carga = DsldCargaModel(
        origen=ORIGEN_CCONNA,
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
        tablas = leer_tablas_excel(ruta, {
            TABLA_ORGANIZACIONES: (COLUMNAS_ORGANIZACIONES, REQUERIDAS_ORGANIZACIONES),
            TABLA_INTEGRANTES: (COLUMNAS_INTEGRANTES, REQUERIDAS_INTEGRANTES),
        })
        res = transformar_cconna(tablas, _catalogo_ubigeo(db))
        del tablas

        db.execute(delete(DsldCconnaIntegranteModel))
        db.execute(delete(DsldCconnaModel))
        _insertar(db, DsldCconnaModel, _a_columnas(res.organizaciones, _mapa(res.organizaciones), carga_id))
        _insertar(db, DsldCconnaIntegranteModel, _a_columnas(res.integrantes, _mapa(res.integrantes), carga_id))

        resumen = res.resumen()
        carga = db.get(DsldCargaModel, carga_id)
        carga.estado = "EXITOSA"
        carga.fechaFin = datetime.now()
        carga.registrosLeidos = sum(res.leidos.values())
        carga.registrosCargados = len(res.organizaciones) + len(res.integrantes)
        carga.registrosRechazados = res.descartados
        carga.detalle = json.dumps(resumen, ensure_ascii=False)[:4000]
        db.commit()
        resumen["cargaId"] = carga_id
        return resumen

    except (ExcelLecturaError, EtlCconnaError) as exc:
        db.rollback()
        _marcar_fallida(db, carga_id, str(exc))
        raise CargaError(str(exc), carga_id, 400) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error importando CCONNA (carga %s)", carga_id)
        _marcar_fallida(db, carga_id, f"Error interno: {type(exc).__name__}")
        raise CargaError(f"Error al guardar en la base de datos: {type(exc).__name__}", carga_id, 500) from exc


# ─── Consultas del tablero ───────────────────────────────────────────────────

def _filtros(q, modelo, departamento: Optional[str], provincia: Optional[str]):
    if departamento and departamento.upper() not in ("TODOS", "TODAS"):
        q = q.where(modelo.departamentoMod == departamento.upper())
    if provincia and provincia.upper() not in ("TODOS", "TODAS"):
        q = q.where(modelo.provincia == provincia.upper())
    return q


def _pct(a: int, b: int) -> float:
    return round(a / b * 100, 1) if b else 0.0


def resumen_cconna(db: Session, departamento: Optional[str] = None, provincia: Optional[str] = None) -> Dict[str, Any]:
    C, I = DsldCconnaModel, DsldCconnaIntegranteModel

    r = db.execute(_filtros(select(
        func.count().label("total"),
        *[func.sum(case((C.nivel == n, 1), else_=0)).label(n.lower()) for n in NIVELES],
        func.sum(case((C.registroMimp == "SI", 1), else_=0)).label("registrados"),
        func.count(distinct(case((C.nivel == "DISTRITAL", C.ubigeo)))).label("distritos"),
        func.count(distinct(case((C.nivel == "PROVINCIAL", C.ubigeoProv)))).label("provincias"),
        func.count(distinct(case((C.nivel == "REGIONAL", C.ccdd)))).label("departamentos"),
        func.max(C.fechaRegistro).label("ultimo_registro"),
    ), C, departamento, provincia)).one()

    # Universo: distritos, provincias y departamentos con DEMUNA (padrón del DNA.mdb)
    D, U = DsldDemunaModel, DsldUbigeoModel
    t = db.execute(_filtros_geo(
        select(
            func.count(distinct(D.ubigeo)),
            func.count(distinct(func.substr(D.ubigeo, 1, 4))),
            func.count(distinct(U.ccddAnalitico)),
        ).select_from(D).join(U, U.ubigeo == D.ubigeo),
        departamento, provincia,
    )).one()
    tot_dist, tot_prov, tot_dep = (int(x or 0) for x in t)

    integrantes = {}
    for nivel, condicion, sexo, cantidad in db.execute(_filtros(
        select(I.nivel, I.condicion, I.sexo, func.sum(I.cantidad)).group_by(I.nivel, I.condicion, I.sexo),
        I, departamento, provincia,
    )).all():
        d = integrantes.setdefault((nivel, condicion), {"mujeres": 0, "hombres": 0, "sinDato": 0, "total": 0})
        clave = {"M": "mujeres", "H": "hombres"}.get(sexo, "sinDato")
        d[clave] += int(cantidad or 0)
        d["total"] += int(cantidad or 0)

    activos = integrantes.get(("DISTRITAL", CONDICION_INTEGRANTE), {"mujeres": 0, "hombres": 0, "sinDato": 0, "total": 0})
    por_nivel_int = {n: integrantes.get((n, CONDICION_INTEGRANTE), {}).get("total", 0)
                     for n in NIVELES + ("NACIONAL",)}

    por_anio = [
        {"anio": int(a), "total": int(n)}
        for a, n in db.execute(_filtros(
            select(C.anioConformacion, func.count()).where(C.anioConformacion.isnot(None))
            .group_by(C.anioConformacion).order_by(C.anioConformacion),
            C, departamento, provincia,
        )).all()
    ]
    acumulado = 0
    for fila in por_anio:
        acumulado += fila["total"]
        fila["acumulado"] = acumulado

    documentos = {
        "conOrdenanza": 0, "conResolucion": 0, "conActa": 0, "conPlan": 0, "conBaseNominal": 0,
    }
    d = db.execute(_filtros(select(
        func.sum(case((C.numeroOrdenanza.isnot(None), 1), else_=0)),
        func.sum(case((C.numeroResolucion.isnot(None), 1), else_=0)),
        func.sum(case((C.fechaActa.isnot(None), 1), else_=0)),
        func.sum(case((C.fechaPlan.isnot(None), 1), else_=0)),
        func.sum(case((C.baseNominal == "REGISTRA NNA", 1), else_=0)),
    ), C, departamento, provincia)).one()
    documentos = dict(zip(documentos.keys(), (int(x or 0) for x in d)))

    total = int(r.total or 0)
    distritos, provincias, departamentos = int(r.distritos or 0), int(r.provincias or 0), int(r.departamentos or 0)
    return {
        "migrado": True,
        "totalConformados": total,
        "distritales": int(r.distrital or 0),
        "provinciales": int(r.provincial or 0),
        "regionales": int(r.regional or 0),
        "registradosMimp": int(r.registrados or 0),
        "pctRegistrados": _pct(int(r.registrados or 0), total),
        "totalNnaIntegrantes": activos["total"],
        "mujeres": activos["mujeres"],
        "hombres": activos["hombres"],
        "pctMujeres": _pct(activos["mujeres"], activos["total"]),
        "pctHombres": _pct(activos["hombres"], activos["total"]),
        "exIntegrantes": integrantes.get(("DISTRITAL", CONDICION_EX), {}).get("total", 0),
        "integrantesPorNivel": por_nivel_int,
        "cobertura": {
            "distritos": distritos, "totalDistritos": tot_dist, "pctDistritos": _pct(distritos, tot_dist),
            "provincias": provincias, "totalProvincias": tot_prov, "pctProvincias": _pct(provincias, tot_prov),
            "departamentos": departamentos, "totalDepartamentos": tot_dep,
            "pctDepartamentos": _pct(departamentos, tot_dep),
        },
        "documentos": documentos,
        "porAnio": por_anio,
        "ultimoRegistro": r.ultimo_registro.isoformat() if r.ultimo_registro else None,
        "ultimaCarga": ultima_carga_exitosa(db, ORIGEN_CCONNA),
    }


def cconna_por_departamento(db: Session) -> List[Dict[str, Any]]:
    C, I = DsldCconnaModel, DsldCconnaIntegranteModel
    nna = {
        dep: int(n or 0)
        for dep, n in db.execute(
            select(I.departamentoMod, func.sum(I.cantidad))
            .where(I.condicion == CONDICION_INTEGRANTE, I.nivel == "DISTRITAL")
            .group_by(I.departamentoMod)
        ).all()
    }
    filas = db.execute(
        select(
            C.departamentoMod, func.count(),
            *[func.sum(case((C.nivel == n, 1), else_=0)) for n in NIVELES],
            func.sum(case((C.registroMimp == "SI", 1), else_=0)),
        ).group_by(C.departamentoMod).order_by(func.count().desc())
    ).all()
    return [
        {
            "departamento": dep or "SIN DEPARTAMENTO", "total": int(t),
            "distrital": int(d or 0), "provincial": int(p or 0), "regional": int(rg or 0),
            "registradosMimp": int(reg or 0), "integrantes": nna.get(dep, 0),
        }
        for dep, t, d, p, rg, reg in filas
    ]


def listar_cconna(
    db: Session,
    departamento: Optional[str] = None,
    provincia: Optional[str] = None,
    nivel: Optional[str] = None,
    registroMimp: Optional[str] = None,
    busqueda: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Dict[str, Any]:
    C = DsldCconnaModel
    q = _filtros(select(C), C, departamento, provincia)
    if nivel and nivel.upper() in NIVELES:
        q = q.where(C.nivel == nivel.upper())
    if registroMimp and registroMimp.upper() in ("SI", "NO", "OBSERVADO"):
        q = q.where(C.registroMimp == registroMimp.upper())
    if busqueda:
        patron = f"%{busqueda.strip().upper()}%"
        q = q.where(or_(func.upper(C.nombre).like(patron), C.ubigeo.like(patron),
                        C.provincia.like(patron), C.distrito.like(patron)))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    orden = case((C.nivel == "REGIONAL", 1), (C.nivel == "PROVINCIAL", 2), else_=3)
    filas = db.scalars(q.order_by(C.departamentoMod, orden, C.provincia, C.nombre).offset(offset).limit(limit)).all()
    return {
        "total": int(total),
        "items": [
            {
                "ubigeo": c.ubigeo,
                "nivel": c.nivel,
                "nombre": c.nombre,
                "departamento": c.departamentoMod,
                "provincia": c.provincia,
                "distrito": c.distrito,
                "anioConformacion": c.anioConformacion,
                "numeroOrdenanza": c.numeroOrdenanza,
                "fechaOrdenanza": c.fechaOrdenanza.isoformat() if c.fechaOrdenanza else None,
                "fechaActa": c.fechaActa.isoformat() if c.fechaActa else None,
                "fechaPlan": c.fechaPlan.isoformat() if c.fechaPlan else None,
                "baseNominal": c.baseNominal,
                "registroMimp": c.registroMimp,
                "oficioDsld": c.oficioDsld,
                "fechaRegistro": c.fechaRegistro.isoformat() if c.fechaRegistro else None,
            }
            for c in filas
        ],
    }
