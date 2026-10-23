"""
Parser del archivo PIAS NNA (indicador 4390 del PP 0117).

Indicador 4390: % de NNA de 3 a 14 años atendidos por las PIAS que reciben
al menos 3 sesiones.
    numerador   = NNA con NNA_ACT_FOR = 1  (columna P del Excel)
    denominador = total de NNA de la hoja 'Nominal'

Reglas:
- Se usa la hoja 'Nominal'. Las columnas se ubican por su CÓDIGO (fila de
  códigos: N°, PERIODO, EDAD_NNA, ...), no por su posición.
- Toda columna cuyo código empiece con 'FEC_' es una fecha de sesión
  (FEC2 se guarda aparte, tal cual viene).
- Los textos se normalizan (mayúsculas, espacios, tildes en cuencas).
- Las inconsistencias se devuelven como avisos; no bloquean la carga.
"""

import io
import math
import unicodedata
import uuid
from datetime import date, datetime, timedelta

import pandas as pd


class ErrorArchivo(Exception):
    """Error que impide procesar el archivo (se responde 400)."""


MESES = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SETIEMBRE": 9, "SEPTIEMBRE": 9, "OCTUBRE": 10,
    "NOVIEMBRE": 11, "DICIEMBRE": 12,
}

CUENCAS = [
    "Napo", "Napo (BAP Yahuas)", "Morona", "Putumayo", "Yavarí",
    "Tigre (BAP Corrientes)", "Ucayali II (Loreto)", "Aérea Loreto",
    "Ucayali I (Ucayali)", "Aérea Ucayali", "Lago Titicaca",
]

REQUERIDOS = ["PERIODO", "EDAD_NNA", "SEXO_NNA", "NNA_ACT_FOR", "NUM_SES"]


def _vacio(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    if v is pd.NaT:
        return True
    return isinstance(v, str) and not v.strip()


def _key(v) -> str:
    """Clave de comparación: sin tildes, mayúsculas, espacios simples."""
    if _vacio(v):
        return ""
    s = unicodedata.normalize("NFKD", str(v))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return " ".join(s.upper().split())


_CUENCA_MAP = {_key(c): c for c in CUENCAS}


def _txt(v, largo=None, upper=False, cap=False):
    if _vacio(v):
        return None
    s = " ".join(str(v).split())
    if upper:
        s = s.upper()
    elif cap:
        s = s.capitalize()
    return s[:largo] if largo else s


def _int(v):
    if _vacio(v):
        return None
    try:
        return int(round(float(str(v).strip())))
    except (TypeError, ValueError):
        return None


def _fecha(v):
    if _vacio(v):
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, pd.Timestamp):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, (int, float)):
        if 20000 < v < 80000:  # número de serie de Excel
            return (datetime(1899, 12, 30) + timedelta(days=float(v))).date()
        return None
    d = pd.to_datetime(str(v).strip(), dayfirst=True, errors="coerce")
    return None if pd.isna(d) else d.date()


def _ubigeo(v):
    if _vacio(v):
        return None
    s = str(v).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s.zfill(6)[:6] if s.isdigit() else s[:6]


class _Avisos:
    def __init__(self):
        self._d = {}

    def add(self, tipo: str, fila: int):
        a = self._d.setdefault(tipo, {"tipo": tipo, "cantidad": 0, "filasEjemplo": []})
        a["cantidad"] += 1
        if len(a["filasEjemplo"]) < 5:
            a["filasEjemplo"].append(fila)

    def lista(self):
        return list(self._d.values())


def parsear_pias(contenido: bytes) -> dict:
    try:
        xls = pd.ExcelFile(io.BytesIO(contenido))
    except Exception as e:
        raise ErrorArchivo(f"No se pudo leer el Excel: {e}")

    hoja = next((h for h in xls.sheet_names if _key(h) == "NOMINAL"), None)
    if not hoja:
        raise ErrorArchivo(
            f"No se encontró la hoja 'Nominal'. Hojas del archivo: {', '.join(xls.sheet_names)}")

    raw = pd.read_excel(xls, sheet_name=hoja, header=None, dtype=object)

    # Fila de códigos (N°, PERIODO, ENTIDAD, ..., EDAD_NNA, ...)
    fila_cod = None
    for i in range(min(8, len(raw))):
        if "EDAD_NNA" in {_key(v) for v in raw.iloc[i].tolist()}:
            fila_cod = i
            break
    if fila_cod is None:
        raise ErrorArchivo("No se encontró la fila de códigos de columnas (PERIODO, EDAD_NNA, SEXO_NNA...).")

    pos, fec_cols, vistos = {}, [], {}
    for j, c in enumerate(raw.iloc[fila_cod].tolist()):
        k = _key(c)
        if not k:
            continue
        if k.startswith("FEC_"):
            n = vistos.get(k, 0) + 1
            vistos[k] = n
            nombre = str(c).strip() if n == 1 else f"{str(c).strip()}#{n}"
            fec_cols.append((j, nombre[:40]))
        else:
            pos.setdefault(k, j)

    faltan = [r for r in REQUERIDOS if r not in pos]
    if faltan:
        raise ErrorArchivo(f"Faltan columnas obligatorias en la hoja '{hoja}': {', '.join(faltan)}")
    if not fec_cols:
        raise ErrorArchivo("No se encontraron columnas de fechas de sesión (FEC_...).")

    col_nro = next((pos[k] for k in ("N°", "Nº", "N", "NUMERO", "NRO") if k in pos), None)

    def g(fila, codigo):
        j = pos.get(codigo)
        return None if j is None else fila[j]

    avisos = _Avisos()
    nna, sesiones = [], []

    for idx, fila in zip(raw.index[fila_cod + 1:], raw.iloc[fila_cod + 1:].itertuples(index=False, name=None)):
        if all(_vacio(v) for v in fila):
            continue
        fila_excel = idx + 1

        periodo = _txt(g(fila, "PERIODO"), 20, upper=True)
        mes_ing = MESES.get(_key(periodo)) if periodo else None
        if periodo and not mes_ing:
            avisos.add("PERIODO no reconocido", fila_excel)

        edad = _int(g(fila, "EDAD_NNA"))
        if edad is None:
            avisos.add("Edad vacía", fila_excel)
        elif not 3 <= edad <= 14:
            avisos.add("Edad fuera del rango 3-14", fila_excel)

        sexo_raw = _key(g(fila, "SEXO_NNA"))
        sexo = sexo_raw if sexo_raw in ("M", "H") else None
        if sexo is None:
            avisos.add("Sexo distinto de M/H", fila_excel)

        cuenca_raw = g(fila, "NOM_CA")
        cuenca = _CUENCA_MAP.get(_key(cuenca_raw)) or _txt(cuenca_raw, 100)

        # Fechas de sesión en orden cronológico
        fechas = []
        for j, nombre in fec_cols:
            v = fila[j]
            if _vacio(v):
                continue
            f = _fecha(v)
            if f is None:
                avisos.add("Fecha de sesión no válida", fila_excel)
                continue
            fechas.append((f, nombre))
        fechas.sort(key=lambda x: x[0])

        num_ses = _int(g(fila, "NUM_SES"))
        cumple = _int(g(fila, "NNA_ACT_FOR"))
        if num_ses is not None and num_ses != len(fechas):
            avisos.add("Num_ses no coincide con la cantidad de fechas", fila_excel)
        if cumple not in (0, 1):
            avisos.add("NNA_ACT_FOR distinto de 0/1", fila_excel)
        elif cumple != (1 if len(fechas) >= 3 else 0):
            avisos.add("NNA_ACT_FOR no coincide con tener 3+ sesiones", fila_excel)

        fec2 = _fecha(g(fila, "FEC2"))
        if fec2 and len(fechas) >= 2 and fec2 != fechas[1][0]:
            avisos.add("FEC2 distinta de la 2da sesión real", fila_excel)

        nid = str(uuid.uuid4())
        nna.append({
            "id": nid,
            "nroFila": _int(fila[col_nro]) if col_nro is not None else None,
            "periodo": periodo,
            "mesIngreso": mes_ing,
            "entidad": _txt(g(fila, "ENTIDAD"), 50, upper=True),
            "lineaIntervencion": _txt(g(fila, "LIN_INTERV"), 300),
            "tipoIntervencion": _txt(g(fila, "TIP_INT"), 30, cap=True),
            "servicio": _txt(g(fila, "NOM_SERV"), 100, upper=True),
            "ubigeo": _ubigeo(g(fila, "UBIGEO")),
            "departamento": _txt(g(fila, "DEPAR_CA"), 100, upper=True),
            "provincia": _txt(g(fila, "PROVIN_CA"), 150, upper=True),
            "distrito": _txt(g(fila, "DISTR_CA"), 150, upper=True),
            "centroPoblado": _txt(g(fila, "CCPP_CA"), 200, upper=True),
            "area": _txt(g(fila, "AREA_RES_CA"), 20, cap=True),
            "cuencaPias": cuenca,
            "edad": edad,
            "sexo": sexo,
            "numZarpe": _int(g(fila, "N_Z")),
            "numSesiones": num_ses,
            "cumpleMinimo": cumple,
            "fec2": fec2,
            "fecPrimera": fechas[0][0] if fechas else None,
            "fecTercera": fechas[2][0] if len(fechas) >= 3 else None,
        })
        for n, (f, nombre) in enumerate(fechas, start=1):
            sesiones.append({
                "id": str(uuid.uuid4()),
                "nnaId": nid,
                "nroSesion": n,
                "fecha": f,
                "mes": f.month,
                "columnaOrigen": nombre,
            })

    if not nna:
        raise ErrorArchivo(f"La hoja '{hoja}' no tiene filas de datos.")

    numerador = sum(1 for r in nna if r["cumpleMinimo"] == 1)
    return {
        "hoja": hoja,
        "nna": nna,
        "sesiones": sesiones,
        "avisos": avisos.lista(),
        "numerador": numerador,
        "denominador": len(nna),
        "columnasFecha": len(fec_cols),
    }
