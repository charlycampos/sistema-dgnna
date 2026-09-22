"""
Pruebas del ETL DSLD · PIAS.

- Pruebas con datos sintéticos (siempre se ejecutan).
- Referencia contra docs/PIAS_PBI_AUTORIDADES_PADRES.xlsx (se omite si no está).
  Cifras esperadas = medidas MEDIDADS_PIAS del Power BI con el archivo al 24/07/2026.

Ejecutar:  cd servicios/servicio-gestion-datos && python -m pytest tests -q
"""

import os
import sys
from datetime import datetime

import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.services.dsld_excel_reader import leer_tablas_excel  # noqa: E402
from domain.services.dsld_pias_etl import (  # noqa: E402
    COLUMNAS_EXCLUIDAS,
    TABLAS,
    EtlPiasError,
    columnas_requeridas,
    columnas_tabla,
    transformar_pias,
)

RUTA_XLSX = os.getenv(
    "DSLD_PIAS_PRUEBA",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "PIAS_PBI_AUTORIDADES_PADRES.xlsx"),
)

F = datetime(2026, 4, 10)


def _tablas(**cambios):
    base = {
        "TB_PIAS_AUTORIDADES": pd.DataFrame([
            {"PERIODO": "ABRIL", "UBIGEO": 160403, "DEPAR_CA": "LORETO", "PROVIN_CA": "RAMON CASTILLA",
             "DISTR_CA": "YAVARÍ", "CCPP_CA": "Comunidad Uno", "AREA_RES_CA": "RURAL", "T_mod": "Presencial",
             "NOM_CA": "Yavarí", "SEXO_AUT": "H", "FEC_EPE": F, "Num_ses": 1,
             "NOM_AUT": "Persona Ficticia", "NRO_DOC_AUT": "00000000", "CELULAR": "999999999"},
        ]),
        "TB_PIAS_PADRES": pd.DataFrame([
            {"PERIODO": "MAYO", "UBIGEO": "250201", "DEPAR_CA": "UCAYALI", "PROVIN_CA": "ATALAYA",
             "DISTR_CA": "RAIMONDI", "CCPP_CA": "Comunidad Dos", "AR_LA": "Rural", "T_mod": None,
             "NOM_CA": "Ucayali I (Ucayali)", "SEXO_PoM": "M", "FEC_EPE": datetime(2026, 5, 2), "Num_ses": 2},
            {"PERIODO": "MAYO", "UBIGEO": "250201", "DEPAR_CA": "UCAYALI", "PROVIN_CA": "ATALAYA",
             "DISTR_CA": "RAIMONDI", "CCPP_CA": "Comunidad Dos", "AR_LA": "Rural", "T_mod": None,
             "NOM_CA": "UCAYALI I (UCAYALI)", "SEXO_PoM": " m", "FEC_EPE": datetime(2026, 5, 3), "Num_ses": 1},
        ]),
        "TB_PIAS_NNA": pd.DataFrame([
            {"PERIODO": "JULIO", "TIP_INT": "Remoto", "UBIGEO": "250251", "DEPAR_CA": "Ucayali",
             "PROVIN_CA": "Atalaya", "DISTR_CA": "Tahuanía", "CCPP_CA": "NUEVA ITALIA", "AREA_RES_CA": "NUEVA ITALIA",
             "NOM_CA": "Ucayali I (Ucayali)", "SEXO_NNA": "X", "FEC_INI_ACT_FOR": datetime(2026, 7, 24), "Num_ses": 0,
             "NOM_NNA": "Nombre Ficticio", "FEC_NAC_NNA": datetime(2015, 1, 1)},
        ]),
    }
    base.update(cambios)
    return base


CATALOGO = {
    "160403": {"departamento": "LORETO", "provincia": "MARISCAL RAMÓN CASTILLA", "distrito": "YAVARI"},
    "250201": {"departamento": "UCAYALI", "provincia": "ATALAYA", "distrito": "RAYMONDI"},
}


def test_reglas_basicas():
    r = transformar_pias(_tablas(), CATALOGO)
    res = r.resumen()
    assert (res["atenciones"], res["autoridades"], res["padres"], res["nna"]) == (4, 1, 2, 1)
    assert (res["mujeres"], res["hombres"]) == (2, 1)
    assert res["ultimaFecha"] == "2026-07-24"
    a = {x["tipo_persona"]: x for x in r.atenciones}
    assert a["AUTORIDAD"]["ubigeo"] == "160403" and a["AUTORIDAD"]["distrito"] == "YAVARI"   # nombre del catálogo
    assert a["AUTORIDAD"]["provincia"] == "MARISCAL RAMÓN CASTILLA"
    assert a["NNA"]["distrito"] == "TAHUANIA"                     # fuera del catálogo: nombre del Excel
    assert a["NNA"]["mes"] == 7 and a["NNA"]["modalidad"] == "REMOTO"
    assert a["NNA"]["area_residencia"] is None                     # "NUEVA ITALIA" no es un área
    assert a["NNA"]["sexo"] is None
    assert {x["cuenca"] for x in r.atenciones} == {"Yavarí", "Ucayali I (Ucayali)"}   # mayúsculas unificadas
    assert any("250251 (1)" in w for w in r.advertencias)
    assert any("sin sexo" in w for w in r.advertencias)


def test_no_guarda_datos_personales():
    r = transformar_pias(_tablas(), CATALOGO)
    claves = set().union(*(x.keys() for x in r.atenciones))
    assert claves == {"tipo_persona", "fecha_atencion", "anio", "mes", "ubigeo", "departamento", "provincia",
                      "distrito", "departamento_mod", "centro_poblado", "area_residencia", "cuenca",
                      "modalidad", "sexo", "num_sesiones"}
    valores = " ".join(str(v) for x in r.atenciones for v in x.values())
    assert "Fictici" not in valores and "00000000" not in valores and "999999999" not in valores


def test_columnas_leidas_no_incluyen_personales():
    for t in TABLAS:
        assert not set(columnas_tabla(t)) & set(COLUMNAS_EXCLUIDAS)


def test_falta_tabla():
    tablas = _tablas()
    del tablas["TB_PIAS_NNA"]
    with pytest.raises(EtlPiasError, match="TB_PIAS_NNA"):
        transformar_pias(tablas)


def test_errores_no_cargan_nada():
    nna = _tablas()["TB_PIAS_NNA"].copy()
    nna.loc[0, "FEC_INI_ACT_FOR"] = None
    padres = _tablas()["TB_PIAS_PADRES"].copy()
    padres.loc[0, "UBIGEO"] = "25A"
    with pytest.raises(EtlPiasError) as e:
        transformar_pias(_tablas(TB_PIAS_NNA=nna, TB_PIAS_PADRES=padres))
    assert "2 fila(s)" in str(e.value) and "FEC_INI_ACT_FOR" in str(e.value)


def test_falta_columna():
    nna = _tablas()["TB_PIAS_NNA"].drop(columns=["SEXO_NNA"])
    with pytest.raises(EtlPiasError, match="SEXO_NNA"):
        transformar_pias(_tablas(TB_PIAS_NNA=nna))


@pytest.mark.skipif(not os.path.isfile(RUTA_XLSX), reason="PIAS_PBI_AUTORIDADES_PADRES.xlsx no disponible")
def test_referencia_power_bi():
    tablas = leer_tablas_excel(RUTA_XLSX, {t: (columnas_tabla(t), columnas_requeridas(t)) for t in TABLAS})
    for t, df in tablas.items():
        assert not set(df.columns) & set(COLUMNAS_EXCLUIDAS), t
    r = transformar_pias(tablas).resumen()
    assert (r["atenciones"], r["nna"], r["padres"], r["autoridades"]) == (17402, 10544, 5674, 1184)
    assert (r["mujeres"], r["hombres"]) == (9184, 8218)
    assert r["ultimaFecha"] == "2026-07-24"
