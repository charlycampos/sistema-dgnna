"""
Lector de tablas de Excel (Insertar → Tabla) para la suite DSLD.

El Power BI lee las tablas con nombre (p. ej. TB_MODO_NINEZ_2026), no las hojas,
porque la hoja puede tener notas o columnas auxiliares fuera de la tabla.

Lectura en modo streaming (openpyxl read_only) para no superar la memoria del
contenedor (mem_limit): la ubicación de cada tabla se obtiene de los XML del
.xlsx (xl/tables/*.xml) y luego solo se recorren sus filas y columnas pedidas.
El modo normal de openpyxl cargaba el libro completo (≈400 MB con el Excel PIAS).

`columnas` limita lo que se devuelve: las demás columnas del Excel (por ejemplo
nombres, DNI o teléfonos) no se copian al DataFrame y nunca llegan a la base.
"""

from __future__ import annotations

import io
import posixpath
import unicodedata
import zipfile
from typing import Dict, Iterable, List, Optional, Tuple, Union
from xml.etree import ElementTree as ET

import pandas as pd
from openpyxl import load_workbook
from openpyxl.utils.cell import range_boundaries

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL_DOC = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
NS_REL_PKG = "{http://schemas.openxmlformats.org/package/2006/relationships}"


class ExcelLecturaError(Exception):
    """El archivo no es un Excel válido o no contiene la tabla esperada."""


def _limpiar_encabezado(v) -> str:
    if v is None:
        return ""
    return unicodedata.normalize("NFC", " ".join(str(v).split()))


def _ruta_rels(ruta: str) -> str:
    carpeta, nombre = posixpath.split(ruta)
    return posixpath.join(carpeta, "_rels", nombre + ".rels")


def _destino(base: str, destino: str) -> str:
    if destino.startswith("/"):
        return destino.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(base), destino))


def _relaciones(zf: zipfile.ZipFile, ruta: str) -> Dict[str, str]:
    rels = _ruta_rels(ruta)
    if rels not in zf.namelist():
        return {}
    raiz = ET.fromstring(zf.read(rels))
    return {r.get("Id"): _destino(ruta, r.get("Target", "")) for r in raiz.iter(f"{NS_REL_PKG}Relationship")}


def _ubicar_tablas(zf: zipfile.ZipFile) -> Dict[str, Tuple[str, str]]:
    """{nombre_tabla_en_minúsculas: (nombre_hoja, rango)} leyendo solo los XML de estructura."""
    libro = "xl/workbook.xml"
    rels_libro = _relaciones(zf, libro)
    hojas: Dict[str, str] = {}  # ruta de la hoja → nombre visible
    for h in ET.fromstring(zf.read(libro)).iter(f"{NS_MAIN}sheet"):
        ruta = rels_libro.get(h.get(f"{NS_REL_DOC}id"))
        if ruta:
            hojas[ruta] = h.get("name")

    tablas: Dict[str, Tuple[str, str]] = {}
    for ruta_hoja, nombre_hoja in hojas.items():
        if ruta_hoja not in zf.namelist():
            continue
        rels = _relaciones(zf, ruta_hoja)
        if not rels:
            continue
        # Solo el bloque <tableParts> de la hoja (se busca al final para no parsear toda la hoja)
        for rid, destino in rels.items():
            if "/tables/" not in destino or destino not in zf.namelist():
                continue
            t = ET.fromstring(zf.read(destino))
            nombre = t.get("displayName") or t.get("name")
            if nombre and t.get("ref"):
                tablas[nombre.lower()] = (nombre_hoja, t.get("ref"))
    return tablas


def leer_tablas_excel(
    origen: Union[str, bytes],
    tablas: Dict[str, Tuple[Optional[Iterable[str]], Optional[Iterable[str]]]],
) -> Dict[str, pd.DataFrame]:
    """
    Lee varias tablas de Excel. `tablas` = {nombre_tabla: (columnas, columnas_requeridas)}.
    Las tablas que no existen no aparecen en el resultado (el llamador decide si es un error).
    Los encabezados se comparan sin espacios sobrantes ("Tipo de CCONNA " = "Tipo de CCONNA").
    """
    datos_archivo = origen if isinstance(origen, (bytes, bytearray)) else None
    try:
        with zipfile.ZipFile(io.BytesIO(datos_archivo) if datos_archivo is not None else origen) as zf:
            ubicaciones = _ubicar_tablas(zf)
        fuente = io.BytesIO(datos_archivo) if datos_archivo is not None else origen
        wb = load_workbook(fuente, read_only=True, data_only=True)
    except Exception as exc:
        raise ExcelLecturaError(f"No se pudo abrir el archivo como Excel (.xlsx): {exc}") from exc

    resultado: Dict[str, pd.DataFrame] = {}
    try:
        for clave, (columnas, requeridas) in tablas.items():
            ubic = ubicaciones.get(clave.lower())
            if not ubic:
                continue
            nombre_hoja, ref = ubic
            min_col, min_row, max_col, max_row = range_boundaries(ref)
            filas = wb[nombre_hoja].iter_rows(
                min_row=min_row, max_row=max_row, min_col=min_col, max_col=max_col, values_only=True
            )
            encabezados = [_limpiar_encabezado(v) for v in next(filas, ())]
            encabezados += [""] * (max_col - min_col + 1 - len(encabezados))
            pedidas = None if columnas is None else {_limpiar_encabezado(c) for c in columnas}
            indices = [i for i, h in enumerate(encabezados) if h and (pedidas is None or h in pedidas)]

            faltan = [c for c in (requeridas or []) if _limpiar_encabezado(c) not in {encabezados[i] for i in indices}]
            if faltan:
                raise ExcelLecturaError(f"La tabla '{clave}' no tiene las columnas: {', '.join(faltan)}.")

            registros: List[list] = []
            for fila in filas:
                valores = [fila[i] if i < len(fila) else None for i in indices]
                if any(v is not None and v != "" for v in valores):  # omite filas vacías
                    registros.append(valores)
            resultado[clave] = pd.DataFrame(registros, columns=[encabezados[i] for i in indices], dtype=object)
    finally:
        wb.close()
    return resultado


def leer_tabla_excel(
    origen: Union[str, bytes],
    nombre_tabla: str,
    columnas: Optional[Iterable[str]] = None,
    columnas_requeridas: Optional[Iterable[str]] = None,
) -> pd.DataFrame:
    """Devuelve la tabla `nombre_tabla` como DataFrame (valores tal como están en Excel)."""
    tablas = leer_tablas_excel(origen, {nombre_tabla: (columnas, columnas_requeridas)})
    if nombre_tabla not in tablas:
        raise ExcelLecturaError(
            f"El archivo no contiene la tabla de Excel '{nombre_tabla}'. "
            f"Verifique que sea el archivo correcto y que la tabla conserve ese nombre."
        )
    return tablas[nombre_tabla]
