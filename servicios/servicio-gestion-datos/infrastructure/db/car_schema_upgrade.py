"""
Ampliación idempotente de CAR_NNA_CORTES con las variables de los indicadores
priorizados PP0117 (4397 / 4398).

`Base.metadata.create_all` no agrega columnas a tablas existentes, por eso al
arrancar el servicio se verifica y se agregan solo las columnas faltantes.
El mismo DDL está en `car_01_indicadores_priorizados.sql` para ejecución manual.
"""

import logging
from sqlalchemy import inspect, text

logger = logging.getLogger("car_schema_upgrade")

COLUMNAS_INDICADORES = {
    "res_eva_tem": "VARCHAR2(50)",
    "nna_prom": "VARCHAR2(20)",
    "nna_est": "VARCHAR2(20)",
    "tip_act_soc_1": "VARCHAR2(100)",
    "tip_act_soc_2": "VARCHAR2(100)",
    "fec_apr_est": "DATE",
    "pti_consensuado": "VARCHAR2(20)",
    "plan_vida_ind": "VARCHAR2(20)",
    "fec_vid_ind": "DATE",
    "por_cum_met": "NUMBER(10)",
    "rango_6_meses": "VARCHAR2(50)",
}


def asegurar_columnas_indicadores(engine) -> list:
    """Agrega a car_nna_cortes las columnas faltantes. Devuelve las agregadas."""
    agregadas = []
    try:
        inspector = inspect(engine)
        if not inspector.has_table("car_nna_cortes"):
            return agregadas
        existentes = {c["name"].lower() for c in inspector.get_columns("car_nna_cortes")}
        with engine.begin() as conn:
            for columna, tipo in COLUMNAS_INDICADORES.items():
                if columna not in existentes:
                    conn.execute(text(f"ALTER TABLE car_nna_cortes ADD ({columna} {tipo})"))
                    agregadas.append(columna)
        if agregadas:
            logger.info("car_nna_cortes: columnas agregadas %s", agregadas)
    except Exception as exc:  # no bloquear el arranque del servicio
        logger.error("No se pudo ampliar car_nna_cortes: %s", exc)
    return agregadas
