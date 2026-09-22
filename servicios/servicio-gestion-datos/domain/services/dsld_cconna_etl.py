"""
ETL DSLD · CCONNA (Consejos Consultivos de Niñas, Niños y Adolescentes) desde
"CCONNA nominal <mes><año>.xlsx".

Reglas del Power BI DSLD_GENERAL_V3:
  - Tabla CCONNA: hoja "BD ORGANIZACIONAL" (tabla de Excel Tabla1), una fila por CCONNA.
    Se separa por "Tipo de CCONNA " en Distrital / Provincial / Regional.
      · Distritos conformados  = distintos Ubigeo de los distritales
      · Provincias conformadas = distintos UBIGEO_PROV (4 primeros dígitos) de los provinciales
      · Departamentos          = distintos CCDD (2 primeros dígitos) de los regionales
        (CCDD 26 = GORE Lima, igual que en el padrón DEMUNA)
  - Tabla TB_CCONNA_NIÑOS: hoja "BD NOMINAL" (tabla de Excel Tabla5), una fila por NNA,
    excluyendo a quienes figuran como "Ex CCONNA" en la participación distrital.

Datos personales: de la hoja nominal NO se leen nombres, apellidos, documento, fecha de
nacimiento, edad, celular, lengua materna, discapacidad, grado de estudio, institución
educativa ni datos del adulto acompañante. Los integrantes se guardan **agregados**
(cuántas niñas y cuántos niños por ubigeo y nivel), nunca fila por fila.
De la hoja organizacional tampoco se leen el nombre, teléfono ni correo del especialista.

Módulo puro: recibe DataFrames y devuelve registros listos para persistir.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

TABLA_ORGANIZACIONES = "Tabla1"      # hoja "BD ORGANIZACIONAL"
TABLA_INTEGRANTES = "Tabla5"         # hoja "BD NOMINAL"

# ─ Organizaciones (Tabla1)
COL_NUMERO = "N°"
COL_UBIGEO = "Ubigeo"
COL_DEP = "Departamento"
COL_PROV = "Provincia"
COL_DIST = "Distrito"
COL_TIPO = "Tipo de CCONNA"
COL_NOMBRE = "Nombre del CCONNA"
COL_ORDENANZA = "Nº Ordenanza (O)"
COL_FECHA_ORDENANZA = "Fecha de la Ordenanza"
COL_RESOLUCION = "Nº Resolución"
COL_FECHA_RESOLUCION = "Fecha de  la Resolución"
COL_FECHA_ACTA = "Fecha del Acta de Conformación"
COL_FECHA_PLAN = "Fecha del Plan de Trabajo"
COL_BASE_NOMINAL = "Base NOMINAL"
COL_REGISTRO = "REGISTRO MIMP NO/SI/OBSERVADO"
COL_OFICIO = "NUMERO DE OFICIO DSLD"
COL_FECHA_REGISTRO = "FECHA  REGISTRO"

COLUMNAS_ORGANIZACIONES = [COL_NUMERO, COL_UBIGEO, COL_DEP, COL_PROV, COL_DIST, COL_TIPO, COL_NOMBRE,
                           COL_ORDENANZA, COL_FECHA_ORDENANZA, COL_RESOLUCION, COL_FECHA_RESOLUCION,
                           COL_FECHA_ACTA, COL_FECHA_PLAN, COL_BASE_NOMINAL, COL_REGISTRO, COL_OFICIO,
                           COL_FECHA_REGISTRO]
REQUERIDAS_ORGANIZACIONES = [COL_UBIGEO, COL_TIPO, COL_NOMBRE]

# ─ Integrantes (Tabla5)
COL_SEXO = "SEXO"
COL_UB_DISTRITAL = "UBIGEO DISTRITAL"
COL_UB_PROVINCIAL = "UBIGEO PROVINCIAL"
COL_UB_REGIONAL = "UBIGEO REGIONAL"
COL_P_DISTRITAL = "CCONNA DISTRITAL (participación)"
COL_P_PROVINCIAL = "CCONNA PROVINCIAL (participación)"
COL_P_REGIONAL = "CCONNA REGIONAL (participación)"
COL_P_NACIONAL = "CCONNA NACIONAL (participación)"
COL_DEP_NNA = "DEPARTAMENTO"

COLUMNAS_INTEGRANTES = [COL_SEXO, COL_DEP_NNA, COL_UB_DISTRITAL, COL_UB_PROVINCIAL, COL_UB_REGIONAL,
                        COL_P_DISTRITAL, COL_P_PROVINCIAL, COL_P_REGIONAL, COL_P_NACIONAL]
REQUERIDAS_INTEGRANTES = [COL_SEXO, COL_P_DISTRITAL]

COLUMNAS_EXCLUIDAS = [
    "NOMBRES DEL NNA", "APELLIDOS DEL NNA", "FECHA DE NACIMIENTO", "EDAD", "DOCUMENTO DE IDENTIDAD",
    "NÚMERO DE DOCUMENTO", "CELULAR NNA", "LENGUA MATERNA", "DISCAPACIDAD", "GRADO DE ESTUDIO",
    "NOMBRE DE LA INSTITUCIÓN EDUCATIVA", "NOMBRE del ADULTO ACOMPAÑANTE", "APELLIDOS del ADULTO ACOMPAÑANTE",
    "DNI ADULTO ACOMPAÑANTE", "CELULAR ADULTO ACOMPAÑANTE",
    "Nombres del Especialista encargado del CCONNA", "Apellidos del Especialista encargado del CCONNA",
    "Teléfono del Especialista encargado del CCONNA", "Correo Electrónico del Especialista encargado del CCONNA",
]

NIVELES = {"CCONNA DISTRITAL": "DISTRITAL", "CCONNA PROVINCIAL": "PROVINCIAL", "CCONNA REGIONAL": "REGIONAL",
           "DISTRITAL": "DISTRITAL", "PROVINCIAL": "PROVINCIAL", "REGIONAL": "REGIONAL"}
CONDICION_INTEGRANTE = "INTEGRANTE"
CONDICION_EX = "EX CCONNA"
MAX_ERRORES_MENSAJE = 15


class EtlCconnaError(Exception):
    """El archivo no cumple las condiciones mínimas; no se carga nada."""


@dataclass
class ResultadoCconna:
    organizaciones: List[Dict[str, Any]] = field(default_factory=list)
    integrantes: List[Dict[str, Any]] = field(default_factory=list)
    leidos: Dict[str, int] = field(default_factory=dict)
    descartados: int = 0
    advertencias: List[str] = field(default_factory=list)

    def resumen(self) -> Dict[str, Any]:
        por_nivel = {n: sum(1 for o in self.organizaciones if o["nivel"] == n)
                     for n in ("DISTRITAL", "PROVINCIAL", "REGIONAL")}
        # Igual que el Power BI: las NNA se cuentan por su participación distrital,
        # sin quienes figuran como "Ex CCONNA".
        act = [i for i in self.integrantes if i["condicion"] == CONDICION_INTEGRANTE and i["nivel"] == "DISTRITAL"]
        por_nivel_int = {}
        for i in self.integrantes:
            if i["condicion"] == CONDICION_INTEGRANTE:
                por_nivel_int[i["nivel"]] = por_nivel_int.get(i["nivel"], 0) + i["cantidad"]
        return {
            "organizaciones": len(self.organizaciones),
            "distritales": por_nivel["DISTRITAL"],
            "provinciales": por_nivel["PROVINCIAL"],
            "regionales": por_nivel["REGIONAL"],
            "registradosMimp": sum(1 for o in self.organizaciones if o["registro_mimp"] == "SI"),
            "integrantes": sum(i["cantidad"] for i in act),
            "mujeres": sum(i["cantidad"] for i in act if i["sexo"] == "M"),
            "hombres": sum(i["cantidad"] for i in act if i["sexo"] == "H"),
            "integrantesPorNivel": por_nivel_int,
            "exIntegrantes": sum(i["cantidad"] for i in self.integrantes
                                 if i["condicion"] == CONDICION_EX and i["nivel"] == "DISTRITAL"),
            "leidos": self.leidos,
            "descartados": self.descartados,
            "advertencias": self.advertencias,
        }


# ─── Utilidades ──────────────────────────────────────────────────────────────

def _vacio(v: Any) -> bool:
    if v is None or (isinstance(v, str) and not v.strip()):
        return True
    try:
        return bool(pd.isna(v))
    except (TypeError, ValueError):
        return False


def _txt(v: Any, max_len: Optional[int] = None) -> Optional[str]:
    if _vacio(v):
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = re.sub(r"\s+", " ", str(v)).strip()
    return (s[:max_len] if max_len else s) or None


def _clave(s: str) -> str:
    s = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def _ubigeo(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    digitos = re.sub(r"\D", "", s.split(".")[0])
    if not digitos:
        return None
    return digitos.zfill(6) if len(digitos) <= 6 else digitos


def _fecha(v: Any) -> Optional[date]:
    if _vacio(v):
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if 20000 < float(v) < 80000:
            return (pd.Timestamp("1899-12-30") + pd.Timedelta(days=int(v))).date()
        return None
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _entero(v: Any) -> Optional[int]:
    s = _txt(v)
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def _sexo(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    k = _clave(s)
    if k[0] == "H" or k.startswith(("MASCULINO", "VARON")):
        return "H"
    if k[0] in ("M", "F"):
        return "M"
    return None


def _si_no(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    k = _clave(s)
    return k if k in ("SI", "NO", "OBSERVADO") else None


def departamento_analitico(ubigeo: str, departamento: Optional[str]) -> Optional[str]:
    """CCDD 26 = GORE LIMA; 15 se divide por provincia (01 = Lima Metropolitana)."""
    if ubigeo.startswith("26"):
        return "GORE LIMA"
    if ubigeo.startswith("15"):
        if ubigeo[2:4] in ("00", "01"):
            return "LIMA METROPOLITANA" if ubigeo[2:4] == "01" else "LIMA"
        return "GORE LIMA"
    return departamento


def _geo(ubigeo: str, catalogo: Dict[str, Dict[str, Optional[str]]], excel: Tuple[Any, Any, Any]):
    """Nombres del catálogo del DNA.mdb según el nivel; si no está, los del Excel en mayúsculas."""
    clave_geo = (ubigeo[:2] + "0000" if ubigeo[2:] == "0000"
                 else ubigeo[:4] + "00" if ubigeo[4:] == "00" else ubigeo)
    geo = catalogo.get(clave_geo)
    if geo:
        return geo.get("departamento"), geo.get("provincia"), geo.get("distrito"), True
    d, p, di = (_clave(_txt(x, 100)) if _txt(x) else None for x in excel)
    return d, p, di, False


# ─── Transformación ──────────────────────────────────────────────────────────

def transformar_cconna(
    tablas: Dict[str, pd.DataFrame],
    catalogo_ubigeo: Optional[Dict[str, Dict[str, Optional[str]]]] = None,
) -> ResultadoCconna:
    faltan = [t for t in (TABLA_ORGANIZACIONES, TABLA_INTEGRANTES) if t not in tablas]
    if faltan:
        raise EtlCconnaError(
            "El archivo no contiene las tablas de Excel: " + ", ".join(faltan)
            + ". Verifique que sea el archivo 'CCONNA nominal' con las hojas "
              "'BD ORGANIZACIONAL' (Tabla1) y 'BD NOMINAL' (Tabla5)."
        )
    org, nom = tablas[TABLA_ORGANIZACIONES], tablas[TABLA_INTEGRANTES]
    for nombre, df, requeridas in ((TABLA_ORGANIZACIONES, org, REQUERIDAS_ORGANIZACIONES),
                                   (TABLA_INTEGRANTES, nom, REQUERIDAS_INTEGRANTES)):
        ausentes = [c for c in requeridas if c not in df.columns]
        if ausentes:
            raise EtlCconnaError(f"La tabla {nombre} no tiene las columnas: {', '.join(ausentes)}.")

    catalogo = catalogo_ubigeo or {}
    res = ResultadoCconna(leidos={TABLA_ORGANIZACIONES: len(org), TABLA_INTEGRANTES: len(nom)})
    errores: List[str] = []
    vistos: Dict[str, int] = {}
    fuera_catalogo = 0

    def col(fila, nombre, df):
        return fila.get(nombre) if nombre in df.columns else None

    # 1. Organizaciones
    for pos, fila in enumerate(org.to_dict("records"), start=2):
        if all(_vacio(v) for v in fila.values()):
            res.descartados += 1
            continue
        ubigeo = _ubigeo(fila.get(COL_UBIGEO))
        tipo = _txt(fila.get(COL_TIPO))
        nivel = NIVELES.get(_clave(tipo)) if tipo else None
        nombre = _txt(fila.get(COL_NOMBRE), 200)
        if not ubigeo or len(ubigeo) != 6:
            errores.append(f"organizaciones fila {pos}: Ubigeo '{fila.get(COL_UBIGEO)}' no tiene 6 dígitos")
            continue
        if not nivel:
            errores.append(f"organizaciones fila {pos}: 'Tipo de CCONNA' desconocido ('{tipo}')")
            continue
        if not nombre:
            errores.append(f"organizaciones fila {pos}: falta 'Nombre del CCONNA'")
            continue
        if ubigeo in vistos:
            errores.append(f"organizaciones fila {pos}: Ubigeo {ubigeo} repetido (ya está en la fila {vistos[ubigeo]})")
            continue
        vistos[ubigeo] = pos

        dep, prov, dist, en_catalogo = _geo(
            ubigeo, catalogo, (col(fila, COL_DEP, org), col(fila, COL_PROV, org), col(fila, COL_DIST, org)))
        if not en_catalogo:
            fuera_catalogo += 1
        fecha_acta = _fecha(col(fila, COL_FECHA_ACTA, org))
        fecha_ord = _fecha(col(fila, COL_FECHA_ORDENANZA, org))
        res.organizaciones.append({
            "ubigeo": ubigeo,
            "nivel": nivel,
            "nombre": nombre,
            "ccdd": ubigeo[:2],
            "ubigeo_prov": None if nivel == "REGIONAL" else ubigeo[:4],
            "departamento": dep,
            "provincia": prov,
            "distrito": dist,
            "departamento_mod": departamento_analitico(ubigeo, dep),
            "numero_orden": _entero(col(fila, COL_NUMERO, org)),
            "numero_ordenanza": _txt(col(fila, COL_ORDENANZA, org), 100),
            "fecha_ordenanza": fecha_ord,
            "numero_resolucion": _txt(col(fila, COL_RESOLUCION, org), 100),
            "fecha_resolucion": _fecha(col(fila, COL_FECHA_RESOLUCION, org)),
            "fecha_acta": fecha_acta,
            "fecha_plan": _fecha(col(fila, COL_FECHA_PLAN, org)),
            "anio_conformacion": (fecha_acta or fecha_ord).year if (fecha_acta or fecha_ord) else None,
            "base_nominal": _txt(col(fila, COL_BASE_NOMINAL, org), 50),
            "registro_mimp": _si_no(col(fila, COL_REGISTRO, org)),
            "oficio_dsld": _txt(col(fila, COL_OFICIO, org), 100),
            "fecha_registro": _fecha(col(fila, COL_FECHA_REGISTRO, org)),
        })

    # 2. Integrantes: se agregan por ubigeo, nivel, sexo y condición (nunca fila por fila)
    conteos: Dict[tuple, int] = {}
    sin_sexo = 0
    sin_ubigeo = 0
    for fila in nom.to_dict("records"):
        if all(_vacio(v) for v in fila.values()):
            res.descartados += 1
            continue
        sexo = _sexo(fila.get(COL_SEXO))
        if sexo is None:
            sin_sexo += 1
        for nivel, col_part, col_ub in (
            ("DISTRITAL", COL_P_DISTRITAL, COL_UB_DISTRITAL),
            ("PROVINCIAL", COL_P_PROVINCIAL, COL_UB_PROVINCIAL),
            ("REGIONAL", COL_P_REGIONAL, COL_UB_REGIONAL),
            ("NACIONAL", COL_P_NACIONAL, None),
        ):
            participacion = _txt(col(fila, col_part, nom))
            if not participacion:
                continue
            condicion = CONDICION_EX if _clave(participacion).startswith("EX") else CONDICION_INTEGRANTE
            ubigeo = _ubigeo(col(fila, col_ub, nom)) if col_ub else None
            if ubigeo and len(ubigeo) != 6:
                ubigeo = None
            if nivel != "NACIONAL" and not ubigeo:
                sin_ubigeo += 1
            clave = (nivel, ubigeo, sexo, condicion)
            conteos[clave] = conteos.get(clave, 0) + 1

    for (nivel, ubigeo, sexo, condicion), cantidad in sorted(conteos.items(), key=lambda x: str(x[0])):
        dep = prov = dist = None
        if ubigeo:
            dep, prov, dist, _ = _geo(ubigeo, catalogo, (None, None, None))
        res.integrantes.append({
            "nivel": nivel,
            "ubigeo": ubigeo,
            "ccdd": ubigeo[:2] if ubigeo else None,
            "ubigeo_prov": ubigeo[:4] if ubigeo and nivel != "REGIONAL" else None,
            "departamento": dep,
            "provincia": prov,
            "distrito": dist,
            "departamento_mod": departamento_analitico(ubigeo, dep) if ubigeo else None,
            "sexo": sexo,
            "condicion": condicion,
            "cantidad": cantidad,
        })

    if errores:
        extra = f" (y {len(errores) - MAX_ERRORES_MENSAJE} más)" if len(errores) > MAX_ERRORES_MENSAJE else ""
        raise EtlCconnaError(
            f"No se cargó nada: {len(errores)} fila(s) con errores. "
            + "; ".join(errores[:MAX_ERRORES_MENSAJE]) + extra + "."
        )
    if not res.organizaciones:
        raise EtlCconnaError("La hoja 'BD ORGANIZACIONAL' no tiene CCONNA para cargar.")

    if fuera_catalogo:
        res.advertencias.append(
            f"{fuera_catalogo} CCONNA con un ubigeo que no está en el catálogo del DNA.mdb "
            f"(se usaron los nombres del Excel; el CCONNA regional de Lima usa el código 26)."
        )
    if sin_sexo:
        res.advertencias.append(f"{sin_sexo} integrante(s) sin sexo válido; se cuentan aparte.")
    if sin_ubigeo:
        res.advertencias.append(f"{sin_ubigeo} participación(es) sin ubigeo; se cuentan sin ubicación.")
    return res
