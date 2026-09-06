import sys
import unittest
from unittest.mock import patch
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError


SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from domain.entities.apelacion import Apelacion
from domain.entities.complejidad import ComplejidadJuridica
from domain.entities.extension_rango import ExtensionRango
from domain.services.apelacion_service import ApelacionService
from infrastructure.api.schemas import ApelacionCreate
from infrastructure.db.migrar_historico_fecha_cambio_resuelto import normalizar_hitos


class FakeApelacionRepository:
    def __init__(self):
        self.items = {}

    def guardar(self, apelacion):
        self.items[apelacion.id] = apelacion
        return apelacion

    def actualizar(self, apelacion):
        self.items[apelacion.id] = apelacion
        return apelacion

    def obtener_por_id(self, appeal_id):
        return self.items.get(appeal_id)


class FakeComplejidadRepository:
    def __init__(self):
        self.complejidad = ComplejidadJuridica(
            id="complejidad-1", nombre="Media", puntos=2
        )
        self.rangos = [ExtensionRango("1 a 100", 1, 1, 100)]

    def obtener_por_id(self, complejidad_id):
        if complejidad_id == self.complejidad.id:
            return self.complejidad
        return None

    def listar_rangos(self):
        return self.rangos


def payload(**overrides):
    data = {
        "numeroExpediente": "EXP-001",
        "fechaIngreso": datetime(2026, 9, 1),
        "procedencia": "Lima",
        "documento": "OFICIO-001",
        "asunto": "Prueba",
        "folios": 10,
        "complejidadId": "complejidad-1",
        "abogadoId": "abogado-1",
        "fechaAsignacion": datetime(2026, 9, 2),
        "estado": "Resuelto",
    }
    data.update(overrides)
    return data


class ResultadoResolucionSchemaTests(unittest.TestCase):
    def test_both_new_fields_are_optional(self):
        parsed = ApelacionCreate(**payload())
        self.assertIsNone(parsed.resultadoResolucion)
        self.assertIsNone(parsed.fechaResolucion)

    def test_enum_rejects_unknown_value(self):
        with self.assertRaises(ValidationError):
            ApelacionCreate(**payload(resultadoResolucion="SUSPENSION_TEMPORAL"))

    def test_enum_accepts_cese_parcial_funciones(self):
        parsed = ApelacionCreate(
            **payload(resultadoResolucion="CESE_PARCIAL_FUNCIONES")
        )
        self.assertEqual(parsed.resultadoResolucion, "CESE_PARCIAL_FUNCIONES")


class MigracionHistoricaResolucionTests(unittest.TestCase):
    def test_conserva_el_primer_hito_auditado_por_expediente(self):
        primero = datetime(2026, 9, 4, 8, 0)
        posterior = datetime(2026, 9, 4, 9, 0)
        hitos = normalizar_hitos(
            [
                {"registro_id": "AP-1", "fecha_cambio_resuelto": posterior},
                {"registro_id": "AP-1", "fecha_cambio_resuelto": primero},
                {"registro_id": "AP-2", "fecha_cambio_resuelto": posterior},
            ]
        )
        self.assertEqual(hitos, {"AP-1": primero, "AP-2": posterior})


class ResultadoResolucionServiceTests(unittest.TestCase):
    def setUp(self):
        self.apelaciones = FakeApelacionRepository()
        self.service = ApelacionService(
            self.apelaciones, FakeComplejidadRepository()
        )

    def test_create_and_update_preserve_new_fields(self):
        fecha = datetime(2026, 9, 3, 10, 30)
        created = self.service.registrar(
            payload(resultadoResolucion="FUNDADO", fechaResolucion=fecha)
        )
        stored = self.apelaciones.obtener_por_id(created.id)
        self.assertEqual(stored.resultadoResolucion, "FUNDADO")
        self.assertEqual(stored.fechaResolucion, fecha)

        updated = self.service.actualizar(
            created.id,
            payload(resultadoResolucion="FUNDADO_EN_PARTE", fechaResolucion=fecha),
        )
        self.assertEqual(updated.resultadoResolucion, "FUNDADO_EN_PARTE")
        self.assertEqual(updated.fechaResolucion, fecha)

    def test_update_explicit_null_clears_new_fields(self):
        fecha = datetime(2026, 9, 3)
        created = self.service.registrar(
            payload(resultadoResolucion="INFUNDADO", fechaResolucion=fecha)
        )
        updated = self.service.actualizar(
            created.id,
            payload(resultadoResolucion=None, fechaResolucion=None),
        )
        self.assertIsNone(updated.resultadoResolucion)
        self.assertIsNone(updated.fechaResolucion)

    def test_fecha_cambio_resuelto_is_set_only_on_first_transition(self):
        created = self.service.registrar(payload(estado="Pendiente"))
        first_hito = datetime(2026, 9, 4, 8, 15)
        with patch("domain.services.apelacion_service.datetime") as clock:
            clock.utcnow.return_value = first_hito
            resolved = self.service.actualizar(created.id, payload(estado="Resuelto"))
        self.assertEqual(resolved.fechaCambioResuelto, first_hito)

        attended = self.service.actualizar(created.id, payload(estado="Atendido"))
        self.assertEqual(attended.fechaCambioResuelto, first_hito)

        resolved_again = self.service.actualizar(
            created.id,
            payload(
                estado="Resuelto",
                fechaCambioResuelto=datetime(1999, 1, 1),
            ),
        )
        self.assertEqual(resolved_again.fechaCambioResuelto, first_hito)

    def test_create_as_resolved_sets_server_timestamp_and_ignores_client(self):
        server_hito = datetime(2026, 9, 4, 9, 30)
        with patch("domain.services.apelacion_service.datetime") as clock:
            clock.utcnow.return_value = server_hito
            created = self.service.registrar(
                payload(
                    estado="Resuelto",
                    fechaCambioResuelto=datetime(1999, 1, 1),
                )
            )
        self.assertEqual(created.fechaCambioResuelto, server_hito)

        unchanged = self.service.actualizar(created.id, payload(estado="Resuelto"))
        self.assertEqual(unchanged.fechaCambioResuelto, server_hito)

    def test_historical_resolved_record_with_null_stays_null_on_edit(self):
        historical = Apelacion(
            **{
                k: v
                for k, v in payload(estado="Resuelto").items()
                if k != "fechaCambioResuelto"
            }
        )
        self.apelaciones.guardar(historical)
        updated = self.service.actualizar(historical.id, payload(estado="Resuelto"))
        self.assertIsNone(updated.fechaCambioResuelto)


if __name__ == "__main__":
    unittest.main()
