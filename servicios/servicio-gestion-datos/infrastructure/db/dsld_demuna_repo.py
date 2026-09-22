"""
Repositorio DSLD · DEMUNA y Supervisión (Oracle).

- `importar_dna`: lee DNA.mdb, transforma, valida y reemplaza los datos en una
  sola transacción. Cada intento queda registrado en DSLD_CARGAS.
- Consultas del tablero: equivalentes a las medidas del Power BI DSLD_GENERAL_V3.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import case, delete, func, insert, or_, select
from sqlalchemy.orm import Session

from domain.services.dsld_access_reader import AccessLecturaError, leer_tablas_access
from domain.services.dsld_demuna_etl import TABLAS_ACCESS, EtlValidacionError, transformar_dna
from infrastructure.db.models import (
    DsldCargaModel,
    DsldCatEstadoModel,
    DsldCatModeloModel,
    DsldCatSupervisorModel,
    DsldDemunaModel,
    DsldPoblacionModel,
    DsldSupervisionModel,
    DsldUbigeoModel,
)

logger = logging.getLogger("dsld_demuna")

ORIGEN_ACCESS = "ACCESS_DNA"
MODALIDAD_SUPERVISION = {1: "VIRTUAL", 2: "PRESENCIAL"}
_LOTE = 1000


class CargaError(Exception):
    """Error de carga ya registrado en DSLD_CARGAS (carga_id disponible)."""

    def __init__(self, mensaje: str, carga_id: Optional[int], status: int = 400):
        super().__init__(mensaje)
        self.carga_id = carga_id
        self.status = status


# ─── Carga ───────────────────────────────────────────────────────────────────

def _sha256(ruta: str) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloque)
    return h.hexdigest()


def _insertar(db: Session, modelo, filas: List[Dict[str, Any]]) -> None:
    for i in range(0, len(filas), _LOTE):
        db.execute(insert(modelo), filas[i:i + _LOTE])


def _a_columnas(filas: List[Dict[str, Any]], mapa: Dict[str, str], carga_id: Optional[int] = None):
    """Convierte claves snake_case del ETL a los atributos del modelo."""
    salida = []
    for f in filas:
        d = {mapa.get(k, k): v for k, v in f.items()}
        if carga_id is not None:
            d["cargaId"] = carga_id
        salida.append(d)
    return salida


def _camel(s: str) -> str:
    partes = s.split("_")
    return partes[0] + "".join(p[:1].upper() + p[1:] for p in partes[1:])


def _mapa(filas: List[Dict[str, Any]], especiales: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    claves = filas[0].keys() if filas else []
    m = {k: _camel(k) for k in claves}
    m.update(especiales or {})
    return m


def importar_dna(db: Session, ruta: str, nombre_archivo: str, usuario: Optional[str]) -> Dict[str, Any]:
    """Importa DNA.mdb. Devuelve el resumen; lanza CargaError si falla (sin modificar los datos)."""
    carga = DsldCargaModel(
        origen=ORIGEN_ACCESS,
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
        tablas = leer_tablas_access(ruta, TABLAS_ACCESS)
        res = transformar_dna(tablas)

        # Reemplazo completo en una sola transacción (orden por llaves foráneas)
        db.execute(delete(DsldSupervisionModel))
        db.execute(delete(DsldDemunaModel))
        db.execute(delete(DsldPoblacionModel))
        db.execute(delete(DsldUbigeoModel))
        db.execute(delete(DsldCatEstadoModel))
        db.execute(delete(DsldCatModeloModel))
        db.execute(delete(DsldCatSupervisorModel))

        _insertar(db, DsldCatEstadoModel, _a_columnas(res.estados, _mapa(res.estados)))
        _insertar(db, DsldCatModeloModel, _a_columnas(res.modelos, _mapa(res.modelos)))
        if res.supervisores:
            _insertar(db, DsldCatSupervisorModel, res.supervisores)
        _insertar(db, DsldUbigeoModel, _a_columnas(res.ubigeos, _mapa(res.ubigeos), carga_id))
        if res.poblacion:
            _insertar(db, DsldPoblacionModel, _a_columnas(res.poblacion, _mapa(res.poblacion), carga_id))
        _insertar(db, DsldDemunaModel, _a_columnas(
            res.demunas,
            _mapa(res.demunas, {"pi_2022": "pi2022", "pi_2025": "pi2025", "rango_pi_2023": "rangoPi2023"}),
            carga_id,
        ))
        _insertar(db, DsldSupervisionModel, _a_columnas(res.supervisiones, _mapa(res.supervisiones), carga_id))

        resumen = res.resumen()
        carga = db.get(DsldCargaModel, carga_id)
        carga.estado = "EXITOSA"
        carga.fechaFin = datetime.now()
        carga.registrosLeidos = res.total_leidos
        carga.registrosCargados = res.total_cargados
        carga.registrosRechazados = res.total_descartados
        carga.detalle = json.dumps(resumen, ensure_ascii=False)[:4000]
        db.commit()
        resumen["cargaId"] = carga_id
        return resumen

    except (AccessLecturaError, EtlValidacionError) as exc:
        db.rollback()
        _marcar_fallida(db, carga_id, str(exc))
        raise CargaError(str(exc), carga_id, 400) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error importando DNA.mdb (carga %s)", carga_id)
        _marcar_fallida(db, carga_id, f"Error interno: {exc}")
        raise CargaError(f"Error al guardar en la base de datos: {exc}", carga_id, 500) from exc


def _marcar_fallida(db: Session, carga_id: int, mensaje: str) -> None:
    try:
        carga = db.get(DsldCargaModel, carga_id)
        if carga:
            carga.estado = "FALLIDA"
            carga.fechaFin = datetime.now()
            carga.detalle = mensaje[:4000]
            db.commit()
    except Exception:  # pragma: no cover
        db.rollback()
        logger.exception("No se pudo marcar la carga %s como fallida", carga_id)


def listar_cargas(db: Session, origen: Optional[str] = None, limite: int = 20) -> List[Dict[str, Any]]:
    q = select(DsldCargaModel).order_by(DsldCargaModel.id.desc()).limit(limite)
    if origen:
        q = q.where(DsldCargaModel.origen == origen)
    return [_carga_dict(c) for c in db.scalars(q)]


def ultima_carga_exitosa(db: Session, origen: str) -> Optional[Dict[str, Any]]:
    c = db.scalars(
        select(DsldCargaModel)
        .where(DsldCargaModel.origen == origen, DsldCargaModel.estado == "EXITOSA")
        .order_by(DsldCargaModel.id.desc()).limit(1)
    ).first()
    return _carga_dict(c) if c else None


def _carga_dict(c: DsldCargaModel) -> Dict[str, Any]:
    return {
        "id": c.id,
        "origen": c.origen,
        "archivo": c.archivo,
        "usuario": c.usuario,
        "estado": c.estado,
        "fechaInicio": c.fechaInicio.isoformat() if c.fechaInicio else None,
        "fechaFin": c.fechaFin.isoformat() if c.fechaFin else None,
        "registrosLeidos": c.registrosLeidos,
        "registrosCargados": c.registrosCargados,
        "registrosRechazados": c.registrosRechazados,
        "detalle": c.detalle,
    }


# ─── Consultas del tablero ───────────────────────────────────────────────────

def _ultima_sup_subq():
    return (
        select(
            DsldSupervisionModel.codigoDemuna.label("codigo"),
            func.max(DsldSupervisionModel.fechaSupervision).label("ultima"),
        )
        .group_by(DsldSupervisionModel.codigoDemuna)
        .subquery()
    )


def _filtros_geo(q, departamento: Optional[str], provincia: Optional[str]):
    if departamento and departamento.upper() not in ("TODOS", "TODAS"):
        q = q.where(DsldUbigeoModel.departamentoMod == departamento.upper())
    if provincia and provincia.upper() not in ("TODOS", "TODAS"):
        q = q.where(DsldUbigeoModel.provincia == provincia.upper())
    return q


def _pct(a: int, b: int) -> float:
    return round(a / b * 100, 1) if b else 0.0


def _corte_mismo_mes(fechas_por_anio: Dict[int, List[date]], anio_actual: int) -> Dict[str, Any]:
    """Comparativo al mismo corte: año actual hasta su último mes con datos vs. año anterior hasta ese mes."""
    actuales = fechas_por_anio.get(anio_actual, [])
    if not actuales:
        return {"anio": anio_actual, "mesCorte": None, "actual": 0, "anterior": 0, "variacionPct": None}
    mes = max(f.month for f in actuales)
    act = sum(1 for f in actuales if f.month <= mes)
    ant = sum(1 for f in fechas_por_anio.get(anio_actual - 1, []) if f.month <= mes)
    return {
        "anio": anio_actual,
        "mesCorte": mes,
        "actual": act,
        "anterior": ant,
        "variacionPct": round((act - ant) / ant * 100, 1) if ant else None,
    }


def resumen_demuna(db: Session, departamento: Optional[str] = None, provincia: Optional[str] = None) -> Dict[str, Any]:
    D, U = DsldDemunaModel, DsldUbigeoModel
    ult = _ultima_sup_subq()
    hoy = date.today()

    base = (
        select(
            func.count().label("total"),
            func.sum(case((D.estadoAcreditacion == "b", 1), else_=0)).label("acreditadas"),
            func.sum(case((D.estadoAcreditacion == "c", 1), else_=0)).label("no_acreditadas"),
            func.sum(case((D.estadoAcreditacion == "a", 1), else_=0)).label("no_operativas"),
            func.sum(case((D.modelo == "01", 1), else_=0)).label("provinciales"),
            func.sum(case((D.modelo == "02", 1), else_=0)).label("distritales"),
            func.sum(case((ult.c.ultima.isnot(None), 1), else_=0)).label("supervisadas"),
            func.sum(func.coalesce(DsldPoblacionModel.poblacionNna, 0)).label("poblacion_nna"),
        )
        .select_from(D)
        .join(U, U.ubigeo == D.ubigeo)
        .outerjoin(ult, ult.c.codigo == D.codigo)
        .outerjoin(DsldPoblacionModel, DsldPoblacionModel.ubigeo == D.ubigeo)
    )
    r = db.execute(_filtros_geo(base, departamento, provincia)).one()
    total = int(r.total or 0)
    acred, noacr, noop = int(r.acreditadas or 0), int(r.no_acreditadas or 0), int(r.no_operativas or 0)
    operativas = acred + noacr
    supervisadas = int(r.supervisadas or 0)

    # Acreditaciones por año (solo estado b) y comparativo al mismo corte
    fq = (
        select(D.fechaAcreditacion)
        .join(U, U.ubigeo == D.ubigeo)
        .where(D.estadoAcreditacion == "b", D.fechaAcreditacion.isnot(None))
    )
    fechas_acr: Dict[int, List[date]] = {}
    for (f,) in db.execute(_filtros_geo(fq, departamento, provincia)):
        fechas_acr.setdefault(f.year, []).append(f)
    ultima_acred = max((max(v) for v in fechas_acr.values()), default=None)

    # Supervisiones
    sq = (
        select(DsldSupervisionModel.fechaSupervision, DsldSupervisionModel.codigoDemuna,
               DsldSupervisionModel.tipoSupervision)
        .join(D, D.codigo == DsldSupervisionModel.codigoDemuna)
        .join(U, U.ubigeo == D.ubigeo)
    )
    fechas_sup: Dict[int, List[date]] = {}
    demunas_sup_anio: Dict[int, set] = {}
    modalidad_anio: Dict[int, Dict[str, int]] = {}
    for f, cod, tipo in db.execute(_filtros_geo(sq, departamento, provincia)):
        fechas_sup.setdefault(f.year, []).append(f)
        demunas_sup_anio.setdefault(f.year, set()).add(cod)
        mod = MODALIDAD_SUPERVISION.get(tipo, "SIN DATO")
        cont = modalidad_anio.setdefault(f.year, {"VIRTUAL": 0, "PRESENCIAL": 0, "SIN DATO": 0})
        cont[mod] += 1
    ultima_sup = max((max(v) for v in fechas_sup.values()), default=None)
    anio_ref = ultima_sup.year if ultima_sup else hoy.year
    anios_recientes = [a for a in sorted(fechas_sup) if a >= anio_ref - 2]

    # Periodo de la última supervisión por DEMUNA (Estado_Supervision_PERIODO)
    pq = (
        select(ult.c.ultima)
        .select_from(D)
        .join(U, U.ubigeo == D.ubigeo)
        .outerjoin(ult, ult.c.codigo == D.codigo)
    )
    periodo = {"SUPERVISADAS ESTE AÑO": 0, "SUPERVISADAS EL AÑO ANTERIOR": 0,
               "MÁS DE 1 AÑO SIN SUPERVISIÓN": 0, "SIN SUPERVISIÓN": 0}
    for (u,) in db.execute(_filtros_geo(pq, departamento, provincia)):
        if u is None:
            periodo["SIN SUPERVISIÓN"] += 1
        elif u.year == hoy.year:
            periodo["SUPERVISADAS ESTE AÑO"] += 1
        elif u.year == hoy.year - 1:
            periodo["SUPERVISADAS EL AÑO ANTERIOR"] += 1
        else:
            periodo["MÁS DE 1 AÑO SIN SUPERVISIÓN"] += 1

    carga = ultima_carga_exitosa(db, ORIGEN_ACCESS)
    return {
        "filtros": {"departamento": departamento or "TODOS", "provincia": provincia or "TODAS"},
        "kpis": {
            "totalMunicipalidades": total,
            "acreditadas": acred,
            "noAcreditadas": noacr,
            "noOperativas": noop,
            "operativas": operativas,
            "pctAcreditadas": _pct(acred, total),
            "pctNoAcreditadas": _pct(noacr, total),
            "pctNoOperativas": _pct(noop, total),
            "pctOperativas": _pct(operativas, total),
            "provinciales": int(r.provinciales or 0),
            "distritales": int(r.distritales or 0),
            "poblacionNna": int(r.poblacion_nna or 0),
        },
        "acreditacion": {
            "porAnio": {a: len(v) for a, v in sorted(fechas_acr.items())},
            "comparativoCorte": _corte_mismo_mes(fechas_acr, ultima_acred.year if ultima_acred else hoy.year),
            "ultimaFecha": ultima_acred.isoformat() if ultima_acred else None,
        },
        "supervision": {
            "demunasSupervisadas": supervisadas,
            "demunasNoSupervisadas": total - supervisadas,
            "pctCobertura": _pct(supervisadas, total),
            "porAnio": [
                {"anio": a, "supervisiones": len(fechas_sup[a]), "demunas": len(demunas_sup_anio[a]),
                 "virtual": modalidad_anio[a]["VIRTUAL"], "presencial": modalidad_anio[a]["PRESENCIAL"],
                 "sinModalidad": modalidad_anio[a]["SIN DATO"]}
                for a in anios_recientes
            ],
            "historico": {a: len(v) for a, v in sorted(fechas_sup.items())},
            "comparativoCorte": _corte_mismo_mes(fechas_sup, anio_ref),
            "periodoUltimaSupervision": periodo,
            "ultimaFecha": ultima_sup.isoformat() if ultima_sup else None,
        },
        "ultimaCarga": carga,
    }


def ranking_departamentos(db: Session) -> List[Dict[str, Any]]:
    D, U = DsldDemunaModel, DsldUbigeoModel
    ult = _ultima_sup_subq()
    q = (
        select(
            U.departamentoMod,
            U.ccddAnalitico,
            func.count().label("total"),
            func.sum(case((D.estadoAcreditacion == "b", 1), else_=0)).label("acreditadas"),
            func.sum(case((D.estadoAcreditacion == "c", 1), else_=0)).label("no_acreditadas"),
            func.sum(case((D.estadoAcreditacion == "a", 1), else_=0)).label("no_operativas"),
            func.sum(case((D.modelo == "01", 1), else_=0)).label("provinciales"),
            func.sum(case((ult.c.ultima.isnot(None), 1), else_=0)).label("supervisadas"),
        )
        .select_from(D)
        .join(U, U.ubigeo == D.ubigeo)
        .outerjoin(ult, ult.c.codigo == D.codigo)
        .group_by(U.departamentoMod, U.ccddAnalitico)
        .order_by(func.count().desc())
    )
    salida = []
    for r in db.execute(q):
        total = int(r.total)
        acr, noacr = int(r.acreditadas or 0), int(r.no_acreditadas or 0)
        salida.append({
            "departamento": r.departamentoMod,
            "ccddAnalitico": r.ccddAnalitico,
            "total": total,
            "acreditadas": acr,
            "noAcreditadas": noacr,
            "noOperativas": int(r.no_operativas or 0),
            "operativas": acr + noacr,
            "provinciales": int(r.provinciales or 0),
            "distritales": total - int(r.provinciales or 0),
            "supervisadas": int(r.supervisadas or 0),
            "pctAcreditacion": _pct(acr, total),
        })
    return salida


def supervisiones_por_departamento(db: Session, anios: List[int]) -> List[Dict[str, Any]]:
    D, U, S = DsldDemunaModel, DsldUbigeoModel, DsldSupervisionModel
    q = (
        select(U.departamentoMod, S.anio, func.count().label("n"))
        .select_from(S)
        .join(D, D.codigo == S.codigoDemuna)
        .join(U, U.ubigeo == D.ubigeo)
        .where(S.anio.in_(anios))
        .group_by(U.departamentoMod, S.anio)
    )
    datos: Dict[str, Dict[str, Any]] = {}
    for dep, anio, n in db.execute(q):
        fila = datos.setdefault(dep, {"departamento": dep})
        fila[str(anio)] = int(n)
    for fila in datos.values():
        for a in anios:
            fila.setdefault(str(a), 0)
    return sorted(datos.values(), key=lambda x: -sum(x[str(a)] for a in anios))


_ESTADO_ALIAS = {
    "ACREDITADA": "b", "ACREDITADAS": "b", "B": "b",
    "NO ACREDITADA": "c", "NO ACREDITADAS": "c", "C": "c",
    "NO OPERATIVA": "a", "NO OPERATIVAS": "a", "A": "a",
}


def listar_demunas(
    db: Session,
    departamento: Optional[str] = None,
    provincia: Optional[str] = None,
    estado: Optional[str] = None,
    tipo_gobierno: Optional[str] = None,
    busqueda: Optional[str] = None,
    limite: int = 100,
    desplazamiento: int = 0,
) -> Dict[str, Any]:
    D, U, M, E = DsldDemunaModel, DsldUbigeoModel, DsldCatModeloModel, DsldCatEstadoModel
    ult = _ultima_sup_subq()
    q = (
        select(D, U.departamentoMod, M.siglas, E.estado, ult.c.ultima, DsldPoblacionModel.poblacionNna)
        .join(U, U.ubigeo == D.ubigeo)
        .join(M, M.codigo == D.modelo)
        .join(E, E.codigo == D.estadoAcreditacion)
        .outerjoin(ult, ult.c.codigo == D.codigo)
        .outerjoin(DsldPoblacionModel, DsldPoblacionModel.ubigeo == D.ubigeo)
    )
    q = _filtros_geo(q, departamento, provincia)
    if estado and estado.upper() not in ("TODOS", "TODAS"):
        cod = _ESTADO_ALIAS.get(estado.strip().upper())
        if cod == "b" or cod == "c" or cod == "a":
            q = q.where(D.estadoAcreditacion == cod)
        elif estado.strip().upper() in ("OPERATIVA", "OPERATIVAS"):
            q = q.where(D.estadoAcreditacion.in_(["b", "c"]))
    if tipo_gobierno and tipo_gobierno.upper() not in ("TODOS", "TODAS"):
        q = q.where(D.modelo == ("01" if tipo_gobierno.upper().startswith("PROV") else "02"))
    if busqueda:
        t = f"%{busqueda.strip().upper()}%"
        q = q.where(or_(
            func.upper(D.nombre).like(t), D.distrito.like(t), D.provincia.like(t),
            D.codigo.like(t), D.ubigeo.like(t),
        ))

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    filas = db.execute(
        q.order_by(U.departamentoMod, D.provincia, D.distrito).offset(desplazamiento).limit(limite)
    ).all()
    return {
        "total": int(total or 0),
        "items": [
            {
                "codigo": d.codigo,
                "nombre": d.nombre,
                "nombreCorto": d.nombreCorto,
                "ubigeo": d.ubigeo,
                "departamento": d.departamento,
                "departamentoMod": dep_mod,
                "provincia": d.provincia,
                "distrito": d.distrito,
                "tipoGobierno": siglas,
                "estadoCodigo": d.estadoAcreditacion,
                "estado": est,
                "fechaAcreditacion": d.fechaAcreditacion.isoformat() if d.fechaAcreditacion else None,
                "resolucionAcreditacion": d.resolucionAcreditacion,
                "direccion": d.direccion,
                "telefono": d.telefono1,
                "telefono2": d.telefono2,
                "email": d.email,
                "horario": d.horario,
                "poblacionNna": pob,
                "ultimaSupervision": u.isoformat() if u else None,
                "estadoSupervision": "SUPERVISADA" if u else "NO SUPERVISADA",
            }
            for d, dep_mod, siglas, est, u, pob in filas
        ],
    }


def catalogo_geografico(db: Session) -> Dict[str, Any]:
    U, D = DsldUbigeoModel, DsldDemunaModel
    filas = db.execute(
        select(U.departamentoMod, U.provincia)
        .join(D, D.ubigeo == U.ubigeo)
        .distinct()
        .order_by(U.departamentoMod, U.provincia)
    ).all()
    deps: Dict[str, List[str]] = {}
    for dep, prov in filas:
        deps.setdefault(dep, [])
        if prov and prov not in deps[dep]:
            deps[dep].append(prov)
    return {"departamentos": [{"departamento": k, "provincias": v} for k, v in deps.items()]}
