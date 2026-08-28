import sys
import unittest
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from domain.entities.usuario import Usuario, UsuarioModulo
from domain.services.auth_service import AuthService


class RepositorioUsuariosEnMemoria:
    def __init__(self, usuarios):
        self._usuarios = {usuario.email: usuario for usuario in usuarios}

    def obtener_por_email(self, email):
        return self._usuarios.get(email)


class AuthServiceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password = "PasswordSegura123!"
        cls.password_hash = AuthService.hash_password(cls.password)

    def login(self, usuario):
        service = AuthService(RepositorioUsuariosEnMemoria([usuario]))
        resultado = service.login(usuario.email.upper(), self.password)
        payload = service.verificar_token(resultado["access_token"])
        self.assertIsNotNone(payload)
        return resultado, payload

    def crear_usuario(self, *, rol="usuario", activo=True, modulos=None):
        usuario = Usuario(
            nombre="Usuario de prueba",
            email="usuario@dgnna.gob.pe",
            passwordHash=self.password_hash,
            rol=rol,
            activo=activo,
        )
        usuario.modulos = [
            UsuarioModulo(
                usuarioId=usuario.id,
                modulo=modulo,
                rolModulo=rol_modulo,
            )
            for modulo, rol_modulo in (modulos or [])
        ]
        return usuario

    def test_admin_conserva_rol_global_admin(self):
        resultado, payload = self.login(self.crear_usuario(rol="admin"))

        self.assertEqual("admin", resultado["rol"])
        self.assertEqual("admin", payload["rol"])

    def test_directora_de_modulo_sigue_siendo_usuario_global(self):
        usuario = self.crear_usuario(
            modulos=[("apelaciones", "directora")],
        )
        resultado, payload = self.login(usuario)

        self.assertEqual("usuario", resultado["rol"])
        self.assertEqual("usuario", payload["rol"])
        self.assertEqual(
            [{"modulo": "apelaciones", "rolModulo": "directora"}],
            payload["modulos"],
        )

    def test_registrador_conserva_modulo_sin_elevar_rol_global(self):
        usuario = self.crear_usuario(
            modulos=[("sustraccion", "registrador")],
        )
        _, payload = self.login(usuario)

        self.assertEqual("usuario", payload["rol"])
        self.assertEqual(
            [{"modulo": "sustraccion", "rolModulo": "registrador"}],
            payload["modulos"],
        )

    def test_rol_legacy_director_se_normaliza_como_modulo_de_lectura(self):
        _, payload = self.login(self.crear_usuario(rol="director"))

        self.assertEqual("usuario", payload["rol"])
        self.assertEqual(
            [{"modulo": "apelaciones", "rolModulo": "directora"}],
            payload["modulos"],
        )

    def test_usuario_inactivo_no_puede_iniciar_sesion(self):
        usuario = self.crear_usuario(activo=False)
        service = AuthService(RepositorioUsuariosEnMemoria([usuario]))

        with self.assertRaisesRegex(PermissionError, "Credenciales incorrectas"):
            service.login(usuario.email, self.password)


if __name__ == "__main__":
    unittest.main()
