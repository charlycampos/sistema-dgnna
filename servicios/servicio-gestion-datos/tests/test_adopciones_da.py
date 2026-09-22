import json
import unittest

import pandas as pd

from domain.services.adopciones_etl import _json_raw_cifrado
from domain.services.car_crypto import decrypt_text
from infrastructure.api.router_adopciones import (
    _aplicar_filtros_rpado,
    _es_adoptable,
)
from infrastructure.db.models import DaNnaAdopcionModel


class QuerySpy:
    def __init__(self):
        self.criterios = []

    def filter(self, criterio):
        self.criterios.append(str(criterio))
        return self


class AdopcionesDaTest(unittest.TestCase):
    def test_raw_da_se_guarda_cifrado_y_es_recuperable(self):
        fila = pd.Series({"Nombres": "PERSONA PRUEBA", "DNI": "12345678", "Edad": 10})

        contenido = _json_raw_cifrado(fila)

        self.assertTrue(contenido.startswith("enc:v1:"))
        self.assertNotIn("PERSONA PRUEBA", contenido)
        self.assertNotIn("12345678", contenido)
        recuperado = json.loads(decrypt_text(contenido.removeprefix("enc:v1:")))
        self.assertEqual(recuperado["Nombres"], "PERSONA PRUEBA")
        self.assertEqual(recuperado["DNI"], "12345678")

    def test_estado_adoptable_es_comparacion_exacta(self):
        expresion = str(_es_adoptable(DaNnaAdopcionModel.estado))

        self.assertNotIn("LIKE", expresion.upper())
        self.assertIn("=", expresion)

    def test_periodo_historico_rpado_no_exige_ultimo_corte(self):
        query = _aplicar_filtros_rpado(QuerySpy(), periodo="2026-05")

        criterios = " ".join(query.criterios).upper()
        self.assertIn("PERIODO_CORTE", criterios)
        self.assertNotIn("ES_ULTIMO_CORTE", criterios)

    def test_sin_periodo_rpado_usa_ultimo_corte(self):
        query = _aplicar_filtros_rpado(QuerySpy(), periodo=None)

        criterios = " ".join(query.criterios).upper()
        self.assertIn("ES_ULTIMO_CORTE", criterios)


if __name__ == "__main__":
    unittest.main()
