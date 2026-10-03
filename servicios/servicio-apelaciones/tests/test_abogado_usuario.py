import unittest

from domain.entities.abogado import Abogado
from domain.services.abogado_service import AbogadoService


class FakeAbogadoRepository:
    def __init__(self):
        self.items = {
            "a1": Abogado(id="a1", nombre="Karla Garcia"),
            "a2": Abogado(id="a2", nombre="Karol Castro"),
        }

    def listar(self, solo_activos=False):
        return [a for a in self.items.values() if not solo_activos or a.activo]

    def obtener_por_id(self, id):
        return self.items.get(id)

    def obtener_por_usuario_id(self, usuario_id):
        return next((a for a in self.items.values() if a.usuarioId == usuario_id), None)

    def guardar(self, abogado):
        self.items[abogado.id] = abogado
        return abogado

    def actualizar(self, abogado):
        self.items[abogado.id] = abogado
        return abogado

    def eliminar(self, id):
        self.items.pop(id, None)


class VinculacionUsuarioAbogadoTests(unittest.TestCase):
    def setUp(self):
        self.repo = FakeAbogadoRepository()
        self.service = AbogadoService(self.repo)

    def test_vincula_y_resuelve_abogado_por_usuario(self):
        vinculado = self.service.vincular_usuario("a1", "u1")
        self.assertEqual(vinculado.usuarioId, "u1")
        self.assertEqual(self.service.obtener_por_usuario("u1").id, "a1")

    def test_impide_vincular_mismo_usuario_dos_veces(self):
        self.service.vincular_usuario("a1", "u1")
        with self.assertRaisesRegex(ValueError, "ya está vinculado"):
            self.service.vincular_usuario("a2", "u1")

    def test_desvincular_no_elimina_abogado(self):
        self.service.vincular_usuario("a1", "u1")
        resultado = self.service.desvincular_usuario("a1")
        self.assertIsNone(resultado.usuarioId)
        self.assertEqual(self.service.obtener("a1").nombre, "Karla Garcia")


if __name__ == "__main__":
    unittest.main()
