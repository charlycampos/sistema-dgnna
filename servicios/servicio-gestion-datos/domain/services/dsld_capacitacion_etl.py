"""
ETL DSLD · Capacitación a defensores DEMUNA desde
"CAPACITACION_20214-2026 NOMINAL.xlsx" (tabla de Excel TB_CAPA_DEMUNA).

Reglas del Power BI DSLD_GENERAL_V3 (TB_CAPA_DEMUNA y MEDIDAS):
  - Solo cuenta filas con "Estado de aprobación" = APROBADO (aquí se guardan todas
    las filas con su estado, y el tablero filtra APROBADO).
  - UBIGEO = ubigeo de la DEMUNA (CÓDIGO → dna.codigo).
  - Año_Capacitacion = YEAR(FECHA INICIO CURSO).
  - Participaciones = número de filas; Personas_Capacitadas = COUNT(DNI) (filas con DNI).
  - Virtual / Presencial = TIPO DE CAPACITACIÓN.
  - Distritos/Provincias/Regiones capacitados = distintos UBIGEO / UBIGEO_PROV / DEPARTAMENTO.

Datos personales (decisión de la DSLD, 17/09/2026, opción A):
  - El DNI NUNCA se guarda. Se reemplaza por `persona_id` = HMAC-SHA256(clave secreta, DNI),
    un código irreversible que solo sirve para contar personas distintas.
  - No se leen nombres, apellidos, teléfono, correo, nota, formación, profesión, función,
    fecha de ingreso, tutor ni observaciones.
  - Se guarda el sexo (H/M), igual que en PIAS.

Módulo puro: recibe un DataFrame y devuelve registros listos para persistir.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import pandas as pd

TABLA_EXCEL = "TB_CAPA_DEMUNA"

COL_ANIO = "AÑO"
COL_CODIGO = "CÓDIGO"
COL_DEP = "DEPARTAMENTO"
COL_PROV = "PROVINCIA"
COL_DIST = "DISTRITO"
COL_CURSO = "CURSO"
COL_SIGLAS = "SIGLAS"
COL_SEDE = "SEDE DE CAPACITACIÓN"
COL_TIPO = "TIPO DE CAPACITACIÓN"
COL_INICIO = "FECHA INICIO CURSO"
COL_FIN = "FECHA CULMINA CURSO"
COL_ASISTENTE = "TIPO ASISTENTE"
COL_SEXO = "SEXO"
COL_DNI = "DNI"                      # solo se usa en memoria para calcular persona_id
COL_ESTADO = "Estado de aprobación"

COLUMNAS_USADAS = [COL_ANIO, COL_CODIGO, COL_DEP, COL_PROV, COL_DIST, COL_CURSO, COL_SIGLAS, COL_SEDE,
                   COL_TIPO, COL_INICIO, COL_FIN, COL_ASISTENTE, COL_SEXO, COL_DNI, COL_ESTADO]
COLUMNAS_REQUERIDAS = [COL_CODIGO, COL_TIPO, COL_INICIO, COL_DNI, COL_ESTADO]
COLUMNAS_EXCLUIDAS = [
    "NOMBRES DEL DEFENSOR/A", "APELLIDOS DEL DEFENSOR/A", "TELÉFONO/CELULAR", "CORREO ELECTRÓNICO",
    "NOTA", "FORMACIÓN ACADEMICA", "PROFESIÓN", "FUNCIÓN QUE CUMPLE EN LA DNA",
    "FECHA INGRESO SERVICIO DNA", "TUTOR/A", "Observación", "DNA", "Nº",
]

ESTADO_APROBADO = "APROBADO"
TIPOS = {"VIRTUAL": "VIRTUAL", "PRESENCIAL": "PRESENCIAL", "SEMIPRESENCIAL": "MIXTA", "MIXTA": "MIXTA", "MIXTO": "MIXTA"}
ASISTENTES = {"INVITADA/O": "INVITADO", "INVITADO/A": "INVITADO", "INVITADO": "INVITADO", "INVITADA": "INVITADO",
              "CPS": "CP"}
LONGITUD_MIN_CLAVE = 16
MAX_ERRORES_MENSAJE = 15


class EtlCapacitacionError(Exception):
    """El archivo no cumple las condiciones mínimas; no se carga nada."""


class ClaveSeudonimoError(Exception):
    """Falta la clave secreta para seudonimizar el DNI (configuración del servidor)."""


@dataclass
class ResultadoCapacitacion:
    participaciones: List[Dict[str, Any]] = field(default_factory=list)
    leidos: int = 0
    descartados: int = 0
    advertencias: List[str] = field(default_factory=list)

    def resumen(self) -> Dict[str, Any]:
        ap = [p for p in self.participaciones if p["estado"] == ESTADO_APROBADO]
        anios = pd.Series([p["anio"] for p in ap]).value_counts().sort_index()
        fechas = [p["fecha_inicio"] for p in ap]
        return {
            "registros": len(self.participaciones),
            "aprobados": len(ap),
            "personasConDni": sum(1 for p in ap if p["persona_id"]),
            "personasDistintas": len({p["persona_id"] for p in ap if p["persona_id"]}),
            "virtual": sum(1 for p in ap if p["tipo_capacitacion"] == "VIRTUAL"),
            "presencial": sum(1 for p in ap if p["tipo_capacitacion"] == "PRESENCIAL"),
            "aprobadosPorAnio": {int(k): int(v) for k, v in anios.items()},
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
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d/%m/%y", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _codigo(v: Any) -> Optional[str]:
    s = _txt(v, 10)
    if not s:
        return None
    s = s.split(".")[0]
    return s.zfill(5) if s.isdigit() else s


def _sexo(v: Any) -> Optional[str]:
    s = _txt(v)
    if not s:
        return None
    k = _clave(s)
    if k in ("H", "HOMBRE", "MASCULINO", "VARON"):
        return "H"
    if k in ("M", "MUJER", "FEMENINO"):
        return "M"
    return None


def _dni_normalizado(v: Any) -> Optional[str]:
    """Solo dígitos; los DNI de 7 dígitos perdieron el cero inicial en Excel."""
    s = _txt(v)
    if not s:
        return None
    if isinstance(v, float) and v.is_integer():
        s = str(int(v))
    digitos = re.sub(r"\D", "", s.split(".")[0] if re.fullmatch(r"\d+\.0+", s) else s)
    if not digitos:
        return None
    return digitos.zfill(8) if len(digitos) < 8 else digitos


def seudonimo(clave: bytes, dni: str) -> str:
    return hmac.new(clave, dni.encode("ascii"), hashlib.sha256).hexdigest()


def validar_clave(clave: Optional[str]) -> bytes:
    if not clave or len(clave) < LONGITUD_MIN_CLAVE:
        raise ClaveSeudonimoError(
            "Falta configurar la variable DSLD_CLAVE_SEUDONIMO en el servicio de gestión de datos "
            f"(mínimo {LONGITUD_MIN_CLAVE} caracteres). Sin ella no se puede proteger el DNI."
        )
    return clave.encode("utf-8")


def departamento_analitico(ubigeo: Optional[str], departamento: Optional[str]) -> Optional[str]:
    if ubigeo and ubigeo.startswith("15"):
        return "LIMA METROPOLITANA" if ubigeo[2:4] == "01" else "GORE LIMA"
    return departamento


# ─── Transformación ──────────────────────────────────────────────────────────

def transformar_capacitacion(
    df: pd.DataFrame,
    clave: bytes,
    padron: Optional[Dict[str, str]] = None,
    catalogo_ubigeo: Optional[Dict[str, Dict[str, Optional[str]]]] = None,
) -> ResultadoCapacitacion:
    """
    `padron`: {codigo_demuna: ubigeo} de DSLD_DEMUNAS (equivale al cruce con dna del Power BI).
    `catalogo_ubigeo`: nombres oficiales de DSLD_UBIGEO.
    """
    faltan = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
    if faltan:
        raise EtlCapacitacionError(f"La tabla {TABLA_EXCEL} no tiene las columnas: {', '.join(faltan)}.")

    padron = padron or {}
    catalogo = catalogo_ubigeo or {}
    # nombre oficial del departamento por nombre normalizado (para filas sin código de DEMUNA)
    deptos_catalogo = {
        _clave(g["departamento"]): (u[:2], g["departamento"])
        for u, g in catalogo.items() if u.endswith("0000") and g.get("departamento")
    }
    res = ResultadoCapacitacion(leidos=len(df))
    errores: List[str] = []
    fuera_padron: Dict[str, int] = {}
    sin_codigo = 0
    fin_invalida = 0
    tipo_desconocido: Dict[str, int] = {}
    cache_seudonimos: Dict[str, str] = {}

    def col(fila, nombre):
        return fila.get(nombre) if nombre in df.columns else None

    for pos, fila in enumerate(df.to_dict("records"), start=2):
        if all(_vacio(v) for v in fila.values()):
            res.descartados += 1
            continue
        fecha_ini = _fecha(fila.get(COL_INICIO))
        if fecha_ini is None:
            errores.append(f"fila {pos}: FECHA INICIO CURSO vacía o no válida")
            continue
        estado = _txt(fila.get(COL_ESTADO), 20)
        if not estado:
            errores.append(f"fila {pos}: falta Estado de aprobación")
            continue
        estado = _clave(estado)

        tipo_txt = _txt(fila.get(COL_TIPO))
        tipo = TIPOS.get(_clave(tipo_txt)) if tipo_txt else None
        if tipo_txt and not tipo:
            tipo_desconocido[tipo_txt] = tipo_desconocido.get(tipo_txt, 0) + 1

        codigo = _codigo(fila.get(COL_CODIGO))
        ubigeo = padron.get(codigo) if codigo else None
        if not codigo:
            sin_codigo += 1
        elif not ubigeo:
            fuera_padron[codigo] = fuera_padron.get(codigo, 0) + 1

        geo = catalogo.get(ubigeo) if ubigeo else None
        ccdd_sin_ubigeo = None
        if geo:
            departamento, provincia, distrito = geo.get("departamento"), geo.get("provincia"), geo.get("distrito")
        else:
            d = _txt(col(fila, COL_DEP), 100)
            oficial = deptos_catalogo.get(_clave(d)) if d else None
            departamento = oficial[1] if oficial else (_clave(d) if d else None)
            ccdd_sin_ubigeo = oficial[0] if oficial else None
            provincia = distrito = None

        fin_original = col(fila, COL_FIN)
        fecha_fin = _fecha(fin_original)
        if fecha_fin is None and not _vacio(fin_original):
            fin_invalida += 1

        dni = _dni_normalizado(fila.get(COL_DNI))
        persona_id = None
        if dni:
            persona_id = cache_seudonimos.get(dni)
            if persona_id is None:
                persona_id = cache_seudonimos[dni] = seudonimo(clave, dni)

        asistente = _txt(col(fila, COL_ASISTENTE), 30)
        if asistente:
            asistente = _clave(asistente)
            asistente = ASISTENTES.get(asistente, asistente)

        anio_excel = _txt(col(fila, COL_ANIO))
        res.participaciones.append({
            "anio": fecha_ini.year,
            "mes": fecha_ini.month,
            "anio_registro": int(float(anio_excel)) if anio_excel and re.fullmatch(r"\d{4}(\.0+)?", anio_excel) else None,
            "fecha_inicio": fecha_ini,
            "fecha_fin": fecha_fin,
            "codigo_demuna": codigo,
            "ubigeo": ubigeo,
            "departamento": departamento,
            "provincia": provincia,
            "distrito": distrito,
            "departamento_mod": departamento_analitico(ubigeo, departamento),
            "ccdd": ubigeo[:2] if ubigeo else ccdd_sin_ubigeo,
            "curso": _txt(col(fila, COL_CURSO), 250),
            "siglas_curso": _txt(col(fila, COL_SIGLAS), 20),
            "sede": _txt(col(fila, COL_SEDE), 100),
            "tipo_capacitacion": tipo,
            "tipo_asistente": asistente,
            "estado": estado,
            "persona_id": persona_id,
            "sexo": _sexo(col(fila, COL_SEXO)),
        })
    cache_seudonimos.clear()

    if errores:
        extra = f" (y {len(errores) - MAX_ERRORES_MENSAJE} más)" if len(errores) > MAX_ERRORES_MENSAJE else ""
        raise EtlCapacitacionError(
            f"No se cargó nada: {len(errores)} fila(s) con errores en {TABLA_EXCEL}. "
            + "; ".join(errores[:MAX_ERRORES_MENSAJE]) + extra + "."
        )
    if not res.participaciones:
        raise EtlCapacitacionError(f"La tabla {TABLA_EXCEL} no tiene registros para cargar.")

    if sin_codigo:
        res.advertencias.append(f"{sin_codigo} registro(s) sin CÓDIGO de DEMUNA: se cuentan, pero sin ubigeo.")
    if fuera_padron:
        detalle = ", ".join(f"{c} ({n})" for c, n in sorted(fuera_padron.items())[:10])
        res.advertencias.append(f"CÓDIGO que no está en el padrón del DNA.mdb (se cuentan sin ubigeo): {detalle}.")
    if fin_invalida:
        res.advertencias.append(f"{fin_invalida} registro(s) con FECHA CULMINA CURSO no válida; se guardó vacía.")
    if tipo_desconocido:
        detalle = ", ".join(f"'{t}' ({n})" for t, n in tipo_desconocido.items())
        res.advertencias.append(f"TIPO DE CAPACITACIÓN no reconocido (se guardó vacío): {detalle}.")
    return res
