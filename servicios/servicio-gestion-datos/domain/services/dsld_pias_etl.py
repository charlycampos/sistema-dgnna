"""
ETL DSLD · PIAS (Plataformas Itinerantes de Acción Social) desde
"PIAS_PBI_AUTORIDADES_PADRES.xlsx".

Reglas del Power BI DSLD_GENERAL_V3 (tabla TB_PIAS_PADRE_AUTORIDADES y MEDIDADS_PIAS):
  - Une tres tablas de Excel, una fila por persona atendida:
      TB_PIAS_AUTORIDADES → TIPO_PERSONA_PIA = "AUTORIDAD"
      TB_PIAS_PADRES      → "PADRE DE FAMILIA"
      TB_PIAS_NNA         → "NNA" (la fecha es FEC_INI_ACT_FOR, renombrada a FEC_EPE)
  - PERSONAS_ATENDIDAS = número de filas; totales por tipo = filas por tipo.
  - Ultima_Actualizacion = MAX(FEC_EPE).
  - La relación con el mapa es por UBIGEO (distrito).

Datos personales: NO se leen nombres, apellidos, tipo/número de documento, fecha de
nacimiento, edad, celular, teléfono, cargo ni institución. Se guarda SEXO (aprobado por
la DSLD, 17/09/2026) porque no identifica a la persona.

Módulo puro: recibe DataFrames y devuelve registros listos para persistir.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import pandas as pd

TIPO_AUTORIDAD = "AUTORIDAD"
TIPO_PADRE = "PADRE DE FAMILIA"
TIPO_NNA = "NNA"

# tabla de Excel → (tipo de persona, columna de sexo, columna de fecha, columna de modalidad, columna de área)
TABLAS = {
    "TB_PIAS_AUTORIDADES": (TIPO_AUTORIDAD, "SEXO_AUT", "FEC_EPE", "T_mod", "AREA_RES_CA"),
    "TB_PIAS_PADRES": (TIPO_PADRE, "SEXO_PoM", "FEC_EPE", "T_mod", "AR_LA"),
    "TB_PIAS_NNA": (TIPO_NNA, "SEXO_NNA", "FEC_INI_ACT_FOR", "TIP_INT", "AREA_RES_CA"),
}
COLUMNAS_COMUNES = ["PERIODO", "UBIGEO", "DEPAR_CA", "PROVIN_CA", "DISTR_CA", "CCPP_CA", "NOM_CA", "Num_ses"]
COLUMNAS_REQUERIDAS_COMUNES = ["UBIGEO", "NOM_CA"]

# Datos personales que existen en el Excel y nunca se leen (documentación y pruebas)
COLUMNAS_EXCLUIDAS = [
    "NOM_AUT", "APE_PAT_AUT", "AP_MAT_AUT", "TIP_DOC_AUT", "NRO_DOC_AUT", "FEC_NAC_AUT", "E_AUT",
    "CELULAR", "N°-TEL", "CARG_AUT", "INST_AUT",
    "NOM_PoM", "APE_PAT_PoM", "AP_MAT_PoM", "TIP_DOC_PoM", "NRO_DOC_PoM", "FEC_NAC_PoM", "EDAD_PoM",
    "NOM_NNA", "APE_PAT_NNA", "AP_MAT_NNA", "TIP_DOC_NNA", "NRO_DOC_NNA", "FEC_NAC_NNA", "EDAD_NNA",
]

MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO",
         "SETIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
MODALIDADES = {"PRESENCIAL": "PRESENCIAL", "REMOTO": "REMOTO", "VIRTUAL": "REMOTO", "MIXTO": "MIXTO"}
MAX_ERRORES_MENSAJE = 15


def columnas_tabla(tabla: str) -> List[str]:
    _, sexo, fecha, modalidad, area = TABLAS[tabla]
    return COLUMNAS_COMUNES + [sexo, fecha, modalidad, area]


def columnas_requeridas(tabla: str) -> List[str]:
    _, sexo, fecha, _, _ = TABLAS[tabla]
    return COLUMNAS_REQUERIDAS_COMUNES + [sexo, fecha]


class EtlPiasError(Exception):
    """El archivo no cumple las condiciones mínimas; no se carga nada."""


@dataclass
class ResultadoPias:
    atenciones: List[Dict[str, Any]] = field(default_factory=list)
    leidos: Dict[str, int] = field(default_factory=dict)
    descartados: int = 0
    advertencias: List[str] = field(default_factory=list)

    def resumen(self) -> Dict[str, Any]:
        tipos = pd.Series([a["tipo_persona"] for a in self.atenciones]).value_counts().to_dict()
        fechas = [a["fecha_atencion"] for a in self.atenciones if a["fecha_atencion"]]
        return {
            "atenciones": len(self.atenciones),
            "autoridades": int(tipos.get(TIPO_AUTORIDAD, 0)),
            "padres": int(tipos.get(TIPO_PADRE, 0)),
            "nna": int(tipos.get(TIPO_NNA, 0)),
            "mujeres": sum(1 for a in self.atenciones if a["sexo"] == "M"),
            "hombres": sum(1 for a in self.atenciones if a["sexo"] == "H"),
            "ultimaFecha": max(fechas).isoformat() if fechas else None,
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


def _clave(s: str) -> str:
    """Mayúsculas y sin tildes, para comparar textos escritos de distinta forma."""
    s = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def _nombre_geo(v: Any) -> Optional[str]:
    s = _txt(v, 100)
    return _clave(s) if s else None


def _ubigeo(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    s = s.split(".")[0]
    return s.zfill(6) if s.isdigit() else s


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
    s = _clave(s)
    if s in ("H", "HOMBRE", "MASCULINO", "V", "VARON"):
        return "H"
    if s in ("M", "MUJER", "FEMENINO", "F"):
        return "M"
    return None


def _mes(periodo: Any, fecha: Optional[date]) -> Optional[int]:
    s = _txt(periodo)
    if s:
        k = _clave(s).replace("SEPTIEMBRE", "SETIEMBRE")
        if k in MESES:
            return MESES.index(k) + 1
    return fecha.month if fecha else None


def _modalidad(v: Any) -> Optional[str]:
    s = _txt(v)
    return MODALIDADES.get(_clave(s)) if s else None


def _area(v: Any) -> Optional[str]:
    """RURAL / URBANA; otros textos (nombres de comunidades escritos por error) se dejan vacíos."""
    s = _txt(v)
    if not s:
        return None
    k = _clave(s)
    return {"RURAL": "RURAL", "URBANA": "URBANA", "URBANO": "URBANA"}.get(k)


class _Cuencas:
    """Unifica el nombre de la cuenca/plataforma ("NAPO" y "Napo" son la misma)."""

    def __init__(self) -> None:
        self._formas: Dict[str, Dict[str, int]] = {}

    def registrar(self, v: Any) -> Optional[str]:
        s = _txt(v, 150)
        if not s:
            return None
        k = _clave(s)
        formas = self._formas.setdefault(k, {})
        formas[s] = formas.get(s, 0) + 1
        return k

    def nombre(self, clave: Optional[str]) -> Optional[str]:
        if not clave:
            return None
        formas = self._formas[clave]
        # Prefiere la forma que no está toda en mayúsculas y, luego, la más frecuente
        return max(formas, key=lambda f: (f != f.upper(), formas[f]))


def departamento_analitico(ubigeo: str, departamento: Optional[str]) -> Optional[str]:
    if ubigeo.startswith("15"):
        return "LIMA METROPOLITANA" if ubigeo[2:4] == "01" else "GORE LIMA"
    return departamento


# ─── Transformación ──────────────────────────────────────────────────────────

def transformar_pias(
    tablas: Dict[str, pd.DataFrame],
    catalogo_ubigeo: Optional[Dict[str, Dict[str, Optional[str]]]] = None,
) -> ResultadoPias:
    faltan = [t for t in TABLAS if t not in tablas]
    if faltan:
        raise EtlPiasError(
            "El archivo no contiene las tablas de Excel: " + ", ".join(faltan)
            + ". Verifique que sea el archivo PIAS_PBI_AUTORIDADES_PADRES."
        )
    for t, df in tablas.items():
        ausentes = [c for c in columnas_requeridas(t) if c not in df.columns]
        if ausentes:
            raise EtlPiasError(f"La tabla {t} no tiene las columnas: {', '.join(ausentes)}.")

    catalogo = catalogo_ubigeo or {}
    res = ResultadoPias()
    errores: List[str] = []
    cuencas = _Cuencas()
    fuera_catalogo: Dict[str, int] = {}
    sexo_invalido = 0
    filas: List[Dict[str, Any]] = []

    for tabla, df in tablas.items():
        tipo, col_sexo, col_fecha, col_mod, col_area = TABLAS[tabla]
        res.leidos[tabla] = len(df)

        def col(fila, nombre, _df=df):
            return fila.get(nombre) if nombre in _df.columns else None

        for pos, fila in enumerate(df.to_dict("records"), start=1):
            if all(_vacio(v) for v in fila.values()):
                res.descartados += 1
                continue
            ref = f"{tabla} registro {pos}"
            ubigeo = _ubigeo(fila.get("UBIGEO"))
            if not ubigeo or len(ubigeo) != 6 or not ubigeo.isdigit():
                errores.append(f"{ref}: UBIGEO '{fila.get('UBIGEO')}' no tiene 6 dígitos")
                continue
            fecha = _fecha(fila.get(col_fecha))
            if fecha is None:
                errores.append(f"{ref}: {col_fecha} vacía o no válida")
                continue
            cuenca = cuencas.registrar(fila.get("NOM_CA"))
            if not cuenca:
                errores.append(f"{ref}: falta NOM_CA (cuenca)")
                continue

            sexo = _sexo(fila.get(col_sexo))
            if sexo is None:
                sexo_invalido += 1

            geo = catalogo.get(ubigeo)
            if geo:
                departamento, provincia, distrito = geo.get("departamento"), geo.get("provincia"), geo.get("distrito")
            else:
                if catalogo:
                    fuera_catalogo[ubigeo] = fuera_catalogo.get(ubigeo, 0) + 1
                departamento = _nombre_geo(col(fila, "DEPAR_CA"))
                provincia = _nombre_geo(col(fila, "PROVIN_CA"))
                distrito = _nombre_geo(col(fila, "DISTR_CA"))

            filas.append({
                "tipo_persona": tipo,
                "fecha_atencion": fecha,
                "anio": fecha.year,
                "mes": _mes(col(fila, "PERIODO"), fecha),
                "ubigeo": ubigeo,
                "departamento": departamento,
                "provincia": provincia,
                "distrito": distrito,
                "departamento_mod": departamento_analitico(ubigeo, departamento),
                "centro_poblado": _clave(_txt(col(fila, "CCPP_CA"), 150)) if _txt(col(fila, "CCPP_CA")) else None,
                "area_residencia": _area(col(fila, col_area)),
                "cuenca": cuenca,                      # se reemplaza por el nombre unificado al final
                "modalidad": _modalidad(col(fila, col_mod)),
                "sexo": sexo,
                "num_sesiones": _entero(col(fila, "Num_ses")),
            })

    if errores:
        extra = f" (y {len(errores) - MAX_ERRORES_MENSAJE} más)" if len(errores) > MAX_ERRORES_MENSAJE else ""
        raise EtlPiasError(
            f"No se cargó nada: {len(errores)} fila(s) con errores. "
            + "; ".join(errores[:MAX_ERRORES_MENSAJE]) + extra + "."
        )
    if not filas:
        raise EtlPiasError("El archivo no tiene atenciones PIAS para cargar.")

    for f in filas:
        f["cuenca"] = cuencas.nombre(f["cuenca"])
    res.atenciones = filas

    if fuera_catalogo:
        detalle = ", ".join(f"{u} ({n})" for u, n in sorted(fuera_catalogo.items()))
        res.advertencias.append(
            f"UBIGEO que no existe en el catálogo del DNA.mdb (se cargaron con los nombres del Excel): {detalle}."
        )
    if sexo_invalido:
        res.advertencias.append(f"{sexo_invalido} registro(s) sin sexo válido (H/M); se guardaron sin sexo.")
    return res
