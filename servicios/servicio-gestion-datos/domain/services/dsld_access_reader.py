"""
Lector de bases Microsoft Access (.mdb / .accdb) para la suite DSLD.

Estrategia:
  1. mdbtools (`mdb-export`), si está instalado en la imagen.
  2. Si no, `infrastructure/vendor/access_parser_dgnna`: copia corregida de
     access-parser (Python puro, sin dependencias del sistema). Validada contra
     mdbtools con el DNA.mdb de la DSLD: resultados idénticos campo por campo.
     Es el lector por defecto en la red del MIMP, que bloquea los repositorios apt.

Devuelve DataFrames con todas las columnas como texto (None si está vacío).
Las fechas se normalizan a 'YYYY-MM-DD HH:MM:SS'.
"""

from __future__ import annotations

import io
import os
import shutil
import subprocess
from datetime import date, datetime
from typing import Dict, Iterable

import pandas as pd

FORMATO_FECHA = "%Y-%m-%d %H:%M:%S"


class AccessLecturaError(Exception):
    """No se pudo leer el archivo Access o falta una tabla requerida."""


def _entorno_utf8() -> dict:
    env = dict(os.environ)
    env["LC_ALL"] = "C.UTF-8"
    env["LANG"] = "C.UTF-8"
    return env


def _leer_con_mdbtools(ruta: str, tablas: Iterable[str]) -> Dict[str, pd.DataFrame]:
    env = _entorno_utf8()
    disponibles = subprocess.run(
        ["mdb-tables", "-1", ruta], capture_output=True, text=True, env=env, timeout=60
    )
    if disponibles.returncode != 0:
        raise AccessLecturaError(f"mdbtools no pudo abrir el archivo: {disponibles.stderr.strip()}")
    existentes = {t.strip() for t in disponibles.stdout.splitlines() if t.strip()}

    resultado: Dict[str, pd.DataFrame] = {}
    for tabla in tablas:
        if tabla not in existentes:
            continue
        proc = subprocess.run(
            ["mdb-export", "-D", "%Y-%m-%d 00:00:00", "-T", FORMATO_FECHA, ruta, tabla],
            capture_output=True, env=env, timeout=300,
        )
        if proc.returncode != 0:
            raise AccessLecturaError(
                f"Error exportando la tabla '{tabla}': {proc.stderr.decode('utf-8', 'replace').strip()}"
            )
        df = pd.read_csv(io.BytesIO(proc.stdout), dtype=str, keep_default_na=False, encoding="utf-8")
        resultado[tabla] = df.replace({"": None})
    return resultado


def _valor_texto(v):
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.strftime(FORMATO_FECHA)
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    s = str(v)
    return s if s != "" else None


def _leer_con_access_parser(ruta: str, tablas: Iterable[str]) -> Dict[str, pd.DataFrame]:
    import logging
    from infrastructure.vendor.access_parser_dgnna import AccessParser

    # La librería registra advertencias por cada campo memo irrecuperable; no son errores de carga.
    logging.getLogger("access_parser").setLevel(logging.ERROR)

    try:
        parser = AccessParser(ruta)
    except Exception as exc:
        raise AccessLecturaError(f"No se pudo abrir el archivo como base Access (.mdb/.accdb): {exc}") from exc

    catalogo = set(parser.catalog.keys())
    resultado: Dict[str, pd.DataFrame] = {}
    for tabla in tablas:
        if tabla not in catalogo:
            continue
        try:
            datos = parser.parse_table(tabla)
        except Exception as exc:
            raise AccessLecturaError(f"Error leyendo la tabla '{tabla}': {exc}") from exc
        df = pd.DataFrame({col: [_valor_texto(v) for v in vals] for col, vals in datos.items()})
        resultado[tabla] = df
    return resultado


def leer_tablas_access(ruta: str, tablas: Iterable[str]) -> Dict[str, pd.DataFrame]:
    """Lee las tablas indicadas. Las que no existen simplemente no aparecen en el resultado."""
    if not os.path.isfile(ruta):
        raise AccessLecturaError(f"No existe el archivo '{ruta}'.")
    tablas = list(tablas)
    if shutil.which("mdb-export") and shutil.which("mdb-tables"):
        return _leer_con_mdbtools(ruta, tablas)
    return _leer_con_access_parser(ruta, tablas)
