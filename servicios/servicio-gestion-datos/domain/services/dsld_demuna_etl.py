"""
ETL DSLD · DEMUNA y Supervisión desde DNA.mdb

Reproduce las reglas del Power BI DSLD_GENERAL_V3 (ver docs/ANALISIS_POWERBI_DSLD.md):
  - Padrón: tabla `dna` con modelo IN ('01','02')  (equivale a rangoPI2023 <> 9)
  - Estado: códigos a/b/c de `estadodna` (b=Acreditada, c=No acreditada, a=No operativa)
  - Tipo de gobierno: `modelo` → `modelodna.siglas`
  - Supervisiones: `supervisadas` cuyas DEMUNA están en el padrón
    (reproduce la consulta Access "DEMUNA supervisadas")
  - Geografía: tabla `ubigeo`, con LIMA METROPOLITANA / GORE LIMA (CCDD analítico 26)
  - Población: "Perú población INEI 2015" (Menor_17 = población NNA)

Este módulo es puro: recibe DataFrames y devuelve registros listos para
persistir. No toca la base de datos.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import pandas as pd

TABLA_DNA = "dna"
TABLA_SUPERVISADAS = "supervisadas"
TABLA_UBIGEO = "ubigeo"
TABLA_ESTADOS = "estadodna"
TABLA_MODELOS = "modelodna"
TABLA_SUPERVISORES = "supervisores"
TABLA_POBLACION = "Perú población INEI 2015"

TABLAS_REQUERIDAS = [TABLA_DNA, TABLA_SUPERVISADAS, TABLA_UBIGEO, TABLA_ESTADOS, TABLA_MODELOS]
TABLAS_OPCIONALES = [TABLA_SUPERVISORES, TABLA_POBLACION]
TABLAS_ACCESS = TABLAS_REQUERIDAS + TABLAS_OPCIONALES

MODELOS_DEMUNA = ("01", "02")
ESTADOS_TABLERO = {"a": "NO OPERATIVA", "b": "ACREDITADA", "c": "NO ACREDITADA"}
NOMBRE_LARGO = "Defensoría Municipal de la Niña, Niño y Adolescente"

# Columnas mínimas que debe tener cada tabla requerida
COLUMNAS_REQUERIDAS = {
    TABLA_DNA: ["codigo", "dna", "dpto", "prov", "dist", "estado_acreditacion", "ubigeo", "modelo"],
    TABLA_SUPERVISADAS: ["codigo", "codigo_dna", "f_supervision"],
    TABLA_UBIGEO: ["ubigeo", "nombre"],
    TABLA_ESTADOS: ["codigo", "estado"],
    TABLA_MODELOS: ["codigo", "modelo", "siglas"],
}


class EtlValidacionError(Exception):
    """El archivo no cumple las condiciones mínimas; no se debe cargar nada."""


@dataclass
class ResultadoEtl:
    ubigeos: List[Dict[str, Any]] = field(default_factory=list)
    poblacion: List[Dict[str, Any]] = field(default_factory=list)
    estados: List[Dict[str, Any]] = field(default_factory=list)
    modelos: List[Dict[str, Any]] = field(default_factory=list)
    supervisores: List[Dict[str, Any]] = field(default_factory=list)
    demunas: List[Dict[str, Any]] = field(default_factory=list)
    supervisiones: List[Dict[str, Any]] = field(default_factory=list)
    leidos: Dict[str, int] = field(default_factory=dict)
    descartados: Dict[str, int] = field(default_factory=dict)
    advertencias: List[str] = field(default_factory=list)

    @property
    def total_cargados(self) -> int:
        return sum(len(x) for x in (self.ubigeos, self.poblacion, self.estados, self.modelos,
                                    self.supervisores, self.demunas, self.supervisiones))

    @property
    def total_leidos(self) -> int:
        return sum(self.leidos.values())

    @property
    def total_descartados(self) -> int:
        return sum(self.descartados.values())

    def resumen(self) -> Dict[str, Any]:
        estados = pd.Series([d["estado_acreditacion"] for d in self.demunas]).value_counts().to_dict()
        anios = pd.Series([s["anio"] for s in self.supervisiones]).value_counts().sort_index().to_dict()
        return {
            "demunas": len(self.demunas),
            "acreditadas": int(estados.get("b", 0)),
            "noAcreditadas": int(estados.get("c", 0)),
            "noOperativas": int(estados.get("a", 0)),
            "provinciales": sum(1 for d in self.demunas if d["modelo"] == "01"),
            "distritales": sum(1 for d in self.demunas if d["modelo"] == "02"),
            "supervisiones": len(self.supervisiones),
            "supervisionesPorAnio": {int(k): int(v) for k, v in anios.items()},
            "ubigeos": len(self.ubigeos),
            "poblacion": len(self.poblacion),
            "leidos": self.leidos,
            "descartados": self.descartados,
            "advertencias": self.advertencias,
        }


# ─── Utilidades de limpieza ──────────────────────────────────────────────────

def _txt(v: Any, max_len: Optional[int] = None) -> Optional[str]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    if not s:
        return None
    return s[:max_len] if max_len else s


def _upper(v: Any, max_len: Optional[int] = None) -> Optional[str]:
    s = _txt(v, max_len)
    return s.upper() if s else s


def _fecha(v: Any) -> Optional[date]:
    s = _txt(v)
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%y %H:%M:%S", "%m/%d/%Y %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _entero(v: Any) -> Optional[int]:
    s = _txt(v)
    if s is None:
        return None
    try:
        return int(float(s.replace(",", "")))
    except ValueError:
        return None


def _codigo(v: Any, ancho: int) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    s = s.split(".")[0]
    return s.zfill(ancho) if s.isdigit() else s


def _verificar_columnas(tablas: Dict[str, pd.DataFrame]) -> None:
    faltantes = [t for t in TABLAS_REQUERIDAS if t not in tablas]
    if faltantes:
        raise EtlValidacionError(
            "El archivo no contiene las tablas requeridas: " + ", ".join(faltantes)
            + ". Verifique que sea la base DNA.mdb de la DSLD."
        )
    for tabla, cols in COLUMNAS_REQUERIDAS.items():
        ausentes = [c for c in cols if c not in tablas[tabla].columns]
        if ausentes:
            raise EtlValidacionError(f"La tabla '{tabla}' no tiene las columnas: {', '.join(ausentes)}.")


# ─── Transformaciones ────────────────────────────────────────────────────────

def _transformar_ubigeo(df: pd.DataFrame) -> List[Dict[str, Any]]:
    filas = []
    for _, r in df.iterrows():
        ub = _codigo(r.get("ubigeo"), 6)
        nombre = _upper(r.get("nombre"), 100)
        if not ub or len(ub) != 6 or not ub.isdigit() or not nombre or ub == "000000":
            continue
        filas.append((ub, nombre))

    nombres = dict(filas)
    registros = []
    for ub, nombre in filas:
        ccdd, ccpp, ccdi = ub[:2], ub[2:4], ub[4:]
        if ccpp == "00":
            nivel = "DEPARTAMENTO"
        elif ccdi == "00":
            nivel = "PROVINCIA"
        else:
            nivel = "DISTRITO"
        departamento = nombres.get(f"{ccdd}0000", nombre if nivel == "DEPARTAMENTO" else None)
        provincia = nombres.get(f"{ccdd}{ccpp}00") if nivel != "DEPARTAMENTO" else None
        distrito = nombre if nivel == "DISTRITO" else None

        if ccdd == "15" and nivel != "DEPARTAMENTO":
            dep_mod = "LIMA METROPOLITANA" if ccpp == "01" else "GORE LIMA"
        else:
            dep_mod = departamento
        ccdd_analitico = "26" if dep_mod == "GORE LIMA" else ccdd

        registros.append({
            "ubigeo": ub,
            "nivel": nivel,
            "ccdd": ccdd,
            "ccpp": None if nivel == "DEPARTAMENTO" else ccpp,
            "ccdi": ccdi if nivel == "DISTRITO" else None,
            "ubigeo_prov": None if nivel == "DEPARTAMENTO" else ccdd + ccpp,
            "nombre": nombre,
            "departamento": departamento or nombre,
            "provincia": provincia,
            "distrito": distrito,
            "departamento_mod": dep_mod or nombre,
            "ccdd_analitico": ccdd_analitico,
        })
    return registros


def _transformar_poblacion(df: pd.DataFrame, ubigeos_validos: set) -> tuple[List[Dict[str, Any]], int]:
    registros, descartados, vistos = [], 0, set()
    for _, r in df.iterrows():
        ub = _codigo(r.get("UBIGEO"), 6)
        if not ub or ub not in ubigeos_validos or ub in vistos:
            descartados += 1
            continue
        vistos.add(ub)
        registros.append({
            "ubigeo": ub,
            "poblacion_total": _entero(r.get("Total Nacional")),
            "poblacion_nna": _entero(r.get("Menor_17")),
        })
    return registros, descartados


def _transformar_estados(df: pd.DataFrame) -> List[Dict[str, Any]]:
    registros = []
    for _, r in df.iterrows():
        cod = _txt(r.get("codigo"))
        est = _upper(r.get("estado"), 60)
        if not cod or not est or len(cod) != 1:
            continue
        registros.append({"codigo": cod, "estado": est, "grupo_tablero": ESTADOS_TABLERO.get(cod)})
    return registros


def _transformar_modelos(df: pd.DataFrame) -> List[Dict[str, Any]]:
    registros = []
    for _, r in df.iterrows():
        cod = _codigo(r.get("codigo"), 2)
        if not cod:
            continue
        registros.append({
            "codigo": cod,
            "modelo": _txt(r.get("modelo"), 120) or cod,
            "siglas": _txt(r.get("siglas"), 30) or cod,
            "es_demuna": 1 if cod in MODELOS_DEMUNA else 0,
        })
    return registros


def _transformar_supervisores(df: Optional[pd.DataFrame]) -> List[Dict[str, Any]]:
    if df is None or "Id" not in df.columns:
        return []
    registros, vistos = [], set()
    for _, r in df.iterrows():
        sid = _entero(r.get("Id"))
        nombre = _txt(r.get("Nombre"), 100)
        if sid is None or not nombre or sid in vistos:
            continue
        vistos.add(sid)
        registros.append({"id": sid, "nombre": nombre})   # DNI no se importa
    return registros


def _nombre_demuna(v: Any) -> Optional[str]:
    s = _txt(v, 250)
    return s.replace("Defensoria", "Defensoría") if s else s


def _transformar_demunas(df: pd.DataFrame, ubigeos_validos: set, estados_validos: set,
                         res: ResultadoEtl) -> List[Dict[str, Any]]:
    df = df.copy()
    df["_modelo"] = df["modelo"].map(lambda v: _codigo(v, 2))
    municipales = df[df["_modelo"].isin(MODELOS_DEMUNA)]
    res.descartados["dna_no_municipal"] = int(len(df) - len(municipales))

    registros, errores = [], []
    codigos, ubigeos = set(), set()
    for _, r in municipales.iterrows():
        codigo = _codigo(r.get("codigo"), 5)
        ubigeo = _codigo(r.get("ubigeo"), 6)
        estado = _txt(r.get("estado_acreditacion"))
        est_reg = _txt(r.get("estado_registro"))
        nombre = _nombre_demuna(r.get("dna"))
        ref = f"código {codigo or '?'}"

        if not codigo:
            errores.append("DEMUNA sin código")
            continue
        if codigo in codigos:
            errores.append(f"{ref}: código duplicado")
            continue
        if not ubigeo or ubigeo not in ubigeos_validos:
            errores.append(f"{ref}: ubigeo '{ubigeo}' no existe en el catálogo")
            continue
        if ubigeo in ubigeos:
            errores.append(f"{ref}: ubigeo {ubigeo} repetido en otra DEMUNA municipal")
            continue
        if estado not in ESTADOS_TABLERO:
            errores.append(f"{ref}: estado de acreditación '{estado}' no es a/b/c")
            continue
        if est_reg is not None and est_reg not in estados_validos:
            res.advertencias.append(f"{ref}: estado de registro '{est_reg}' desconocido (se deja vacío)")
            est_reg = None

        codigos.add(codigo)
        ubigeos.add(ubigeo)
        f_acr = _fecha(r.get("f_acreditacion"))
        registros.append({
            "codigo": codigo,
            "nombre": nombre or codigo,
            "nombre_corto": (nombre or codigo).replace(NOMBRE_LARGO, "DEMUNA"),
            "ubigeo": ubigeo,
            "departamento": _upper(r.get("dpto"), 100) or "",
            "provincia": _upper(r.get("prov"), 100) or "",
            "distrito": _upper(r.get("dist"), 100) or "",
            "modelo": r["_modelo"],
            "estado_acreditacion": estado,
            "fecha_acreditacion": f_acr,
            "anio_acreditacion": f_acr.year if f_acr else None,
            "resolucion_acreditacion": _txt(r.get("resolución_acreditación"), 100),
            "estado_registro": est_reg,
            "fecha_registro": _fecha(r.get("f_registro")),
            "resolucion_inscripcion": _txt(r.get("resolución_inscripción"), 100),
            "fecha_inicio": _fecha(r.get("f_inicio")),
            "fecha_rof": _fecha(r.get("f_rof")),
            "direccion": _txt(r.get("direccion"), 250),
            "telefono1": _txt(r.get("fono1"), 20),
            "telefono2": _txt(r.get("fono2"), 20),
            "email": _txt(r.get("email"), 150),
            "horario": _txt(r.get("horario"), 100),
            "defensores_f": _entero(r.get("def_f")),
            "defensores_m": _entero(r.get("def_m")),
            "promotores_f": _entero(r.get("promdef_f")),
            "promotores_m": _entero(r.get("promdef_m")),
            "otros_f": _entero(r.get("otros_f")),
            "otros_m": _entero(r.get("otros_m")),
            "fecha_ultima_sup_access": _fecha(r.get("f_supervisión")),
            "fecha_cconna": _fecha(r.get("f_cconna")),
            "fortalecida": _txt(r.get("fortalecida"), 2),
            "pi_2022": _txt(r.get("PI 2022"), 1),
            "pi_2025": _txt(r.get("PI 2025"), 1),
            "rango_pi_2023": _entero(r.get("rangoPI2023")),
        })

    if errores:
        muestra = "; ".join(errores[:10])
        raise EtlValidacionError(
            f"{len(errores)} DEMUNA con datos inválidos. No se cargó nada. Ejemplos: {muestra}"
        )
    return registros


def _transformar_supervisiones(df: pd.DataFrame, codigos_demuna: set,
                               res: ResultadoEtl) -> List[Dict[str, Any]]:
    registros, ids = [], set()
    fuera_padron = sin_fecha = duplicadas = 0
    for _, r in df.iterrows():
        sid = _entero(r.get("codigo"))
        cod = _codigo(r.get("codigo_dna"), 5)
        fecha = _fecha(r.get("f_supervision"))
        if cod not in codigos_demuna:
            fuera_padron += 1
            continue
        if sid is None or sid in ids:
            duplicadas += 1
            continue
        if fecha is None:
            sin_fecha += 1
            continue
        ids.add(sid)
        registros.append({
            "id": sid,
            "codigo_demuna": cod,
            "fecha_supervision": fecha,
            "anio": fecha.year,
            "tipo_supervision": _entero(r.get("tipo_supervisión")),   # 1 = VIRTUAL, 2 = PRESENCIAL
            "supervisor_id": _entero(r.get("supervisor")),
            "resumen": _txt(r.get("resumen"), 4000),
            "comentarios": _txt(r.get("comentarios"), 4000),
        })
    res.descartados["supervisiones_fuera_de_padron"] = fuera_padron
    if sin_fecha:
        res.descartados["supervisiones_sin_fecha"] = sin_fecha
        res.advertencias.append(f"{sin_fecha} supervisiones sin fecha fueron omitidas.")
    if duplicadas:
        res.descartados["supervisiones_sin_id_o_duplicadas"] = duplicadas
        res.advertencias.append(f"{duplicadas} supervisiones sin código o duplicadas fueron omitidas.")
    return registros


def transformar_dna(tablas: Dict[str, pd.DataFrame]) -> ResultadoEtl:
    """Convierte las tablas del DNA.mdb en registros para Oracle. Lanza EtlValidacionError si no es válido."""
    _verificar_columnas(tablas)
    res = ResultadoEtl()
    res.leidos = {t: int(len(df)) for t, df in tablas.items()}

    res.ubigeos = _transformar_ubigeo(tablas[TABLA_UBIGEO])
    if not res.ubigeos:
        raise EtlValidacionError("La tabla 'ubigeo' no tiene códigos válidos.")
    validos = {u["ubigeo"] for u in res.ubigeos}

    res.estados = _transformar_estados(tablas[TABLA_ESTADOS])
    faltan = set(ESTADOS_TABLERO) - {e["codigo"] for e in res.estados}
    if faltan:
        raise EtlValidacionError(f"La tabla 'estadodna' no tiene los códigos: {', '.join(sorted(faltan))}.")

    res.modelos = _transformar_modelos(tablas[TABLA_MODELOS])
    faltan = set(MODELOS_DEMUNA) - {m["codigo"] for m in res.modelos}
    if faltan:
        raise EtlValidacionError(f"La tabla 'modelodna' no tiene los modelos: {', '.join(sorted(faltan))}.")

    res.supervisores = _transformar_supervisores(tablas.get(TABLA_SUPERVISORES))
    if TABLA_SUPERVISORES not in tablas:
        res.advertencias.append("No se encontró la tabla 'supervisores'; los nombres de supervisor quedarán vacíos.")

    if TABLA_POBLACION in tablas:
        res.poblacion, desc = _transformar_poblacion(tablas[TABLA_POBLACION], validos)
        if desc:
            res.descartados["poblacion_sin_ubigeo_valido"] = desc
    else:
        res.advertencias.append(f"No se encontró la tabla '{TABLA_POBLACION}'; la población NNA quedará vacía.")

    res.demunas = _transformar_demunas(tablas[TABLA_DNA], validos, {e["codigo"] for e in res.estados}, res)
    if not res.demunas:
        raise EtlValidacionError("No se encontró ninguna DEMUNA municipal (modelo 01 o 02). No se cargó nada.")

    res.supervisiones = _transformar_supervisiones(
        tablas[TABLA_SUPERVISADAS], {d["codigo"] for d in res.demunas}, res
    )

    sin_pob = len({d["ubigeo"] for d in res.demunas} - {p["ubigeo"] for p in res.poblacion})
    if res.poblacion and sin_pob:
        res.advertencias.append(f"{sin_pob} DEMUNA sin dato de población NNA.")
    ids_sup = {s["id"] for s in res.supervisores}
    huerfanos = sum(1 for s in res.supervisiones if s["supervisor_id"] is not None and s["supervisor_id"] not in ids_sup)
    if ids_sup and huerfanos:
        res.advertencias.append(f"{huerfanos} supervisiones con supervisor no registrado en el catálogo.")
    return res
