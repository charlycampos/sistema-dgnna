"""
Pruebas del ETL DSLD · Capacitación.

- Pruebas con datos sintéticos (siempre se ejecutan).
- Referencia contra docs/CAPACITACION_20214-2026 NOMINAL.xlsx (se omite si no está).

Ejecutar:  cd servicios/servicio-gestion-datos && python -m pytest tests -q
"""

import os
import sys
from datetime import datetime

import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.services.dsld_capacitacion_etl import (  # noqa: E402
    COLUMNAS_EXCLUIDAS,
    COLUMNAS_REQUERIDAS,
    COLUMNAS_USADAS,
    TABLA_EXCEL,
    ClaveSeudonimoError,
    EtlCapacitacionError,
    seudonimo,
    transformar_capacitacion,
    validar_clave,
)
from domain.services.dsld_excel_reader import leer_tabla_excel  # noqa: E402

RUTA_XLSX = os.getenv(
    "DSLD_CAPACITACION_PRUEBA",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "CAPACITACION_20214-2026 NOMINAL.xlsx"),
)
CLAVE = b"clave-de-prueba-0123456789"
PADRON = {"15001": "150101", "01004": "010201"}
CATALOGO = {
    "150000": {"departamento": "LIMA", "provincia": None, "distrito": None},
    "150101": {"departamento": "LIMA", "provincia": "LIMA", "distrito": "LIMA"},
    "010000": {"departamento": "AMAZONAS", "provincia": None, "distrito": None},
    "010201": {"departamento": "AMAZONAS", "provincia": "BAGUA", "distrito": "BAGUA"},
    "080000": {"departamento": "CUSCO", "provincia": None, "distrito": None},
}


def _fila(**c):
    base = {"AÑO": 2025, "CÓDIGO": "15001", "DEPARTAMENTO": "Lima", "CURSO": "Formación de Defensores/as",
            "SIGLAS": "FDD", "SEDE DE CAPACITACIÓN": "Lima", "TIPO DE CAPACITACIÓN": "Virtual",
            "FECHA INICIO CURSO": datetime(2025, 3, 1), "FECHA CULMINA CURSO": datetime(2025, 4, 1),
            "TIPO ASISTENTE": "DEMUNA ", "SEXO": "Mujer", "DNI": "01234567", "Estado de aprobación": "APROBADO",
            "NOMBRES DEL DEFENSOR/A": "Nombre Ficticio", "TELÉFONO/CELULAR": "999888777", "NOTA": 18}
    base.update(c)
    return base


def _df(filas):
    return pd.DataFrame(filas, dtype=object)


def test_reglas_basicas():
    df = _df([
        _fila(),
        _fila(DNI=1234567.0, **{"CÓDIGO": 1004, "TIPO DE CAPACITACIÓN": "presencial", "SEXO": "MASCULINO",
                                "FECHA INICIO CURSO": datetime(2026, 2, 1)}),       # mismo DNI sin cero
        _fila(DNI=None, **{"Estado de aprobación": "aprobado"}),
        _fila(DNI="76543210", **{"Estado de aprobación": "DESAPROBADO"}),
        _fila(**{"CÓDIGO": None, "DEPARTAMENTO": "Cusco ", "FECHA CULMINA CURSO": "31/02/2025",
                 "TIPO ASISTENTE": "INVITADA/O"}),
    ])
    r = transformar_capacitacion(df, CLAVE, PADRON, CATALOGO)
    p = r.participaciones
    assert p[0]["ubigeo"] == "150101" and p[0]["departamento_mod"] == "LIMA METROPOLITANA"
    assert p[0]["persona_id"] == p[1]["persona_id"] == seudonimo(CLAVE, "01234567")
    assert p[1]["codigo_demuna"] == "01004" and p[1]["tipo_capacitacion"] == "PRESENCIAL" and p[1]["sexo"] == "H"
    assert p[1]["anio"] == 2026 and p[1]["ccdd"] == "01"
    assert p[2]["estado"] == "APROBADO" and p[2]["persona_id"] is None
    assert p[4]["ubigeo"] is None and p[4]["departamento"] == "CUSCO" and p[4]["ccdd"] == "08"
    assert p[4]["fecha_fin"] is None and p[4]["tipo_asistente"] == "INVITADO"
    res = r.resumen()
    assert (res["registros"], res["aprobados"], res["personasConDni"], res["personasDistintas"]) == (5, 4, 3, 1)
    assert any("sin CÓDIGO" in a for a in res["advertencias"])
    assert any("FECHA CULMINA" in a for a in res["advertencias"])


def test_no_guarda_dni_ni_datos_personales():
    r = transformar_capacitacion(_df([_fila()]), CLAVE, PADRON, CATALOGO)
    registro = r.participaciones[0]
    assert "dni" not in {k.lower() for k in registro}
    texto = " ".join(str(v) for v in registro.values())
    assert "01234567" not in texto and "1234567" not in texto
    assert "Ficticio" not in texto and "999888777" not in texto
    assert not set(COLUMNAS_USADAS) & set(COLUMNAS_EXCLUIDAS)


def test_seudonimo_depende_de_la_clave():
    a = transformar_capacitacion(_df([_fila()]), CLAVE).participaciones[0]["persona_id"]
    b = transformar_capacitacion(_df([_fila()]), b"otra-clave-distinta-9876").participaciones[0]["persona_id"]
    assert a != b and len(a) == 64


def test_clave_obligatoria():
    for valor in (None, "", "corta"):
        with pytest.raises(ClaveSeudonimoError):
            validar_clave(valor)
    assert validar_clave("x" * 16) == b"x" * 16


def test_errores_no_cargan_nada():
    df = _df([_fila(**{"FECHA INICIO CURSO": None}), _fila(**{"Estado de aprobación": None}), _fila()])
    with pytest.raises(EtlCapacitacionError) as e:
        transformar_capacitacion(df, CLAVE)
    assert "2 fila(s)" in str(e.value)


def test_falta_columna():
    with pytest.raises(EtlCapacitacionError, match="DNI"):
        transformar_capacitacion(_df([_fila()]).drop(columns=["DNI"]), CLAVE)


@pytest.mark.skipif(not os.path.isfile(RUTA_XLSX), reason="CAPACITACION_20214-2026 NOMINAL.xlsx no disponible")
def test_referencia_power_bi():
    df = leer_tabla_excel(RUTA_XLSX, TABLA_EXCEL, COLUMNAS_USADAS, COLUMNAS_REQUERIDAS)
    assert not set(df.columns) & set(COLUMNAS_EXCLUIDAS)
    r = transformar_capacitacion(df, CLAVE).resumen()
    # Power BI: 27,444 APROBADO (una fila escrita "aprobado" solo cuenta aquí)
    assert (r["registros"], r["aprobados"]) == (31494, 27445)
    assert (r["personasConDni"], r["personasDistintas"]) == (25341, 12803)
    assert (r["virtual"], r["presencial"]) == (18367, 9078)
    assert r["ultimaFecha"] == "2026-06-22"
