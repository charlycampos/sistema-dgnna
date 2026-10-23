"""
Indicadores priorizados PP0117 para CAR (seguimiento mensual DGNNA).

- 4397: % NNA en acogimiento residencial que fortalecen sus capacidades
        personales y sociales (5 indicadores complementarios).
- 4398: % adolescentes que adquieren competencias para su vida independiente
        (4 indicadores complementarios).

Reglas acordadas con el especialista de seguimiento (reunión 05-oct-2026):
- Universo 4397: NNA ACTIVOS de 6 a 17 años.
  · PTI: denominador = NNA ACTIVOS hasta 18 años (incluye a quienes cumplen 18).
- Universo 4398: adolescentes ACTIVOS de 14 a 18 años con más de 6 meses de
  permanencia (rango 6 / Rango2 = "R2 -> 6 meses").
- PVI oportuno: si ingresó en el año del corte, aprobación <= 90 días desde el
  ingreso; si ingresó en años anteriores, aprobación hasta el 31 de marzo del
  año del corte. (Reproduce la columna manual "plazo" del archivo de junio.)

Los meses Junio–Agosto 2026 se toman del reporte oficial (no hay base cargada
para julio/agosto); desde el siguiente corte cargado el valor se calcula.
"""

import json
import re
from datetime import date, datetime
from typing import Callable, Dict, List, Optional

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from infrastructure.db.models import CarCargaModel, CarCargaFilaRawModel, CarNnaCorteModel

# ── Parámetros ─────────────────────────────────────────────────────────────
DIAS_PLAZO_PVI = 90
MESES_MOSTRADOS = 4
# Semáforo del último mes vs. el mes anterior (puntos porcentuales).
UMBRAL_ESTABLE_PP = 1.0

TIPOS = ("BASICO", "ESPECIALIZADO")
BASE_DATOS = {
    "BASICO": "RENE CAR BÁSICO – INABIF",
    "ESPECIALIZADO": "RENE CAR ESPECIALIZADO – INABIF",
}
MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
         "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

INDICADORES_4397 = [
    ("psicologico", "% de NNA con evaluación del taller psicológico en “En proceso” o “Logrado”"),
    ("promovidos", "% de NNA promovidos a nivel educativo en comparación al año anterior"),
    ("actividadSocial", "% de NNA que participan en al menos una actividad social"),
    ("estrategia", "% de NNA que consigna fecha de aprobación de estrategia"),
    ("pti", "% de NNA en CAR que cuenta con PTI"),
]
INDICADORES_4398 = [
    ("matriculados", "% de adolescentes que se encuentran matriculados en alguna institución educativa"),
    ("promovidosAdol", "% de adolescentes promovidos a nivel educativo en comparación al año anterior"),
    ("pviOportuno", "% de adolescentes que cuentan con Plan de Vida Independiente aprobado en el primer trimestre o máximo 3 meses de su ingreso al CAR"),
    ("metas60", "% de adolescentes que cumplen al menos 60% de metas establecidas en el Plan de Vida Independiente"),
]

# Reporte de seguimiento mensual (Agosto 2026) — valores oficiales (num, den).
HISTORICO_OFICIAL = {
    "2026-06": {
        "BASICO": {"psicologico": (626, 944), "promovidos": (581, 944), "actividadSocial": (308, 944),
                   "estrategia": (336, 944), "pti": (288, 1024), "matriculados": (114, 429),
                   "promovidosAdol": (270, 429), "pviOportuno": (90, 429), "metas60": (13, 429)},
        "ESPECIALIZADO": {"psicologico": (106, 154), "promovidos": (50, 154), "actividadSocial": (28, 154),
                          "estrategia": (34, 154), "pti": (28, 205), "matriculados": (23, 81),
                          "promovidosAdol": (24, 81), "pviOportuno": (10, 81), "metas60": (5, 81)},
    },
    "2026-07": {
        "BASICO": {"psicologico": (622, 931), "promovidos": (584, 931), "actividadSocial": (500, 931),
                   "estrategia": (428, 931), "pti": (474, 1025), "matriculados": (275, 387),
                   "promovidosAdol": (252, 387), "pviOportuno": (168, 387), "metas60": (25, 387)},
        "ESPECIALIZADO": {"psicologico": (79, 123), "promovidos": (60, 123), "actividadSocial": (32, 123),
                          "estrategia": (34, 123), "pti": (28, 207), "matriculados": (73, 78),
                          "promovidosAdol": (41, 78), "pviOportuno": (21, 78), "metas60": (7, 78)},
    },
    "2026-08": {
        "BASICO": {"psicologico": (590, 937), "promovidos": (556, 937), "actividadSocial": (363, 937),
                   "estrategia": (405, 937), "pti": (364, 1087), "matriculados": (152, 388),
                   "promovidosAdol": (245, 388), "pviOportuno": (56, 388), "metas60": (35, 388)},
        "ESPECIALIZADO": {"psicologico": (121, 158), "promovidos": (68, 158), "actividadSocial": (41, 158),
                          "estrategia": (60, 158), "pti": (50, 207), "matriculados": (63, 78),
                          "promovidosAdol": (32, 78), "pviOportuno": (10, 78), "metas60": (7, 78)},
    },
}


# ── Normalización de valores ───────────────────────────────────────────────
def _vacio(val) -> bool:
    if val is None:
        return True
    try:
        if pd.isna(val):
            return True
    except (TypeError, ValueError):
        pass
    return str(val).strip() in ("", "-", "nan", "NaN", "NaT", "None")


def _texto(val, max_len: int) -> Optional[str]:
    if _vacio(val):
        return None
    return str(val).strip()[:max_len]


def _si(val) -> bool:
    return not _vacio(val) and str(val).strip().upper() in ("SI", "SÍ", "S", "1")


def fecha_flexible(val) -> Optional[date]:
    """Fechas del RENE: datetime de Excel, 'dd/mm/aaaa' o ISO 'aaaa-mm-dd'."""
    if _vacio(val):
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})", s)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    dt = pd.to_datetime(s, dayfirst=True, errors="coerce")
    return None if pd.isna(dt) else dt.date()


def _entero(val) -> Optional[int]:
    if _vacio(val):
        return None
    try:
        return int(round(float(str(val).replace("%", "").replace(",", ".").strip())))
    except ValueError:
        return None


def extraer_variables_indicadores(get: Callable[..., object]) -> Dict[str, object]:
    """`get(*candidatos)` devuelve el primer valor no vacío de esas columnas."""
    return {
        "resEvaTem": _texto(get("RES_EVA_TEM"), 50),
        "nnaProm": _texto(get("NNA_PROM"), 20),
        "nnaEst": _texto(get("NNA_EST"), 20),
        "tipActSoc1": _texto(get("TIP_ACT_SOC_1"), 100),
        "tipActSoc2": _texto(get("TIP_ACT_SOC_2"), 100),
        "fecAprEst": fecha_flexible(get("FEC_APR_EST")),
        "ptiConsensuado": _texto(get("PTI_CONSENSUADO2", "PTI_CONSENSUADO"), 20),
        "planVidaInd": _texto(get("PLAN_VIDA_IND"), 20),
        "fecVidInd": fecha_flexible(get("FEC_VID_IND")),
        "porCumMet": _entero(get("POR_CUM_MET")),
        "rango6Meses": _texto(get("rango 6", "Rango2", "RANGO_6", "RANGO 6"), 50),
    }


def _normalizar(nombre) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]+", "_", t.upper()).strip("_")


# ── Relleno de cortes ya cargados desde la capa RAW ─────────────────────────
def rellenar_desde_raw(db: Session, carga_id: Optional[int] = None) -> dict:
    """Completa las variables nuevas en cortes cargados antes de esta versión."""
    cargas = db.query(CarCargaModel).filter(CarCargaModel.tipoCar.in_(("BASICO", "ESPECIALIZADO", "URGENCIA")))
    if carga_id:
        cargas = cargas.filter(CarCargaModel.id == carga_id)
    resumen = []
    for carga in cargas.all():
        cortes = (db.query(CarNnaCorteModel)
                  .filter(CarNnaCorteModel.cargaId == carga.id)
                  .order_by(CarNnaCorteModel.id).all())
        raws = (db.query(CarCargaFilaRawModel)
                .filter(CarCargaFilaRawModel.cargaId == carga.id)
                .order_by(CarCargaFilaRawModel.filaIndex).all())
        actualizados = 0
        # Las filas RAW y los cortes se insertan en el mismo orden durante la importación.
        for corte, raw in zip(cortes, raws):
            if corte.codUsu and raw.codUsu and corte.codUsu != raw.codUsu:
                continue
            fila = json.loads(raw.rawJson or "{}")
            norm = {_normalizar(k): v for k, v in fila.items()}

            def get(*cands):
                for c in cands:
                    v = fila.get(c)
                    if _vacio(v):
                        v = norm.get(_normalizar(c))
                    if not _vacio(v):
                        return v
                return None

            for attr, valor in extraer_variables_indicadores(get).items():
                setattr(corte, attr, valor)
            actualizados += 1
        db.commit()
        resumen.append({"cargaId": carga.id, "tipoCar": carga.tipoCar,
                        "periodoCorte": carga.periodoCorte, "actualizados": actualizados})
    return {"cargas": resumen}


# ── Cálculo ────────────────────────────────────────────────────────────────
def _pvi_oportuno(fec_ing: Optional[date], fec_pvi: Optional[date], anio_corte: int) -> bool:
    if not fec_ing or not fec_pvi:
        return False
    if fec_ing.year >= anio_corte:
        return (fec_pvi - fec_ing).days <= DIAS_PLAZO_PVI
    return fec_pvi <= date(anio_corte, 3, 31)


def _calcular_corte(filas: list, anio_corte: int) -> Dict[str, tuple]:
    activos = [f for f in filas if (_texto(f.estadoActual, 100) or "").upper() == "ACTIVO" and f.edad is not None]
    u617 = [f for f in activos if 6 <= f.edad <= 17]
    hasta18 = [f for f in activos if f.edad <= 18]
    adol = [f for f in activos if 14 <= f.edad <= 18
            and (f.rango6Meses or "").strip().upper().startswith("R2")]
    n617, nad = len(u617), len(adol)
    return {
        "psicologico": (sum((f.resEvaTem or "").strip().upper() in ("EN PROCESO", "LOGRADO") for f in u617), n617),
        "promovidos": (sum(_si(f.nnaProm) for f in u617), n617),
        "actividadSocial": (sum(not _vacio(f.tipActSoc1) or not _vacio(f.tipActSoc2) for f in u617), n617),
        "estrategia": (sum(f.fecAprEst is not None for f in u617), n617),
        "pti": (sum(_si(f.ptiConsensuado) for f in hasta18), len(hasta18)),
        "matriculados": (sum(_si(f.nnaEst) for f in adol), nad),
        "promovidosAdol": (sum(_si(f.nnaProm) for f in adol), nad),
        "pviOportuno": (sum(_pvi_oportuno(f.fechaIngreso, f.fecVidInd, anio_corte) for f in adol), nad),
        "metas60": (sum((f.porCumMet or 0) >= 60 for f in adol), nad),
    }


def _celda(num: int, den: int, fuente: str) -> dict:
    return {"num": num, "den": den, "valor": round(num / den * 100, 1) if den else None, "fuente": fuente}


def _semaforo(actual: Optional[float], anterior: Optional[float]) -> Optional[str]:
    if actual is None or anterior is None:
        return None
    delta = actual - anterior
    if delta > UMBRAL_ESTABLE_PP:
        return "VERDE"
    if delta < -UMBRAL_ESTABLE_PP:
        return "ROJO"
    return "AMBAR"


def _etiqueta(periodo: str) -> str:
    m = re.match(r"^(\d{4})-(\d{2})", periodo)
    return f"{MESES[int(m.group(2)) - 1]} {m.group(1)}" if m else periodo


def calcular_indicadores_priorizados(db: Session) -> dict:
    # Última carga por (periodo, tipo) para no duplicar si un mes se recargó.
    ultimas = (db.query(CarCargaModel.periodoCorte, CarCargaModel.tipoCar, func.max(CarCargaModel.id))
               .filter(CarCargaModel.tipoCar.in_(TIPOS), CarCargaModel.estado == "EXITOSA")
               .group_by(CarCargaModel.periodoCorte, CarCargaModel.tipoCar).all())

    datos: Dict[str, Dict[str, Dict[str, dict]]] = {}
    for periodo, tipos in HISTORICO_OFICIAL.items():
        for tipo, inds in tipos.items():
            datos.setdefault(periodo, {})[tipo] = {k: _celda(n, d, "OFICIAL") for k, (n, d) in inds.items()}

    for periodo, tipo, carga_id in ultimas:
        if periodo in HISTORICO_OFICIAL:
            continue  # el reporte oficial prevalece para Jun–Ago 2026
        filas = (db.query(CarNnaCorteModel.estadoActual, CarNnaCorteModel.edad,
                          CarNnaCorteModel.resEvaTem, CarNnaCorteModel.nnaProm, CarNnaCorteModel.nnaEst,
                          CarNnaCorteModel.tipActSoc1, CarNnaCorteModel.tipActSoc2,
                          CarNnaCorteModel.fecAprEst, CarNnaCorteModel.ptiConsensuado,
                          CarNnaCorteModel.fechaIngreso, CarNnaCorteModel.fecVidInd,
                          CarNnaCorteModel.porCumMet, CarNnaCorteModel.rango6Meses)
                 .filter(CarNnaCorteModel.cargaId == carga_id).all())
        anio = int(periodo[:4]) if re.match(r"^\d{4}", periodo or "") else date.today().year
        datos.setdefault(periodo, {})[tipo] = {
            k: _celda(n, d, "CALCULADO") for k, (n, d) in _calcular_corte(filas, anio).items()}

    periodos = sorted(datos.keys())[-MESES_MOSTRADOS:]

    def cuadro(codigo: str, titulo: str, nota: str, indicadores: List[tuple]) -> dict:
        grupos = []
        for tipo in TIPOS:
            filas = []
            for clave, nombre in indicadores:
                valores = {p: datos.get(p, {}).get(tipo, {}).get(clave) for p in periodos}
                serie = [valores[p]["valor"] if valores[p] else None for p in periodos]
                filas.append({
                    "clave": clave, "nombre": nombre, "valores": valores,
                    "semaforo": _semaforo(serie[-1], serie[-2]) if len(serie) >= 2 else None,
                })
            grupos.append({"tipoCar": tipo, "baseDatos": BASE_DATOS[tipo], "indicadores": filas})
        return {"codigo": codigo, "titulo": titulo, "nota": nota, "grupos": grupos}

    return {
        "periodos": [{
            "periodo": p, "etiqueta": _etiqueta(p),
            "fuente": "OFICIAL" if p in HISTORICO_OFICIAL else "CALCULADO",
        } for p in periodos],
        "cuadros": [
            cuadro("4397", "Porcentaje de NNA en acogimiento residencial que fortalecen sus capacidades personales y sociales",
                   "Se considera a NNA activos de 6 a 17 años. PTI: NNA activos hasta 18 años.", INDICADORES_4397),
            cuadro("4398", "Porcentaje de adolescentes en acogimiento residencial que adquieren competencias con alternativas para su vida independiente",
                   "Denominador: adolescentes activos de 14 a 18 años con más de 6 meses de permanencia.", INDICADORES_4398),
        ],
        "criterios": {
            "semaforo": f"Variación del último mes frente al anterior: sube más de {UMBRAL_ESTABLE_PP:g} p.p. = verde; "
                        f"baja más de {UMBRAL_ESTABLE_PP:g} p.p. = rojo; en otro caso = ámbar.",
            "fuenteOficial": "Junio–Agosto 2026: Reporte de seguimiento mensual a indicadores priorizados PP0117.",
            "diasPlazoPvi": DIAS_PLAZO_PVI,
        },
    }
