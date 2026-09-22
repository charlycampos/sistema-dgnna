"""
Pruebas del ETL DSLD (DEMUNA y Supervisión).

- Pruebas unitarias con datos sintéticos (siempre se ejecutan).
- Prueba de referencia contra docs/DNA.mdb (se omite si el archivo o un lector
  de Access no están disponibles). Las cifras esperadas son las del Power BI
  DSLD_GENERAL_V3 con el DNA.mdb del 16/09/2026; si el Access se actualiza,
  ajuste REFERENCIA.

Ejecutar:  cd servicios/servicio-gestion-datos && python -m pytest tests -q
"""

import os
import shutil
import sys

import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.services.dsld_demuna_etl import (  # noqa: E402
    TABLAS_ACCESS,
    EtlValidacionError,
    transformar_dna,
)

RUTA_MDB = os.getenv(
    "DSLD_DNA_MDB_PRUEBA",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "DNA.mdb"),
)

REFERENCIA = {
    "demunas": 1892, "acreditadas": 869, "noAcreditadas": 853, "noOperativas": 170,
    "provinciales": 196, "distritales": 1696, "supervisiones": 10983,
    "sup2024": 736, "sup2025": 806, "sup2026": 548,
}


def _tablas_minimas(**cambios):
    tablas = {
        "dna": pd.DataFrame([
            {"codigo": "15001", "dna": "Defensoria Municipal de la Niña, Niño y Adolescente de Lima",
             "dpto": "Lima", "prov": "Lima", "dist": "Lima", "estado_acreditacion": "b",
             "ubigeo": "150101", "modelo": "01", "estado_registro": "9",
             "f_acreditacion": "2025-03-10 00:00:00"},
            {"codigo": "15002", "dna": "Defensoría Municipal de la Niña, Niño y Adolescente de Cañete",
             "dpto": "Lima", "prov": "Cañete", "dist": "San Vicente de Cañete", "estado_acreditacion": "a",
             "ubigeo": "150501", "modelo": "02", "estado_registro": "a", "f_acreditacion": None},
            {"codigo": "15003", "dna": "Defensoría Escolar", "dpto": "Lima", "prov": "Lima", "dist": "Lima",
             "estado_acreditacion": "a", "ubigeo": "150101", "modelo": "03", "estado_registro": "a",
             "f_acreditacion": None},
        ]),
        "supervisadas": pd.DataFrame([
            {"codigo": "1", "codigo_dna": "15001", "f_supervision": "2025-05-01 00:00:00", "tipo_supervisión": "1"},
            {"codigo": "2", "codigo_dna": "15003", "f_supervision": "2025-05-01 00:00:00", "tipo_supervisión": "2"},
        ]),
        "ubigeo": pd.DataFrame([
            {"ubigeo": "150000", "nombre": "Lima"}, {"ubigeo": "150100", "nombre": "Lima"},
            {"ubigeo": "150101", "nombre": "Lima"}, {"ubigeo": "150500", "nombre": "Cañete"},
            {"ubigeo": "150501", "nombre": "San Vicente de Cañete"}, {"ubigeo": "000000", "nombre": "Perú"},
        ]),
        "estadodna": pd.DataFrame([
            {"codigo": c, "estado": e} for c, e in
            [("a", "No operativa"), ("b", "Acreditada"), ("c", "No acreditada"), ("9", "No inscrita")]
        ]),
        "modelodna": pd.DataFrame([
            {"codigo": "01", "modelo": "Provincial", "siglas": "Provincial"},
            {"codigo": "02", "modelo": "Distrital", "siglas": "Distrital"},
            {"codigo": "03", "modelo": "Escolar", "siglas": "Escolar"},
        ]),
    }
    tablas.update(cambios)
    return tablas


def test_reglas_basicas():
    r = transformar_dna(_tablas_minimas())
    assert [d["codigo"] for d in r.demunas] == ["15001", "15002"]          # modelo 03 excluido
    assert r.demunas[0]["nombre"].startswith("Defensoría")                 # corrige tilde
    assert r.demunas[0]["nombre_corto"] == "DEMUNA de Lima"
    assert r.demunas[0]["anio_acreditacion"] == 2025
    assert [s["id"] for s in r.supervisiones] == [1]                       # supervisión de escolar excluida
    assert r.supervisiones[0]["tipo_supervision"] == 1
    ub = {u["ubigeo"]: u for u in r.ubigeos}
    assert "000000" not in ub
    assert ub["150101"]["departamento_mod"] == "LIMA METROPOLITANA"
    assert ub["150501"]["departamento_mod"] == "GORE LIMA"
    assert ub["150501"]["ccdd_analitico"] == "26"
    assert ub["150501"]["provincia"] == "CAÑETE"


def test_falta_tabla_requerida():
    tablas = _tablas_minimas()
    del tablas["supervisadas"]
    with pytest.raises(EtlValidacionError, match="supervisadas"):
        transformar_dna(tablas)


def test_estado_invalido_no_carga_nada():
    tablas = _tablas_minimas()
    tablas["dna"].loc[0, "estado_acreditacion"] = "x"
    with pytest.raises(EtlValidacionError, match="no es a/b/c"):
        transformar_dna(tablas)


def test_ubigeo_inexistente():
    tablas = _tablas_minimas()
    tablas["dna"].loc[1, "ubigeo"] = "999999"
    with pytest.raises(EtlValidacionError, match="ubigeo"):
        transformar_dna(tablas)


def test_sin_demunas_municipales():
    tablas = _tablas_minimas()
    tablas["dna"]["modelo"] = "03"
    with pytest.raises(EtlValidacionError):
        transformar_dna(tablas)


def _hay_lector_access() -> bool:
    import importlib.util
    return bool(shutil.which("mdb-export")) or importlib.util.find_spec("access_parser") is not None


@pytest.mark.skipif(
    not (os.path.isfile(RUTA_MDB) and _hay_lector_access()),
    reason="DNA.mdb o lector de Access no disponible",
)
def test_referencia_power_bi():
    from domain.services.dsld_access_reader import leer_tablas_access

    r = transformar_dna(leer_tablas_access(RUTA_MDB, TABLAS_ACCESS)).resumen()
    por_anio = r["supervisionesPorAnio"]
    obtenido = {
        "demunas": r["demunas"], "acreditadas": r["acreditadas"], "noAcreditadas": r["noAcreditadas"],
        "noOperativas": r["noOperativas"], "provinciales": r["provinciales"], "distritales": r["distritales"],
        "supervisiones": r["supervisiones"], "sup2024": por_anio.get(2024), "sup2025": por_anio.get(2025),
        "sup2026": por_anio.get(2026),
    }
    assert obtenido == REFERENCIA


@pytest.mark.skipif(not os.path.isfile(RUTA_MDB), reason="DNA.mdb no disponible")
def test_referencia_lector_python_sin_mdbtools():
    """El lector Python corregido (vendor) debe dar las mismas cifras que el Power BI."""
    from domain.services.dsld_access_reader import _leer_con_access_parser

    r = transformar_dna(_leer_con_access_parser(RUTA_MDB, TABLAS_ACCESS)).resumen()
    por_anio = r["supervisionesPorAnio"]
    assert (r["demunas"], r["acreditadas"], r["noAcreditadas"], r["noOperativas"]) == (
        REFERENCIA["demunas"], REFERENCIA["acreditadas"], REFERENCIA["noAcreditadas"], REFERENCIA["noOperativas"])
    assert r["supervisiones"] == REFERENCIA["supervisiones"]
    assert (por_anio.get(2024), por_anio.get(2025), por_anio.get(2026)) == (
        REFERENCIA["sup2024"], REFERENCIA["sup2025"], REFERENCIA["sup2026"])
