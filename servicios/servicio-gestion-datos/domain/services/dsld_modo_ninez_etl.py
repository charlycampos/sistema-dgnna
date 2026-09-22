"""
ETL DSLD · Ponte en Modo Niñez desde "MATRIZ DE REPORTE PBI 2026.xlsx"

Reglas del Power BI DSLD_GENERAL_V3 (ver docs/ANALISIS_POWERBI_DSLD.md, §3.8):
  - Fuente: tabla de Excel TB_MODO_NINEZ_2026 (una fila por gobierno).
  - TIPO DE GOBIERNO separa Regional / Provincial / Distrital
    (Regional se une por CCDD y Provincial por UBIGEO_PROV = 4 primeros dígitos;
    el UBIGEO de una provincial es el de su distrito capital).
  - Adheridos ("Acumulado_*"): filas con MODO_NIÑEZ = "SI".
  - Presentaron reporte ("Registro_presentacion_*"): filas con FECHA DE PRESENTACIÓN.

Datos personales: SR/SRA y ALCALDE/SA NO se leen ni se guardan (ver COLUMNAS_EXCLUIDAS).
Tampoco se leen las columnas que el tablero no usa (años de reconocimiento, acta digitalizada).

Módulo puro: recibe un DataFrame y devuelve registros listos para persistir.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import pandas as pd

TABLA_EXCEL = "TB_MODO_NINEZ_2026"

COL_NUMERO = "Nº"
COL_UBIGEO = "UBIGEO"
COL_GOBIERNO = "NOMBRE DE GOBIERNO"
COL_TIPO = "TIPO DE GOBIERNO"
COL_MACRO = "MACROREGIÓN"
COL_DEP = "DEPARTAMENTO"
COL_PROV = "PROVINCIA"
COL_DIST = "DISTRITO"
COL_MODO = "MODO_NIÑEZ"
COL_ANIO = "AÑO QUE SE SUMÓ A LA ESTRATEGIA"
COL_PRESENTACION = "FECHA DE PRESENTACIÓN"
COL_ACTA = "FECHA DE ACTA DE COMPROMISO"
COL_COD_DEMUNA = "CÓDIGO DE DEMUNA"
COL_ESTADO = "ESTADO"

# Únicas columnas que se leen del Excel
COLUMNAS_USADAS = [
    COL_NUMERO, COL_UBIGEO, COL_GOBIERNO, COL_TIPO, COL_MACRO, COL_DEP, COL_PROV, COL_DIST,
    COL_MODO, COL_ANIO, COL_PRESENTACION, COL_ACTA, COL_COD_DEMUNA, COL_ESTADO,
]
COLUMNAS_REQUERIDAS = [COL_UBIGEO, COL_GOBIERNO, COL_TIPO, COL_MODO]
# Datos personales presentes en el Excel que nunca se cargan
COLUMNAS_EXCLUIDAS = ["SR/SRA", "ALCALDE/SA"]

NIVELES = {"REGIONAL": "REGIONAL", "PROVINCIAL": "PROVINCIAL", "DISTRITAL": "DISTRITAL"}
ESTADOS_DEMUNA = {"ACREDITADA", "NO ACREDITADA", "NO OPERATIVA"}
MAX_ERRORES_MENSAJE = 15


class EtlModoNinezError(Exception):
    """El archivo no cumple las condiciones mínimas; no se carga nada."""


@dataclass
class ResultadoModoNinez:
    gobiernos: List[Dict[str, Any]] = field(default_factory=list)
    leidos: int = 0
    descartados: int = 0
    advertencias: List[str] = field(default_factory=list)

    def resumen(self) -> Dict[str, Any]:
        adheridos = [g for g in self.gobiernos if g["adherido"] == "S"]
        por_nivel = {n: sum(1 for g in adheridos if g["nivel_gobierno"] == n) for n in NIVELES.values()}
        presentaron = {n: sum(1 for g in adheridos if g["nivel_gobierno"] == n and g["fecha_presentacion"])
                       for n in NIVELES.values()}
        anios = pd.Series([g["anio_adhesion"] for g in adheridos if g["anio_adhesion"]]).value_counts().sort_index()
        return {
            "gobiernos": len(self.gobiernos),
            "adheridos": len(adheridos),
            "regionales": por_nivel["REGIONAL"],
            "provinciales": por_nivel["PROVINCIAL"],
            "distritales": por_nivel["DISTRITAL"],
            "presentaronReporte": sum(presentaron.values()),
            "presentaronPorNivel": presentaron,
            "adheridosPorAnio": {int(k): int(v) for k, v in anios.items()},
            "leidos": self.leidos,
            "descartados": self.descartados,
            "advertencias": self.advertencias,
        }


# ─── Utilidades ──────────────────────────────────────────────────────────────

def _vacio(v: Any) -> bool:
    if v is None or (isinstance(v, str) and not v.strip()):
        return True
    try:
        return bool(pd.isna(v))  # NaN, NaT y pd.NA
    except (TypeError, ValueError):
        return False


def _txt(v: Any, max_len: Optional[int] = None) -> Optional[str]:
    if _vacio(v):
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s[:max_len] if max_len else s


def _sin_tildes(s: str) -> str:
    """Quita tildes pero conserva la Ñ (igual que el catálogo de ubigeo del DNA.mdb)."""
    s = s.replace("Ñ", "\0")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return s.replace("\0", "Ñ")


def _nombre_geo(v: Any) -> Optional[str]:
    s = _txt(v, 100)
    return _sin_tildes(s.upper()) if s else None


def _ubigeo(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    s = s.split(".")[0]
    return s.zfill(6) if s.isdigit() else s


def _anio(v: Any) -> Optional[int]:
    s = _txt(v)
    if not s:
        return None
    try:
        n = int(float(s))
    except ValueError:
        return None
    return n if 2000 <= n <= 2100 else None


def _fecha(v: Any) -> Optional[date]:
    """Acepta fechas de Excel, números de serie y texto dd/mm/aaaa. Devuelve None si no es válida."""
    if _vacio(v):
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if 20000 < float(v) < 80000:  # número de serie de Excel (1954-2119)
            return (pd.Timestamp("1899-12-30") + pd.Timedelta(days=int(v))).date()
        return None
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _codigo_demuna(v: Any) -> Optional[str]:
    """Código de 5 dígitos del padrón (Excel lo guarda a veces como número y pierde el cero inicial)."""
    s = _txt(v, 10)
    if not s:
        return None
    s = s.split(".")[0]
    return s.zfill(5) if s.isdigit() else s


def _estado_demuna(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    s = _sin_tildes(s.upper())
    return s if s in ESTADOS_DEMUNA else None


def departamento_analitico(ubigeo: str, departamento: Optional[str]) -> Optional[str]:
    """Misma regla que el padrón DEMUNA: Lima se divide en LIMA METROPOLITANA y GORE LIMA."""
    if ubigeo.startswith("15"):
        return "LIMA METROPOLITANA" if ubigeo[2:4] == "01" else "GORE LIMA"
    return departamento


# ─── Transformación ──────────────────────────────────────────────────────────

def transformar_modo_ninez(
    df: pd.DataFrame,
    catalogo_ubigeo: Optional[Dict[str, Dict[str, Optional[str]]]] = None,
) -> ResultadoModoNinez:
    """
    `catalogo_ubigeo` (opcional): {ubigeo: {"departamento": ..., "provincia": ..., "distrito": ...}}
    tomado de DSLD_UBIGEO para que los filtros coincidan con el padrón DEMUNA.
    Si falta un ubigeo, se usan los nombres del Excel (en mayúsculas y sin tildes).
    """
    faltan = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
    if faltan:
        raise EtlModoNinezError(f"La tabla {TABLA_EXCEL} no tiene las columnas: {', '.join(faltan)}.")

    catalogo = catalogo_ubigeo or {}
    res = ResultadoModoNinez(leidos=len(df))
    errores: List[str] = []
    vistos: Dict[str, int] = {}
    sin_catalogo = 0
    actas_invalidas: List[str] = []

    def col(fila, nombre):
        return fila.get(nombre) if nombre in df.columns else None

    for pos, fila in enumerate(df.to_dict("records"), start=2):  # fila 1 = encabezados
        ubigeo = _ubigeo(fila.get(COL_UBIGEO))
        nombre = _txt(fila.get(COL_GOBIERNO), 200)
        tipo = _txt(fila.get(COL_TIPO))
        nivel = NIVELES.get(_sin_tildes(tipo.upper())) if tipo else None
        modo = _txt(fila.get(COL_MODO))
        modo = _sin_tildes(modo.upper()) if modo else None

        if not ubigeo and not nombre and not tipo:
            res.descartados += 1
            continue
        if not ubigeo or len(ubigeo) != 6 or not ubigeo.isdigit():
            errores.append(f"fila {pos}: UBIGEO '{fila.get(COL_UBIGEO)}' no tiene 6 dígitos")
            continue
        if not nivel:
            errores.append(f"fila {pos}: TIPO DE GOBIERNO '{tipo}' no es Regional/Provincial/Distrital")
            continue
        if modo not in ("SI", "NO"):
            errores.append(f"fila {pos}: MODO_NIÑEZ '{fila.get(COL_MODO)}' debe ser SI o NO")
            continue
        if not nombre:
            errores.append(f"fila {pos}: falta NOMBRE DE GOBIERNO")
            continue
        if ubigeo in vistos:
            errores.append(f"fila {pos}: UBIGEO {ubigeo} repetido (ya está en la fila {vistos[ubigeo]})")
            continue
        vistos[ubigeo] = pos

        acta_original = col(fila, COL_ACTA)
        fecha_acta = _fecha(acta_original)
        if fecha_acta is None and not _vacio(acta_original):
            actas_invalidas.append(f"fila {pos} ('{acta_original}')")

        # Regional se identifica por CCDD y Provincial por UBIGEO_PROV (el Excel usa el
        # ubigeo del distrito capital, p. ej. 010201 para la provincia 0102).
        clave_geo = (ubigeo[:2] + "0000" if nivel == "REGIONAL"
                     else ubigeo[:4] + "00" if nivel == "PROVINCIAL" else ubigeo)
        geo = catalogo.get(clave_geo)
        if geo:
            departamento, provincia, distrito = geo.get("departamento"), geo.get("provincia"), geo.get("distrito")
        else:
            if catalogo:
                sin_catalogo += 1
            departamento = _nombre_geo(col(fila, COL_DEP))
            provincia = _nombre_geo(col(fila, COL_PROV)) if nivel != "REGIONAL" else None
            distrito = _nombre_geo(col(fila, COL_DIST)) if nivel == "DISTRITAL" else None

        fecha_pres = _fecha(col(fila, COL_PRESENTACION))
        res.gobiernos.append({
            "ubigeo": ubigeo,
            "nivel_gobierno": nivel,
            "nombre_gobierno": nombre,
            "macroregion": _txt(col(fila, COL_MACRO), 50),
            "ccdd": ubigeo[:2],
            "ubigeo_prov": None if nivel == "REGIONAL" else ubigeo[:4],
            "departamento": departamento,
            "provincia": provincia,
            "distrito": distrito,
            "departamento_mod": departamento_analitico(ubigeo, departamento),
            "adherido": "S" if modo == "SI" else "N",
            "anio_adhesion": _anio(col(fila, COL_ANIO)),
            "fecha_presentacion": fecha_pres,
            "anio_presentacion": fecha_pres.year if fecha_pres else None,
            "fecha_acta": fecha_acta,
            "codigo_demuna": _codigo_demuna(col(fila, COL_COD_DEMUNA)),
            "estado_demuna": _estado_demuna(col(fila, COL_ESTADO)),
            "numero_orden": _entero_simple(col(fila, COL_NUMERO)),
        })

    if errores:
        extra = f" (y {len(errores) - MAX_ERRORES_MENSAJE} más)" if len(errores) > MAX_ERRORES_MENSAJE else ""
        raise EtlModoNinezError(
            f"No se cargó nada: {len(errores)} fila(s) con errores en {TABLA_EXCEL}. "
            + "; ".join(errores[:MAX_ERRORES_MENSAJE]) + extra + "."
        )
    if not res.gobiernos:
        raise EtlModoNinezError(f"La tabla {TABLA_EXCEL} no tiene gobiernos para cargar.")

    if actas_invalidas:
        res.advertencias.append(
            "FECHA DE ACTA DE COMPROMISO no válida, se guardó vacía en: " + ", ".join(actas_invalidas[:10])
        )
    if sin_catalogo:
        res.advertencias.append(
            f"{sin_catalogo} ubigeo(s) no están en el catálogo del DNA.mdb; se usaron los nombres del Excel."
        )
    sin_anio = sum(1 for g in res.gobiernos if g["adherido"] == "S" and not g["anio_adhesion"])
    if sin_anio:
        res.advertencias.append(f"{sin_anio} gobierno(s) adheridos sin AÑO QUE SE SUMÓ A LA ESTRATEGIA.")
    return res


def _entero_simple(v: Any) -> Optional[int]:
    s = _txt(v)
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None
