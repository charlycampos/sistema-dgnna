import os
import sys
import unittest
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

# SESSION_SECRET ya no tiene valor por defecto en el código (ver auth_service.py);
# en TESTING=true se usa un secreto fijo solo para pruebas.
os.environ.setdefault("TESTING", "true")

from domain.entities.usuario import Usuario, UsuarioModulo
from domain.services.auth_service import AuthService


class RepositorioUsuariosEnMemoria:
    def __init__(self, usuarios):
        self._usuarios = {usuario.email: usuario for usuario in usuarios}

    def obtener_por_email(self, email):
        return self._usuarios.get(email)

    def obtener_por_id(self, id):
        return next((u for u in self._usuarios.values() if u.id == id), None)


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

    def crear_usuario(self, *, rol="usuario", activo=True, modulos=None, direccion=None):
        usuario = Usuario(
            nombre="Usuario de prueba",
            email="usuario@dgnna.gob.pe",
            passwordHash=self.password_hash,
            rol=rol,
            direccion=direccion,
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

    def test_direccion_viaja_en_el_token_y_en_la_respuesta(self):
        resultado, payload = self.login(self.crear_usuario(direccion="DPE"))

        self.assertEqual("DPE", resultado["direccion"])
        self.assertEqual("DPE", payload["direccion"])

    def test_direccion_ausente_no_rompe_el_login(self):
        """Un usuario sin dirección asignada (personal de despacho, admins) sigue
        pudiendo iniciar sesión; el token lleva direccion vacía, no ausente, para
        que los microservicios consumidores no necesiten distinguir los dos casos."""
        resultado, payload = self.login(self.crear_usuario(direccion=None))

        self.assertIsNone(resultado["direccion"])
        self.assertEqual("", payload["direccion"])

    def test_estado_actual_refleja_los_datos_vigentes_del_usuario(self):
        """El middleware del frontend usa esto para revalidar la sesión contra la
        BD en cada renovación deslizante, no solo contra la firma del JWT."""
        usuario = self.crear_usuario(direccion="DPE", modulos=[("ayuda-memoria", "directora")])
        service = AuthService(RepositorioUsuariosEnMemoria([usuario]))
        resultado = service.login(usuario.email, self.password)

        estado = service.estado_actual(resultado["access_token"])

        self.assertTrue(estado["activo"])
        self.assertEqual("usuario", estado["rol"])
        self.assertEqual("DPE", estado["direccion"])
        self.assertEqual(
            [{"modulo": "ayuda-memoria", "rolModulo": "directora"}],
            estado["modulos"],
        )

    def test_estado_actual_corta_la_sesion_si_el_usuario_fue_desactivado(self):
        usuario = self.crear_usuario()
        repo = RepositorioUsuariosEnMemoria([usuario])
        service = AuthService(repo)
        resultado = service.login(usuario.email, self.password)

        usuario.activo = False  # se desactiva después de emitido el token

        with self.assertRaisesRegex(PermissionError, "desactivada"):
            service.estado_actual(resultado["access_token"])

    def test_estado_actual_rechaza_token_invalido(self):
        service = AuthService(RepositorioUsuariosEnMemoria([]))

        with self.assertRaisesRegex(PermissionError, "Token inválido"):
            service.estado_actual("esto-no-es-un-jwt-valido")


if __name__ == "__main__":
    unittest.main()
