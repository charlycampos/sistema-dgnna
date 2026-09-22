"""
Repositorio DSLD · PIAS (Oracle).

- `importar_pias`: lee las tres tablas del Excel PIAS, valida y reemplaza los datos
  en una sola transacción; cada intento queda en DSLD_CARGAS.
- Consultas del tablero: equivalentes a MEDIDADS_PIAS del Power BI.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import case, delete, distinct, func, select
from sqlalchemy.orm import Session

from domain.services.dsld_excel_reader import ExcelLecturaError, leer_tablas_excel
from domain.services.dsld_pias_etl import (
    TABLAS,
    TIPO_AUTORIDAD,
    TIPO_NNA,
    TIPO_PADRE,
    EtlPiasError,
    columnas_requeridas,
    columnas_tabla,
    transformar_pias,
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
from infrastructure.db.dsld_modo_ninez_repo import _catalogo_ubigeo
from infrastructure.db.models import DsldCargaModel, DsldPiasAtencionModel

logger = logging.getLogger("dsld_pias")

ORIGEN_PIAS = "PIAS"
TIPOS = {"nna": TIPO_NNA, "padres": TIPO_PADRE, "autoridades": TIPO_AUTORIDAD}


def importar_pias(db: Session, ruta: str, nombre_archivo: str, usuario: Optional[str]) -> Dict[str, Any]:
    """Importa el Excel PIAS. Lanza CargaError si falla (sin modificar los datos)."""
    carga = DsldCargaModel(
        origen=ORIGEN_PIAS,
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
        tablas = leer_tablas_excel(ruta, {t: (columnas_tabla(t), columnas_requeridas(t)) for t in TABLAS})
        res = transformar_pias(tablas, _catalogo_ubigeo(db))

        db.execute(delete(DsldPiasAtencionModel))
        _insertar(db, DsldPiasAtencionModel, _a_columnas(res.atenciones, _mapa(res.atenciones), carga_id))

        resumen = res.resumen()
        carga = db.get(DsldCargaModel, carga_id)
        carga.estado = "EXITOSA"
        carga.fechaFin = datetime.now()
        carga.registrosLeidos = sum(res.leidos.values())
        carga.registrosCargados = len(res.atenciones)
        carga.registrosRechazados = res.descartados
        carga.detalle = json.dumps(resumen, ensure_ascii=False)[:4000]
        db.commit()
        resumen["cargaId"] = carga_id
        return resumen

    except (ExcelLecturaError, EtlPiasError) as exc:
        db.rollback()
        _marcar_fallida(db, carga_id, str(exc))
        raise CargaError(str(exc), carga_id, 400) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error importando PIAS (carga %s)", carga_id)
        _marcar_fallida(db, carga_id, f"Error interno: {exc}")
        raise CargaError(f"Error al guardar en la base de datos: {exc}", carga_id, 500) from exc


# ─── Consultas del tablero ───────────────────────────────────────────────────

def _filtros(q, departamento: Optional[str], provincia: Optional[str], anio: Optional[int] = None):
    P = DsldPiasAtencionModel
    if departamento and departamento.upper() not in ("TODOS", "TODAS"):
        q = q.where(P.departamentoMod == departamento.upper())
    if provincia and provincia.upper() not in ("TODOS", "TODAS"):
        q = q.where(P.provincia == provincia.upper())
    if anio:
        q = q.where(P.anio == anio)
    return q


def _por_tipo(P):
    return [func.sum(case((P.tipoPersona == t, 1), else_=0)).label(k) for k, t in TIPOS.items()]


def _fila_tipos(nombre: str, valor, total, nna, padres, autoridades) -> Dict[str, Any]:
    return {nombre: valor, "total": int(total or 0), "nna": int(nna or 0),
            "padres": int(padres or 0), "autoridades": int(autoridades or 0)}


def _pct(a: int, b: int) -> float:
    return round(a / b * 100, 1) if b else 0.0


def resumen_pias(
    db: Session,
    departamento: Optional[str] = None,
    provincia: Optional[str] = None,
    anio: Optional[int] = None,
) -> Dict[str, Any]:
    P = DsldPiasAtencionModel
    f = lambda q: _filtros(q, departamento, provincia, anio)  # noqa: E731

    r = db.execute(f(select(
        func.count().label("total"),
        *_por_tipo(P),
        func.sum(case((P.sexo == "M", 1), else_=0)).label("mujeres"),
        func.sum(case((P.sexo == "H", 1), else_=0)).label("hombres"),
        func.count(distinct(P.ubigeo)).label("distritos"),
        func.max(P.fechaAtencion).label("ultima"),
        func.min(P.fechaAtencion).label("primera"),
    ))).one()
    total = int(r.total or 0)
    nna, padres, autoridades = int(r.nna or 0), int(r.padres or 0), int(r.autoridades or 0)

    comunidades = db.scalar(select(func.count()).select_from(
        f(select(P.ubigeo, P.centroPoblado).where(P.centroPoblado.isnot(None)).distinct()).subquery()
    )) or 0

    por_cuenca = [
        _fila_tipos("cuenca", c, t, a, b, d)
        for c, t, a, b, d in db.execute(f(
            select(P.cuenca, func.count(), *_por_tipo(P)).group_by(P.cuenca).order_by(func.count().desc())
        )).all()
    ]
    por_mes = [
        {**_fila_tipos("mes", int(m), t, a, b, d), "anio": int(y)}
        for y, m, t, a, b, d in db.execute(f(
            select(P.anio, P.mes, func.count(), *_por_tipo(P))
            .where(P.mes.isnot(None)).group_by(P.anio, P.mes).order_by(P.anio, P.mes)
        )).all()
    ]
    sexo_por_tipo = {
        k: {"mujeres": 0, "hombres": 0, "sinDato": 0} for k in TIPOS
    }
    inverso = {v: k for k, v in TIPOS.items()}
    for tipo, sexo, n in db.execute(f(
        select(P.tipoPersona, P.sexo, func.count()).group_by(P.tipoPersona, P.sexo)
    )).all():
        clave = {"M": "mujeres", "H": "hombres"}.get(sexo, "sinDato")
        sexo_por_tipo[inverso[tipo]][clave] += int(n)

    modalidad = {
        (m or "SIN DATO"): int(n)
        for m, n in db.execute(f(select(P.modalidad, func.count()).group_by(P.modalidad))).all()
    }
    anios = [int(a) for (a,) in db.execute(select(distinct(P.anio)).order_by(P.anio)).all()]

    mujeres, hombres = int(r.mujeres or 0), int(r.hombres or 0)
    return {
        "migrado": True,
        "totalAtendidos": total,
        "nna": nna,
        "padres": padres,
        "autoridades": autoridades,
        "pctNna": _pct(nna, total),
        "pctPadres": _pct(padres, total),
        "pctAutoridades": _pct(autoridades, total),
        "mujeres": mujeres,
        "hombres": hombres,
        "pctMujeres": _pct(mujeres, total),
        "pctHombres": _pct(hombres, total),
        "distritos": int(r.distritos or 0),
        "comunidades": int(comunidades),
        "primeraFecha": r.primera.isoformat() if r.primera else None,
        "ultimaActualizacion": r.ultima.isoformat() if r.ultima else None,
        "anios": anios,
        "anio": anio,
        "porCuenca": por_cuenca,
        "porMes": por_mes,
        "sexoPorTipo": sexo_por_tipo,
        "porModalidad": modalidad,
        "ultimaCarga": ultima_carga_exitosa(db, ORIGEN_PIAS),
    }


def pias_por_distrito(
    db: Session,
    departamento: Optional[str] = None,
    provincia: Optional[str] = None,
    anio: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Atenciones por distrito y cuenca (tabla del tablero y exportación)."""
    P = DsldPiasAtencionModel
    filas = db.execute(_filtros(
        select(
            P.departamentoMod, P.provincia, P.distrito, P.ubigeo, P.cuenca,
            func.count(), *_por_tipo(P),
            func.sum(case((P.sexo == "M", 1), else_=0)),
            func.sum(case((P.sexo == "H", 1), else_=0)),
            func.count(distinct(P.centroPoblado)),
            func.max(P.fechaAtencion),
        ).group_by(P.departamentoMod, P.provincia, P.distrito, P.ubigeo, P.cuenca)
        .order_by(func.count().desc()),
        departamento, provincia, anio,
    )).all()
    return [
        {
            "departamento": d, "provincia": p, "distrito": di, "ubigeo": u, "cuenca": c,
            "total": int(t), "nna": int(a or 0), "padres": int(b or 0), "autoridades": int(x or 0),
            "mujeres": int(m or 0), "hombres": int(h or 0), "comunidades": int(cc or 0),
            "ultimaFecha": uf.isoformat() if uf else None,
        }
        for d, p, di, u, c, t, a, b, x, m, h, cc, uf in filas
    ]
