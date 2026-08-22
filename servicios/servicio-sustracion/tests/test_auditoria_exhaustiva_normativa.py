"""
AUDITORÍA EXHAUSTIVA DE CONFORMIDAD NORMATIVA Y TÉCNICA
Módulo de Sustracción Internacional — DGNNA / MIMP
Directiva N.° 006-2021-MIMP & Convenio de La Haya de 1980
"""

import sys
import os
import unittest
from datetime import date, datetime, timedelta
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import text

SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from main import app
from infrastructure.db.database import engine, SessionLocal
from domain.services.sustracion_service import SustracionService

SESSION_SECRET = os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026")
TOKEN_AUDITOR = jwt.encode(
    {"nombre": "Auditor Senior QA - DGNNA", "sub": "qa-auditor-master", "role": "admin"},
    SESSION_SECRET,
    algorithm="HS256",
)
AUTH_HEADERS = {
    "Authorization": f"Bearer {TOKEN_AUDITOR}",
    "Content-Type": "application/json",
}

client = TestClient(app)


class AuditoriaExhaustivaNormativaTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.codigos_test = [
            "AUDIT-2026-NNA-01", "AUDIT-2026-NNA-02", "AUDIT-2026-EVAL-01",
            "AUDIT-2026-SUB-01", "AUDIT-2026-RET-01", "AUDIT-2026-JUD-01",
            "AUDIT-2026-CIE-01", "AUDIT-2026-IMM-01",
        ]
        cls.limpiar_db(cls.codigos_test)

    @classmethod
    def tearDownClass(cls):
        cls.limpiar_db(cls.codigos_test)

    @classmethod
    def limpiar_db(cls, codigos):
        with engine.connect() as conn:
            for cod in codigos:
                res = conn.execute(
                    text("SELECT ID FROM SUSTRACION_DB.CASOS_SUSTRACION WHERE CODIGO = :cod"),
                    {"cod": cod}
                ).fetchone()
                if res:
                    cid = res[0]
                    conn.execute(text("DELETE FROM SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACION WHERE CASOID = :id"), {"id": cid})
                    conn.execute(text("DELETE FROM SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACCION WHERE CASOID = :id"), {"id": cid})
                    conn.execute(text("DELETE FROM SUSTRACION_DB.NNA_SUSTRACION WHERE CASOID = :id"), {"id": cid})
                    conn.execute(text("DELETE FROM SUSTRACION_DB.BITACORA_SUSTRACION WHERE CASOID = :id"), {"id": cid})
                    conn.execute(text("DELETE FROM SUSTRACION_DB.HISTORIAL_JUDICIAL WHERE CASOID = :id"), {"id": cid})
                    conn.execute(text("DELETE FROM SUSTRACION_DB.CASOS_SUSTRACION WHERE ID = :id"), {"id": cid})
            conn.commit()

    # =========================================================================
    # 1. BLOQUE REGISTRO & NNA & PROFESIONAL SESIÓN
    # =========================================================================

    def test_01_registro_caso_multi_nna_y_calculo_exacto_edad(self):
        """Audita el cálculo exacto de edad (años/meses/días) y persistencia multi-NNA."""
        payload = {
            "codigo": "AUDIT-2026-NNA-01",
            "pais": "Chile",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-15",
            "solicitanteNombre": "Carlos Mendoza",
            "solicitanteSexo": "Hombre",
            "requeridoNombre": "Lucía Morales",
            "requeridoSexo": "Mujer",
            "estado": "Tramite",
            "nna": [
                {
                    "nombres": "Joaquín",
                    "primerApellido": "Mendoza",
                    "segundoApellido": "Morales",
                    "sexo": "Hombre",
                    "fechaNacimiento": "2018-08-15",  # Exactamente 8 años a 2026-08-15
                },
                {
                    "nombres": "Sofía",
                    "primerApellido": "Mendoza",
                    "segundoApellido": "Morales",
                    "sexo": "Mujer",
                    "fechaNacimiento": "2026-02-15",  # Exactamente 6 meses a 2026-08-15
                },
                {
                    "nombres": "Mateo",
                    "primerApellido": "Mendoza",
                    "segundoApellido": "Morales",
                    "sexo": "Hombre",
                    "fechaNacimiento": "2026-08-05",  # Exactamente 10 días a 2026-08-15
                }
            ]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        # Verificar profesional asignado desde el token JWT
        self.assertEqual(data["profesional"], "Auditor Senior QA - DGNNA")
        self.assertEqual(data["creadoPor"], "Auditor Senior QA - DGNNA")

        # Verificar cálculo de edades exactas
        nna_list = data["nna"]
        self.assertEqual(len(nna_list), 3)

        joaquin = next(n for n in nna_list if n["nombres"] == "Joaquín")
        self.assertEqual(joaquin["edad"], "8")
        self.assertEqual(joaquin["tipoEdad"], "Años")

        sofia = next(n for n in nna_list if n["nombres"] == "Sofía")
        self.assertEqual(sofia["edad"], "6")
        self.assertEqual(sofia["tipoEdad"], "Meses")

        mateo = next(n for n in nna_list if n["nombres"] == "Mateo")
        self.assertEqual(mateo["edad"], "10")
        self.assertEqual(mateo["tipoEdad"], "Días")

        # Verificar persistencia en Oracle
        with engine.connect() as conn:
            nna_db = conn.execute(
                text("SELECT NOMBRES, EDAD, TIPOEDAD FROM SUSTRACION_DB.NNA_SUSTRACION WHERE CASOID = :id ORDER BY NOMBRES"),
                {"id": data["id"]}
            ).fetchall()
            self.assertEqual(len(nna_db), 3)

    def test_02_validacion_limite_edad_16_anos_convenio_haya(self):
        """Convenio de La Haya Art. 4: El Convenio deja de aplicarse cuando el NNA cumple 16 años."""
        # NNA con 16 años cumplidos a la fecha de ingreso
        payload = {
            "codigo": "AUDIT-2026-NNA-02",
            "pais": "Francia",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-15",
            "nna": [
                {
                    "nombres": "Lucas",
                    "primerApellido": "Dupont",
                    "sexo": "Hombre",
                    "fechaNacimiento": "2010-08-10",  # 16 años cumplidos a 2026-08-15
                }
            ]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        cid = data["id"]
        self.assertEqual(data["nna"][0]["edad"], "16")

        # Intento de marcar evaluación completa con NNA de 16 años debe ser RECHAZADO
        reqs_conforme = [{"id": f"r{i+1}", "nombre": nom, "estado": "Completo"} for i, nom in enumerate(SustracionService.REQUISITOS)]
        res_eval = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Completa",
            "requisitos": reqs_conforme,
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_eval.status_code, 400)
        self.assertIn("menores de 16 años", res_eval.json()["detail"])

    # =========================================================================
    # 2. PASO 1 — EVALUACIÓN INICIAL & REQUISITOS NORMATIVOS
    # =========================================================================

    def test_03_evaluacion_matriz_8_requisitos_y_transiciones(self):
        """Audita la matriz de 8 requisitos, auto-descartes y transiciones inteligentes."""
        payload = {
            "codigo": "AUDIT-2026-EVAL-01",
            "pais": "Colombia",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-01",
            "nna": [{"nombres": "Andrés", "primerApellido": "Pardo", "fechaNacimiento": "2019-01-01"}]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        self.assertEqual(res.status_code, 201)
        cid = res.json()["id"]

        # Intento con evaluación Completa pero con requisitos incompletos -> debe fallar
        reqs_incompletos = [{"id": f"r{i+1}", "nombre": nom, "estado": "Pendiente"} for i, nom in enumerate(SustracionService.REQUISITOS)]
        res_fail = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Completa",
            "requisitos": reqs_incompletos,
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_fail.status_code, 400)

        # Transición a Observada con r2 y r6 observados
        reqs_obs = []
        for i, nom in enumerate(SustracionService.REQUISITOS):
            rid = f"r{i+1}"
            estado = "Observado" if rid in ("r2", "r6") else "Completo"
            reqs_obs.append({"id": rid, "nombre": nom, "estado": estado})

        res_obs = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Observada",
            "requisitos": reqs_obs,
            "fechaObservacion": "2026-08-02",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_obs.status_code, 200)
        self.assertEqual(res_obs.json()["procesoOperativo"]["faseOperativa"], "Subsanación")

    # =========================================================================
    # 3. PASO 2 — SUBSANACIÓN & CÓMPUTO DÍAS HÁBILES Y FERIADOS
    # =========================================================================

    def test_04_computo_legal_dias_habiles_feriados_peru(self):
        """Audita el cómputo de 5 y 10 días hábiles omitiendo sábados, domingos y feriados fijos."""
        # 1. 2026-07-22 + 5 días hábiles:
        # 23-jul (Feriado), 24-jul (Viernes=1), 25/26 (Fin de semana), 27-jul (Lunes=2), 28-jul (Feriado), 29-jul (Feriado), 30-jul (Jueves=3), 31-jul (Viernes=4), 1/2 ago (Fin de semana), 3-ago (Lunes=5) -> Resultado: 2026-08-03
        f_limite_5 = SustracionService.sumar_dias_habiles("2026-07-22", 5)
        self.assertEqual(f_limite_5, "2026-08-03")

        # 2. 2026-07-22 + 10 días hábiles:
        # 4-ago (Mar=6), 5-ago (Mie=7), 6-ago (Feriado Batalla Junín), 7-ago (Vie=8), 8/9 ago (Fin de semana), 10-ago (Lun=9), 11-ago (Mar=10) -> Resultado: 2026-08-11
        f_limite_10 = SustracionService.sumar_dias_habiles("2026-07-22", 10)
        self.assertEqual(f_limite_10, "2026-08-11")

    def test_05_flujo_subsanacion_y_enrutamiento(self):
        """Audita el enrutamiento: No subsana -> Cierre; Subsana -> Retorno voluntario."""
        payload = {
            "codigo": "AUDIT-2026-SUB-01",
            "pais": "Uruguay",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-01",
            "nna": [{"nombres": "Camila", "primerApellido": "Suárez", "fechaNacimiento": "2017-05-10"}]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        cid = res.json()["id"]

        # Notificación con 5 días hábiles
        res_sub = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Observada",
            "requisitos": [{"id": f"r{i+1}", "nombre": nom, "estado": "Observado" if i==0 else "Completo"} for i, nom in enumerate(SustracionService.REQUISITOS)],
            "fechaNotificacion": "2026-08-03",
            "ampliacionSubsanacion": "No",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_sub.status_code, 200)
        # 2026-08-03 (Lunes) + 5 días hábiles -> Omite 6-ago (Feriado Batalla Junín), 8/9 ago (Fin de semana) -> 2026-08-11 (Martes)
        self.assertEqual(res_sub.json()["procesoOperativo"]["fechaLimiteSubsanacion"], "2026-08-11")

        # No subsana dentro del plazo -> Fase Cierre
        res_nosub = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "fechaRespuestaSubsanacion": "2026-08-12",
            "resultadoSubsanacion": "No subsanó",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_nosub.status_code, 200)
        self.assertEqual(res_nosub.json()["procesoOperativo"]["faseOperativa"], "Cierre")

    # =========================================================================
    # 4. PASO 3 — RETORNO VOLUNTARIO & PASAJES & BIFURCACIÓN JUDICIAL
    # =========================================================================

    def test_06_acuerdo_retorno_plazo_1_mes_y_bifurcacion_judicial(self):
        """Audita plazo de 1 mes de pasajes y transición automática a Judicial ante rechazo."""
        payload = {
            "codigo": "AUDIT-2026-RET-01",
            "pais": "Ecuador",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-01",
            "nna": [{"nombres": "Gabriel", "primerApellido": "Paredes", "fechaNacimiento": "2019-11-20"}]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        cid = res.json()["id"]

        # Conforme inicial
        reqs_conforme = [{"id": f"r{i+1}", "nombre": nom, "estado": "Completo"} for i, nom in enumerate(SustracionService.REQUISITOS)]
        client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Completa",
            "requisitos": reqs_conforme,
        }, headers=AUTH_HEADERS)

        # 1. Acuerdo de Retorno: Auto-cálculo 1 mes pasajes
        res_acuerdo = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "fechaEntrevista": "2026-08-10",
            "resultadoEntrevista": "Acepta retorno voluntario",
            "fechaAcuerdo": "2026-08-10",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_acuerdo.status_code, 200)
        self.assertEqual(res_acuerdo.json()["procesoOperativo"]["fechaLimitePasajes"], "2026-09-10")

        # 2. Rechazo de retorno conmuta inmediatamente a Judicial
        res_rechazo = client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "fechaEntrevista": "2026-08-15",
            "resultadoEntrevista": "Rechaza retorno",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_rechazo.status_code, 200)
        self.assertEqual(res_rechazo.json()["procesoOperativo"]["faseOperativa"], "Judicial")
        self.assertEqual(res_rechazo.json()["etapa"], "Judicial")

    # =========================================================================
    # 5. PASO 4 — PROCESO JUDICIAL & HISTORIAL
    # =========================================================================

    def test_07_proceso_judicial_registro_hitos_y_recalculo(self):
        """Audita el registro de demanda, hitos procesales y recálculo automático de estado judicial."""
        payload = {
            "codigo": "AUDIT-2026-JUD-01",
            "pais": "Bolivia",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-01",
            "nna": [{"nombres": "Valeria", "primerApellido": "Rojas", "fechaNacimiento": "2018-04-12"}]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        cid = res.json()["id"]

        # Poner en fase Judicial
        reqs_conforme = [{"id": f"r{i+1}", "nombre": nom, "estado": "Completo"} for i, nom in enumerate(SustracionService.REQUISITOS)]
        client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Completa",
            "requisitos": reqs_conforme,
            "fechaEntrevista": "2026-08-05",
            "resultadoEntrevista": "Rechaza retorno",
        }, headers=AUTH_HEADERS)

        # Agregar Hito 1: Demanda presentada
        res_h1 = client.post(f"/api/sustracion/{cid}/historial-judicial", json={
            "etapa": "Demanda presentada",
            "fecha": "2026-08-10",
            "descripcion": "Ingresada a mesa de partes",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_h1.status_code, 201)

        # Agregar Hito 2: En audiencia
        res_h2 = client.post(f"/api/sustracion/{cid}/historial-judicial", json={
            "etapa": "En audiencia",
            "fecha": "2026-08-20",
            "descripcion": "Audiencia única de pruebas",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_h2.status_code, 201)

        # Verificar estado judicial actualizado
        caso_actual = client.get(f"/api/sustracion/{cid}", headers=AUTH_HEADERS).json()
        self.assertEqual(caso_actual["estadoJudicial"], "En audiencia")
        self.assertEqual(caso_actual["fechaDemanda"], "2026-08-10")

    # =========================================================================
    # 6. PASO 5 — CIERRE & INMUTABILIDAD DEL ARCHIVO
    # =========================================================================

    def test_08_cierre_normativo_e_inmutabilidad_de_archivo(self):
        """Audita causales normativas, validación de cierre y protección de expediente archivado."""
        payload = {
            "codigo": "AUDIT-2026-CIE-01",
            "pais": "México",
            "tipoSolicitud": "Restitución",
            "acPeru": "Requerida",
            "fechaIngreso": "2026-08-01",
            "nna": [{"nombres": "Emiliano", "primerApellido": "Zapata", "fechaNacimiento": "2017-03-08"}]
        }
        res = client.post("/api/sustracion", json=payload, headers=AUTH_HEADERS)
        cid = res.json()["id"]

        # Intento de archivar sin llegar a fase Cierre -> debe fallar
        res_arch_prematuro = client.put(f"/api/sustracion/{cid}", json={
            "estado": "Archivado",
            "fechaSalida": "2026-08-20",
            "motivoCierre": "Retorno voluntario",
            "retorno": "SI",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_arch_prematuro.status_code, 400)
        self.assertIn("etapa de cierre", res_arch_prematuro.json()["detail"])

        # Llevar a Cierre por retorno voluntario efectivo
        reqs_conforme = [{"id": f"r{i+1}", "nombre": nom, "estado": "Completo"} for i, nom in enumerate(SustracionService.REQUISITOS)]
        client.put(f"/api/sustracion/{cid}/proceso-operativo", json={
            "evaluacionResultado": "Completa",
            "requisitos": reqs_conforme,
            "fechaEntrevista": "2026-08-10",
            "resultadoEntrevista": "Acepta retorno voluntario",
            "fechaRetornoEfectivo": "2026-08-20",
        }, headers=AUTH_HEADERS)

        # Ahora sí se puede archivar con causales normativas
        res_arch = client.put(f"/api/sustracion/{cid}", json={
            "estado": "Archivado",
            "fechaSalida": "2026-08-20",
            "motivoCierre": "Retorno voluntario",
            "retorno": "SI",
        }, headers=AUTH_HEADERS)
        self.assertEqual(res_arch.status_code, 200)
        self.assertEqual(res_arch.json()["estado"], "Archivado")

        # INMUTABILIDAD: Intentar modificar expediente archivado debe ser RECHAZADO
        res_mod = client.put(f"/api/sustracion/{cid}", json={"observaciones": "Intento de edición posterior"}, headers=AUTH_HEADERS)
        self.assertEqual(res_mod.status_code, 400)
        self.assertIn("expediente cerrado", res_mod.json()["detail"])

        # INMUTABILIDAD: Intentar eliminar expediente archivado debe ser RECHAZADO
        res_del = client.delete(f"/api/sustracion/{cid}", headers=AUTH_HEADERS)
        self.assertEqual(res_del.status_code, 409)
        self.assertIn("auditoría", res_del.json()["detail"])


if __name__ == "__main__":
    unittest.main()
