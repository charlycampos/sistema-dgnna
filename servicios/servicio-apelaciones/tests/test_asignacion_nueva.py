import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from domain.services.asignacion_nueva import decidir_asignacion


class Evento:
    def __init__(self, abogadoId, complejidadId, folios):
        self.abogadoId, self.complejidadId, self.folios = abogadoId, complejidadId, folios
        self.esMayor500 = folios > 500


class AsignacionNuevaTests(unittest.TestCase):
    ids = ["karla", "karol", "clara"]

    def test_el_primer_registro_es_karla(self):
        self.assertEqual(decidir_asignacion(self.ids, [], "pas", 1)[0], "karla")

    def test_el_turno_cierra_el_primer_ciclo(self):
        eventos = [Evento("karla", "pas", 100), Evento("karol", "pas", 100)]
        self.assertEqual(decidir_asignacion(self.ids, eventos, "pas", 100, "karol")[0], "clara")

    def test_500_no_es_expediente_voluminoso(self):
        eventos = [Evento("karla", "pas", 600), Evento("karol", "pas", 600), Evento("clara", "pas", 600)]
        _, criterio = decidir_asignacion(self.ids, eventos, "upe", 500, "clara")
        self.assertNotIn("más de 500", criterio)


if __name__ == "__main__":
    unittest.main()
