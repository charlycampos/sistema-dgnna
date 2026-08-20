import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from domain.services.sustracion_service import SustracionService


class EliminarNnaTests(unittest.TestCase):
    def test_no_permite_eliminar_el_ultimo_nna(self):
        repo = Mock()
        repo.obtener_por_id.return_value = SimpleNamespace(
            nna=[SimpleNamespace(id="nna-1")]
        )
        service = SustracionService(repo)

        with self.assertRaisesRegex(ValueError, "al menos un NNA"):
            service.eliminar_nna("caso-1", "nna-1")

        repo.eliminar_nna.assert_not_called()

    def test_permite_eliminar_si_el_caso_conserva_otro_nna(self):
        repo = Mock()
        repo.obtener_por_id.return_value = SimpleNamespace(
            nna=[SimpleNamespace(id="nna-1"), SimpleNamespace(id="nna-2")]
        )
        repo.eliminar_nna.return_value = True
        service = SustracionService(repo)

        self.assertTrue(service.eliminar_nna("caso-1", "nna-1"))
        repo.eliminar_nna.assert_called_once_with("caso-1", "nna-1")


class HistorialJudicialTests(unittest.TestCase):
    def test_demanda_presentada_actualiza_estado_y_fecha_del_caso(self):
        caso = SimpleNamespace(
            etapa="Judicial", estadoJudicial="Sin demanda", fechaDemanda=None,
            numExpedienteJudicial=None,
        )
        repo = Mock()
        repo.obtener_por_id.return_value = caso
        repo.obtener_proceso.return_value = None
        repo.agregar_historial.side_effect = lambda entrada: entrada
        service = SustracionService(repo)

        service.agregar_historial("caso-1", {
            "etapa": "Demanda presentada",
            "fecha": "2026-08-18",
            "descripcion": "Demanda ingresada al juzgado",
        }, usuario="Usuario Prueba")

        self.assertEqual(caso.estadoJudicial, "Demanda presentada")
        self.assertEqual(caso.fechaDemanda, "2026-08-18")
        repo.actualizar.assert_called_once_with(caso)


class FlujoOperativoTests(unittest.TestCase):
    def setUp(self):
        self.caso = SimpleNamespace(
            id="caso-1", estado="Tramite", acPeru="Requerida", etapa="Administrativo",
            fechaDemanda=None, numExpedienteJudicial=None, fechaEntrevista=None,
            resultadoEntrevista="Pendiente", retorno="Pendiente",
            nna=[SimpleNamespace(edad="8", tipoEdad="Años")],
        )
        self.repo = Mock()
        self.repo.obtener_por_id.return_value = self.caso
        self.repo.obtener_proceso.return_value = None
        self.repo.guardar_proceso.side_effect = lambda proceso: proceso
        self.repo.actualizar.side_effect = lambda caso: caso
        self.repo.agregar_bitacora.side_effect = lambda entrada: entrada
        self.service = SustracionService(self.repo)

    def requisitos(self, estado="Completo"):
        return [
            {"id": f"r{i + 1}", "nombre": nombre, "estado": estado}
            for i, nombre in enumerate(self.service.REQUISITOS)
        ]

    def proceso_guardado(self):
        return self.repo.guardar_proceso.call_args.args[0]

    def test_no_completa_evaluacion_con_requisitos_pendientes(self):
        with self.assertRaisesRegex(ValueError, "8 requisitos"):
            self.service.actualizar_proceso("caso-1", {
                "evaluacionResultado": "Completa",
                "requisitos": self.requisitos("Pendiente"),
            })

    def test_evaluacion_completa_habilita_retorno_para_ac_requerida(self):
        self.service.actualizar_proceso("caso-1", {
            "evaluacionResultado": "Completa",
            "requisitos": self.requisitos(),
        })

        self.assertEqual(self.proceso_guardado().faseOperativa, "Retorno voluntario")

    def test_observacion_habilita_subsanacion_y_no_subsanar_lleva_a_cierre(self):
        requisitos = self.requisitos()
        requisitos[0]["estado"] = "Observado"
        self.service.actualizar_proceso("caso-1", {
            "evaluacionResultado": "Observada",
            "requisitos": requisitos,
        })
        proceso = self.proceso_guardado()
        self.assertEqual(proceso.faseOperativa, "Subsanación")

        self.repo.obtener_proceso.return_value = proceso
        self.service.actualizar_proceso("caso-1", {
            "resultadoSubsanacion": "No subsanó",
            "fechaRespuestaSubsanacion": "2026-08-20",
        })
        self.assertEqual(self.proceso_guardado().faseOperativa, "Cierre")

    def test_rechazo_de_retorno_habilita_via_judicial(self):
        self.service.actualizar_proceso("caso-1", {
            "evaluacionResultado": "Completa",
            "requisitos": self.requisitos(),
            "fechaEntrevista": "2026-08-20",
            "resultadoEntrevista": "Rechaza retorno",
        })

        self.assertEqual(self.proceso_guardado().faseOperativa, "Judicial")
        self.assertEqual(self.caso.etapa, "Judicial")

    def test_retorno_efectivo_lleva_a_cierre(self):
        self.service.actualizar_proceso("caso-1", {
            "evaluacionResultado": "Completa",
            "requisitos": self.requisitos(),
            "fechaEntrevista": "2026-08-20",
            "resultadoEntrevista": "Acepta retorno voluntario",
            "fechaRetornoEfectivo": "2026-09-15",
        })

        self.assertEqual(self.proceso_guardado().faseOperativa, "Cierre")
        self.assertEqual(self.caso.retorno, "SI")

    def test_plazo_de_subsanacion_omite_fines_de_semana_y_feriados(self):
        self.assertEqual(
            self.service.sumar_dias_habiles("2026-07-22", 5),
            "2026-08-03",
        )

    def test_no_archiva_antes_de_llegar_a_cierre(self):
        self.repo.obtener_proceso.return_value = self.service.proceso_inicial("caso-1")
        with self.assertRaisesRegex(ValueError, "etapa de cierre"):
            self.service.actualizar("caso-1", {
                "estado": "Archivado", "fechaSalida": "2026-08-20",
                "motivoCierre": "Otro", "retorno": "No aplica",
            })

    def test_expediente_archivado_no_admite_cambios(self):
        self.caso.estado = "Archivado"
        with self.assertRaisesRegex(ValueError, "expediente cerrado"):
            self.service.actualizar_proceso("caso-1", {"proximaAccion": "Cambiar"})


if __name__ == "__main__":
    unittest.main()
