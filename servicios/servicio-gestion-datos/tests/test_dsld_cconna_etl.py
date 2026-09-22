"""
Pruebas del ETL DSLD · CCONNA.

- Pruebas con datos sintéticos (siempre se ejecutan).
- Referencia contra docs/CCONNA nominal jul2026.xlsx (se omite si no está).

Ejecutar:  cd servicios/servicio-gestion-datos && python -m pytest tests -q
"""

import os
import sys
from datetime import datetime

import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.services.dsld_cconna_etl import (  # noqa: E402
    COLUMNAS_EXCLUIDAS,
    COLUMNAS_INTEGRANTES,
    COLUMNAS_ORGANIZACIONES,
    REQUERIDAS_INTEGRANTES,
    REQUERIDAS_ORGANIZACIONES,
    TABLA_INTEGRANTES,
    TABLA_ORGANIZACIONES,
    EtlCconnaError,
    transformar_cconna,
)
from domain.services.dsld_excel_reader import leer_tablas_excel  # noqa: E402

RUTA_XLSX = os.getenv(
    "DSLD_CCONNA_PRUEBA",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "CCONNA nominal jul2026.xlsx"),
)
CATALOGO = {
    "150000": {"departamento": "LIMA", "provincia": None, "distrito": None},
    "150100": {"departamento": "LIMA", "provincia": "LIMA", "distrito": None},
    "150101": {"departamento": "LIMA", "provincia": "LIMA", "distrito": "LIMA"},
    "010200": {"departamento": "AMAZONAS", "provincia": "BAGUA", "distrito": None},
    "010202": {"departamento": "AMAZONAS", "provincia": "BAGUA", "distrito": "ARAMANGO"},
}


def _org(**c):
    base = {"N°": 1, "Ubigeo": "010202", "Departamento": "Amazonas", "Provincia": "Bagua", "Distrito": "Aramango",
            "Tipo de CCONNA": "CCONNA Distrital", "Nombre del CCONNA": "CCONNA Distrital Aramango",
            "Nº Ordenanza (O)": "Ordenanza N° 013-2016-MDA", "Fecha de la Ordenanza": datetime(2016, 12, 15),
            "Nº Resolución": None, "Fecha de  la Resolución": None, "Fecha del Acta de Conformación": None,
            "Fecha del Plan de Trabajo": None, "Base NOMINAL": "REGISTRA NNA",
            "REGISTRO MIMP NO/SI/OBSERVADO": "NO", "NUMERO DE OFICIO DSLD": None, "FECHA  REGISTRO": None,
            "Nombres del Especialista encargado del CCONNA": "Persona Ficticia",
            "Teléfono del Especialista encargado del CCONNA": "999888777"}
    base.update(c)
    return base


def _int(**c):
    base = {"DEPARTAMENTO": "Amazonas", "SEXO": "Mujer", "UBIGEO DISTRITAL": "010202",
            "CCONNA DISTRITAL (participación)": "Integrante CCONNA", "UBIGEO PROVINCIAL": None,
            "CCONNA PROVINCIAL (participación)": None, "UBIGEO REGIONAL": None,
            "CCONNA REGIONAL (participación)": None, "CCONNA NACIONAL (participación)": None,
            "NOMBRES DEL NNA": "Nombre Ficticio", "NÚMERO DE DOCUMENTO": "87654321"}
    base.update(c)
    return base


def _tablas(org=None, integrantes=None):
    return {
        TABLA_ORGANIZACIONES: pd.DataFrame(org if org is not None else [
            _org(),
            _org(**{"N°": 2, "Ubigeo": "010200", "Tipo de CCONNA": "CCONNA Provincial",
                    "Nombre del CCONNA": "CCONNA Provincial Bagua", "REGISTRO MIMP NO/SI/OBSERVADO": "SI",
                    "Fecha del Acta de Conformación": datetime(2025, 5, 4)}),
            _org(**{"N°": 3, "Ubigeo": 260000, "Tipo de CCONNA": "CCONNA Regional", "Departamento": "Lima",
                    "Provincia": None, "Distrito": None, "Nombre del CCONNA": "CCONNA Regional Lima"}),
        ], dtype=object),
        TABLA_INTEGRANTES: pd.DataFrame(integrantes if integrantes is not None else [
            _int(),
            _int(SEXO="Hombre"),
            _int(SEXO="Hombre", **{"CCONNA DISTRITAL (participación)": "Ex CCONNA"}),
            _int(**{"UBIGEO PROVINCIAL": "010200", "CCONNA PROVINCIAL (participación)": "Coordinador/a General"}),
            _int(**{"UBIGEO DISTRITAL": None, "CCONNA DISTRITAL (participación)": None,
                    "UBIGEO REGIONAL": "260000", "CCONNA REGIONAL (participación)": "Integrante CCONNA"}),
        ], dtype=object),
    }


def test_reglas_basicas():
    r = transformar_cconna(_tablas(), CATALOGO)
    o = {x["ubigeo"]: x for x in r.organizaciones}
    assert set(o) == {"010202", "010200", "260000"}
    assert o["010202"]["nivel"] == "DISTRITAL" and o["010202"]["distrito"] == "ARAMANGO"
    assert o["010200"]["nivel"] == "PROVINCIAL" and o["010200"]["ubigeo_prov"] == "0102"
    assert o["010200"]["anio_conformacion"] == 2025 and o["010200"]["registro_mimp"] == "SI"
    assert o["260000"]["nivel"] == "REGIONAL" and o["260000"]["departamento_mod"] == "GORE LIMA"
    assert o["010202"]["anio_conformacion"] == 2016     # sin acta, usa la ordenanza
    res = r.resumen()
    assert (res["organizaciones"], res["distritales"], res["provinciales"], res["regionales"]) == (3, 1, 1, 1)
    assert (res["integrantes"], res["mujeres"], res["hombres"]) == (3, 2, 1)   # sin el "Ex CCONNA"
    assert res["exIntegrantes"] == 1
    assert res["integrantesPorNivel"]["PROVINCIAL"] == 1 and res["integrantesPorNivel"]["REGIONAL"] == 1


def test_integrantes_solo_conteos_sin_datos_personales():
    r = transformar_cconna(_tablas(), CATALOGO)
    claves = set().union(*(x.keys() for x in r.integrantes))
    assert claves == {"nivel", "ubigeo", "ccdd", "ubigeo_prov", "departamento", "provincia", "distrito",
                      "departamento_mod", "sexo", "condicion", "cantidad"}
    texto = " ".join(str(v) for x in r.integrantes + r.organizaciones for v in x.values())
    assert "Ficticio" not in texto and "87654321" not in texto and "999888777" not in texto
    assert not set(COLUMNAS_ORGANIZACIONES + COLUMNAS_INTEGRANTES) & set(COLUMNAS_EXCLUIDAS)
    # Se cuenta una participación por nivel: 5 NNA, una de ellas también en el CCONNA provincial
    assert sum(x["cantidad"] for x in r.integrantes) == 6


def test_falta_tabla():
    t = _tablas()
    del t[TABLA_INTEGRANTES]
    with pytest.raises(EtlCconnaError, match=TABLA_INTEGRANTES):
        transformar_cconna(t)


def test_errores_no_cargan_nada():
    org = [_org(), _org(**{"N°": 2, "Tipo de CCONNA": "CCONNA Vecinal"}),
           _org(**{"N°": 3, "Ubigeo": "abc"}), _org(**{"N°": 4, "Nombre del CCONNA": None})]
    with pytest.raises(EtlCconnaError) as e:
        transformar_cconna(_tablas(org=org), CATALOGO)
    msg = str(e.value)
    assert "3 fila(s)" in msg and "CCONNA Vecinal" in msg and "repetido" not in msg


def test_ubigeo_repetido():
    with pytest.raises(EtlCconnaError, match="repetido"):
        transformar_cconna(_tablas(org=[_org(), _org(**{"N°": 2})]), CATALOGO)


@pytest.mark.skipif(not os.path.isfile(RUTA_XLSX), reason="CCONNA nominal jul2026.xlsx no disponible")
def test_referencia_power_bi():
    tablas = leer_tablas_excel(RUTA_XLSX, {
        TABLA_ORGANIZACIONES: (COLUMNAS_ORGANIZACIONES, REQUERIDAS_ORGANIZACIONES),
        TABLA_INTEGRANTES: (COLUMNAS_INTEGRANTES, REQUERIDAS_INTEGRANTES),
    })
    for df in tablas.values():
        assert not set(df.columns) & set(COLUMNAS_EXCLUIDAS)
    r = transformar_cconna(tablas).resumen()
    assert (r["organizaciones"], r["distritales"], r["provinciales"], r["regionales"]) == (1063, 890, 147, 26)
    assert (r["integrantes"], r["mujeres"], r["hombres"]) == (6048, 3216, 2832)
    assert r["registradosMimp"] == 188
