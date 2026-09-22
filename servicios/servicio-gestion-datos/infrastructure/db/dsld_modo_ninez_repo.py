"""
Repositorio DSLD · Ponte en Modo Niñez (Oracle).

- `importar_modo_ninez`: lee la tabla TB_MODO_NINEZ_2026 del Excel, valida y
  reemplaza los datos en una sola transacción; cada intento queda en DSLD_CARGAS.
- Consultas del tablero: equivalentes a las medidas MEDIDAS_MODO_NIÑEZ del Power BI.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.orm import Session

from domain.services.dsld_excel_reader import ExcelLecturaError, leer_tabla_excel
from domain.services.dsld_modo_ninez_etl import (
    COLUMNAS_REQUERIDAS,
    COLUMNAS_USADAS,
    TABLA_EXCEL,
    EtlModoNinezError,
    transformar_modo_ninez,
)
from infrastructure.db.dsld_demuna_repo import (
    CargaError,
    _a_columnas,
    _insertar,
    _mapa,
    _marcar_fallida,
    _sha256,
    ultima_carga_exitosa,
)
from infrastructure.db.models import DsldCargaModel, DsldModoNinezModel, DsldUbigeoModel

logger = logging.getLogger("dsld_modo_ninez")

ORIGEN_MODO_NINEZ = "MODO_NINEZ"
NIVELES = ("REGIONAL", "PROVINCIAL", "DISTRITAL")


def _catalogo_ubigeo(db: Session) -> Dict[str, Dict[str, Optional[str]]]:
    """Nombres oficiales del DNA.mdb (DSLD_UBIGEO), para que los filtros coincidan con el padrón."""
    filas = db.execute(
        select(DsldUbigeoModel.ubigeo, DsldUbigeoModel.departamento,
               DsldUbigeoModel.provincia, DsldUbigeoModel.distrito)
    ).all()
    return {u: {"departamento": d, "provincia": p, "distrito": di} for u, d, p, di in filas}


def importar_modo_ninez(db: Session, ruta: str, nombre_archivo: str, usuario: Optional[str]) -> Dict[str, Any]:
    """Importa la matriz de Modo Niñez. Lanza CargaError si falla (sin modificar los datos)."""
    carga = DsldCargaModel(
        origen=ORIGEN_MODO_NINEZ,
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
        res = transformar_modo_ninez(df, _catalogo_ubigeo(db))

        db.execute(delete(DsldModoNinezModel))
        _insertar(db, DsldModoNinezModel, _a_columnas(res.gobiernos, _mapa(res.gobiernos), carga_id))

        resumen = res.resumen()
        carga = db.get(DsldCargaModel, carga_id)
        carga.estado = "EXITOSA"
        carga.fechaFin = datetime.now()
        carga.registrosLeidos = res.leidos
        carga.registrosCargados = len(res.gobiernos)
        carga.registrosRechazados = res.descartados
        carga.detalle = json.dumps(resumen, ensure_ascii=False)[:4000]
        db.commit()
        resumen["cargaId"] = carga_id
        return resumen

    except (ExcelLecturaError, EtlModoNinezError) as exc:
        db.rollback()
        _marcar_fallida(db, carga_id, str(exc))
        raise CargaError(str(exc), carga_id, 400) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error importando Modo Niñez (carga %s)", carga_id)
        _marcar_fallida(db, carga_id, f"Error interno: {exc}")
        raise CargaError(f"Error al guardar en la base de datos: {exc}", carga_id, 500) from exc


# ─── Consultas del tablero ───────────────────────────────────────────────────

def _filtros(q, departamento: Optional[str], provincia: Optional[str]):
    M = DsldModoNinezModel
    if departamento and departamento.upper() not in ("TODOS", "TODAS"):
        q = q.where(M.departamentoMod == departamento.upper())
    if provincia and provincia.upper() not in ("TODOS", "TODAS"):
        q = q.where(M.provincia == provincia.upper())
    return q


def _por_nivel(M):
    return [func.sum(case((M.nivelGobierno == n, 1), else_=0)).label(n.lower()) for n in NIVELES]


def resumen_modo_ninez(db: Session, departamento: Optional[str] = None, provincia: Optional[str] = None) -> Dict[str, Any]:
    M = DsldModoNinezModel
    adheridos = M.adherido == "S"

    r = db.execute(_filtros(
        select(
            func.count().label("total"),
            *_por_nivel(M),
            func.sum(case((M.fechaPresentacion.isnot(None), 1), else_=0)).label("presentaron"),
            *[func.sum(case(((M.nivelGobierno == n) & M.fechaPresentacion.isnot(None), 1), else_=0)).label(f"p_{n.lower()}")
              for n in NIVELES],
            func.sum(case((M.anioAdhesion.is_(None), 1), else_=0)).label("sin_anio"),
            func.max(M.anioPresentacion).label("anio_presentacion"),
            func.max(M.fechaPresentacion).label("ultima_presentacion"),
        ).where(adheridos),
        departamento, provincia,
    )).one()

    por_anio = [
        {"anio": int(a), "regional": int(x or 0), "provincial": int(y or 0), "distrital": int(z or 0),
         "total": int(x or 0) + int(y or 0) + int(z or 0)}
        for a, x, y, z in db.execute(_filtros(
            select(M.anioAdhesion, *_por_nivel(M))
            .where(adheridos, M.anioAdhesion.isnot(None))
            .group_by(M.anioAdhesion).order_by(M.anioAdhesion),
            departamento, provincia,
        )).all()
    ]
    acumulado = 0
    for fila in por_anio:
        acumulado += fila["total"]
        fila["acumulado"] = acumulado

    por_macro = [
        {"macroregion": m or "SIN MACRORREGIÓN", "total": int(t)}
        for m, t in db.execute(_filtros(
            select(M.macroregion, func.count()).where(adheridos)
            .group_by(M.macroregion).order_by(func.count().desc()),
            departamento, provincia,
        )).all()
    ]

    por_estado = {
        (e or "SIN DATO"): int(t)
        for e, t in db.execute(_filtros(
            select(M.estadoDemuna, func.count())
            .where(adheridos, M.nivelGobierno != "REGIONAL")
            .group_by(M.estadoDemuna),
            departamento, provincia,
        )).all()
    }

    total = int(r.total or 0)
    carga = ultima_carga_exitosa(db, ORIGEN_MODO_NINEZ)
    return {
        "migrado": True,
        "gobiernosAdheridos": total,
        "regionales": int(r.regional or 0),
        "provinciales": int(r.provincial or 0),
        "distritales": int(r.distrital or 0),
        "presentaronReporte": int(r.presentaron or 0),
        "presentaronPorNivel": {
            "regional": int(r.p_regional or 0),
            "provincial": int(r.p_provincial or 0),
            "distrital": int(r.p_distrital or 0),
        },
        "pctPresentaron": round(int(r.presentaron or 0) / total * 100, 1) if total else 0.0,
        "anioPresentacion": int(r.anio_presentacion) if r.anio_presentacion else None,
        "ultimaPresentacion": r.ultima_presentacion.isoformat() if r.ultima_presentacion else None,
        "sinAnioAdhesion": int(r.sin_anio or 0),
        "porAnio": por_anio,
        "porMacroregion": por_macro,
        "porEstadoDemuna": por_estado,
        "ultimaCarga": carga,
    }


def modo_ninez_por_departamento(db: Session) -> List[Dict[str, Any]]:
    M = DsldModoNinezModel
    filas = db.execute(
        select(
            M.departamentoMod, func.count(), *_por_nivel(M),
            func.sum(case((M.fechaPresentacion.isnot(None), 1), else_=0)),
        )
        .where(M.adherido == "S")
        .group_by(M.departamentoMod)
        .order_by(func.count().desc(), M.departamentoMod)
    ).all()
    return [
        {"departamento": d or "SIN DEPARTAMENTO", "total": int(t), "regional": int(x or 0),
         "provincial": int(y or 0), "distrital": int(z or 0), "presentaron": int(p or 0)}
        for d, t, x, y, z, p in filas
    ]


def listar_gobiernos(
    db: Session,
    departamento: Optional[str] = None,
    provincia: Optional[str] = None,
    nivel: Optional[str] = None,
    presento: Optional[bool] = None,
    busqueda: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Dict[str, Any]:
    M = DsldModoNinezModel
    q = _filtros(select(M).where(M.adherido == "S"), departamento, provincia)
    if nivel and nivel.upper() in NIVELES:
        q = q.where(M.nivelGobierno == nivel.upper())
    if presento is not None:
        q = q.where(M.fechaPresentacion.isnot(None) if presento else M.fechaPresentacion.is_(None))
    if busqueda:
        patron = f"%{busqueda.strip().upper()}%"
        q = q.where(or_(func.upper(M.nombreGobierno).like(patron), M.ubigeo.like(patron),
                        M.provincia.like(patron), M.distrito.like(patron)))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    orden = case((M.nivelGobierno == "REGIONAL", 1), (M.nivelGobierno == "PROVINCIAL", 2), else_=3)
    filas = db.scalars(
        q.order_by(M.departamentoMod, orden, M.provincia, M.nombreGobierno).offset(offset).limit(limit)
    ).all()
    return {
        "total": int(total),
        "items": [
            {
                "ubigeo": g.ubigeo,
                "nivel": g.nivelGobierno,
                "gobierno": g.nombreGobierno,
                "macroregion": g.macroregion,
                "departamento": g.departamentoMod,
                "provincia": g.provincia,
                "distrito": g.distrito,
                "anioAdhesion": g.anioAdhesion,
                "fechaPresentacion": g.fechaPresentacion.isoformat() if g.fechaPresentacion else None,
                "fechaActa": g.fechaActa.isoformat() if g.fechaActa else None,
                "codigoDemuna": g.codigoDemuna,
                "estadoDemuna": g.estadoDemuna,
            }
            for g in filas
        ],
    }
