"""
========================================================================================
AUDITORÍA DE PRUEBAS END-TO-END (E2E) — MÓDULO DE SUSTRACCIÓN INTERNACIONAL
Directiva N.° 006-2021-MIMP / DGNNA — Sistema DGNNA
========================================================================================
Casos auditados:
 1. Caso 1: AC Requerida — Retorno Voluntario Conforme (España -> Restitución, 1 menor 8 años)
 2. Caso 2: AC Requirente — Cooperación Internacional y Judicial Exterior (Italia -> Restitución, 2 menores 6 y 10 años)
 3. Caso 3: AC Requerida — Observación, Subsanación y Judicial Nacional (Argentina -> Visitas, 1 menor 12 años)
========================================================================================
"""

import sys
import os
import json
from datetime import datetime, date

# Asegurar path para importar módulos del servicio
SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import text

from main import app
from infrastructure.db.database import engine, SessionLocal
from domain.services.sustracion_service import SustracionService

# Configuración de cliente y autenticación
SESSION_SECRET = os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026")
TOKEN_AUDITOR = jwt.encode(
    {"nombre": "Auditor Senior QA - DGNNA", "sub": "qa-auditor-01", "role": "admin"},
    SESSION_SECRET,
    algorithm="HS256",
)
AUTH_HEADERS = {
    "Authorization": f"Bearer {TOKEN_AUDITOR}",
    "Content-Type": "application/json",
}

client = TestClient(app)


def print_section(title: str):
    print("\n" + "=" * 80)
    print(f"  {title.upper()}")
    print("=" * 80)


def print_step(step_num: int, title: str, details: dict = None):
    print(f"\n[PASO {step_num}] {title}")
    if details:
        for k, v in details.items():
            print(f"   * {k}: {v}")


def limpiar_casos_anteriores(codigos: list):
    """Limpia casos de prueba previos si existen para asegurar idempotencia."""
    with engine.connect() as conn:
        for cod in codigos:
            res = conn.execute(
                text("SELECT ID FROM SUSTRACION_DB.CASOS_SUSTRACION WHERE CODIGO = :cod"),
                {"cod": cod}
            ).fetchone()
            if res:
                caso_id = res[0]
                conn.execute(text("DELETE FROM SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACION WHERE CASOID = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACCION WHERE CASOID = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.NNA_SUSTRACION WHERE CASOID = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.BITACORA_SUSTRACION WHERE CASOID = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.HISTORIAL_JUDICIAL WHERE CASOID = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.CASOS_SUSTRACION WHERE ID = :id"), {"id": caso_id})
        conn.commit()


def ejecutar_auditoria():
    codigos_test = ["HT-2026-E2E-01", "HT-2026-E2E-02", "HT-2026-E2E-03"]
    limpiar_casos_anteriores(codigos_test)

    resultados_auditoria = {
        "fecha_ejecucion": datetime.now().isoformat(),
        "ambiente": "Oracle XE 21c (SUSTRACION_DB) / FastAPI 2.0 / Directiva 006-2021-MIMP",
        "casos": [],
        "contadores_etapas": {},
        "validaciones_normativas": [],
    }

    # =========================================================================
    # CASO DE PRUEBA 1: AC Requerida — Retorno Voluntario Conforme
    # =========================================================================
    print_section("Ejecución Caso 1: AC Requerida — Retorno Voluntario Conforme (España)")

    # Paso 1: Creación del caso
    payload_c1 = {
        "codigo": "HT-2026-E2E-01",
        "pais": "España",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-08-01",
        "solicitanteNombre": "Alvaro Sánchez García (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+34 600 123 456",
        "solicitanteCorreo": "alvaro.sanchez@email.es",
        "solicitanteDomicilio": "Calle Gran Vía 42, Madrid, España",
        "requeridoNombre": "Elena Martínez Ruiz (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "987 112 233",
        "requeridoCorreo": "elena.martinez@email.pe",
        "requeridoDomicilio": "Av. Larco 450, Miraflores, Lima",
        "profesional": "EMMA",
        "estado": "Tramite",
        "observaciones": "Caso E2E-01: Solicitud de Restitución desde España. Menor retenido en Lima.",
        "nna": [
            {
                "nombres": "Diego",
                "primerApellido": "Sánchez",
                "segundoApellido": "Martínez",
                "sexo": "Hombre",
                "fechaNacimiento": "2018-05-15",
            }
        ],
    }

    r_c1 = client.post("/api/sustracion", json=payload_c1, headers=AUTH_HEADERS)
    assert r_c1.status_code == 201, f"Error creando Caso 1: {r_c1.text}"
    data_c1 = r_c1.json()
    id_c1 = data_c1["id"]

    print_step(1, "Caso Creado en API", {
        "ID": id_c1,
        "Código": data_c1["codigo"],
        "NNA": f"{data_c1['nna'][0]['nombres']} {data_c1['nna'][0]['primerApellido']}",
        "Edad calculada": f"{data_c1['nna'][0]['edad']} {data_c1['nna'][0]['tipoEdad']}",
        "Fase Operativa Inicial": data_c1["procesoOperativo"]["faseOperativa"],
    })
    assert data_c1["nna"][0]["edad"] == "8", "La edad calculada debe ser 8 años"
    assert data_c1["procesoOperativo"]["faseOperativa"] == "Evaluación"

    # Paso 2: Evaluación Inicial 100% conforme (8 requisitos Completo)
    reqs_conforme = [
        {"id": f"r{i+1}", "nombre": nom, "estado": "Completo"}
        for i, nom in enumerate(SustracionService.REQUISITOS)
    ]
    payload_eval_c1 = {
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }
    r_eval_c1 = client.put(f"/api/sustracion/{id_c1}/proceso-operativo", json=payload_eval_c1, headers=AUTH_HEADERS)
    assert r_eval_c1.status_code == 200, f"Error en evaluación Caso 1: {r_eval_c1.text}"
    data_eval_c1 = r_eval_c1.json()

    print_step(2, "Evaluación Inicial 100% Conforme", {
        "Resultado Evaluación": data_eval_c1["procesoOperativo"]["evaluacionResultado"],
        "Requisitos Conformes": f"{len(data_eval_c1['procesoOperativo']['requisitos'])} / 8",
        "Nueva Fase Operativa": data_eval_c1["procesoOperativo"]["faseOperativa"],
    })
    assert data_eval_c1["procesoOperativo"]["faseOperativa"] == "Retorno voluntario", "AC Requerida completa debe pasar a Retorno voluntario"

    # Paso 3: Retorno Voluntario con Entrevista Amigable y Acuerdo Alcanzado
    payload_retorno_c1 = {
        "fechaEntrevista": "2026-08-10",
        "resultadoEntrevista": "Acepta retorno voluntario",
        "estadoRetornoVoluntario": "Acuerdo alcanzado",
        "fechaAcuerdo": "2026-08-10",
        "propuestaRetorno": "Retorno amigable a Madrid con acompañamiento materno.",
        "fechaPrevistaRetorno": "2026-09-10",
        "compromisosRetorno": "El padre envía pasajes y la madre firma autorización notarial de viaje.",
    }
    r_ret_c1 = client.put(f"/api/sustracion/{id_c1}/proceso-operativo", json=payload_retorno_c1, headers=AUTH_HEADERS)
    assert r_ret_c1.status_code == 200, f"Error en retorno voluntario Caso 1: {r_ret_c1.text}"
    data_ret_c1 = r_ret_c1.json()

    print_step(3, "Acuerdo de Retorno Voluntario y Auto-cálculo de Plazo de 1 Mes de Pasajes", {
        "Fecha Entrevista": data_ret_c1["fechaEntrevista"],
        "Resultado Entrevista": data_ret_c1["resultadoEntrevista"],
        "Fecha Acuerdo": data_ret_c1["procesoOperativo"]["fechaAcuerdo"],
        "Fecha Límite Pasajes (Auto-cálculo 1 mes)": data_ret_c1["procesoOperativo"]["fechaLimitePasajes"],
        "Fase Operativa": data_ret_c1["procesoOperativo"]["faseOperativa"],
    })
    assert data_ret_c1["procesoOperativo"]["fechaLimitePasajes"] == "2026-09-10", "El plazo de pasajes debe ser exactamente 1 mes: 2026-09-10"

    # Registrar bitácora de seguimiento
    client.post(f"/api/sustracion/{id_c1}/bitacora", json={
        "fecha": "2026-08-10",
        "texto": "Suscripción formal de Acta de Compromiso de Retorno Voluntario. Corre plazo de 1 mes para envío de pasajes.",
        "creadoPor": "EMMA",
    }, headers=AUTH_HEADERS)

    resultados_auditoria["casos"].append({
        "caso_num": 1,
        "titulo": "AC Requerida — Retorno Voluntario Conforme",
        "codigo": "HT-2026-E2E-01",
        "id": id_c1,
        "pais": "España",
        "acPeru": "Requerida",
        "nna_total": 1,
        "nna_detalle": [{"nombre": "Diego Sánchez Martínez", "edad": "8 Años", "nacimiento": "2018-05-15"}],
        "fase_final": data_ret_c1["procesoOperativo"]["faseOperativa"],
        "etapa_caso": data_ret_c1["etapa"],
        "fecha_limite_pasajes": data_ret_c1["procesoOperativo"]["fechaLimitePasajes"],
        "estado": "EXITOSO",
    })

    # =========================================================================
    # CASO DE PRUEBA 2: AC Requirente — Cooperación Internacional y Judicial Exterior
    # =========================================================================
    print_section("Ejecución Caso 2: AC Requirente — Cooperación Internacional y Judicial Exterior (Italia)")

    payload_c2 = {
        "codigo": "HT-2026-E2E-02",
        "pais": "Italia",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requirente",
        "fechaIngreso": "2026-07-15",
        "solicitanteNombre": "María Quispe Huamán (Madre)",
        "solicitanteSexo": "Mujer",
        "solicitanteTelefono": "991 223 344",
        "solicitanteCorreo": "maria.quispe@email.pe",
        "solicitanteDomicilio": "Av. Arequipa 2300, Lince, Lima",
        "requeridoNombre": "Leonardo Rossi Ferrari (Padre)",
        "requeridoSexo": "Hombre",
        "requeridoTelefono": "+39 06 9876 543",
        "requeridoCorreo": "leonardo.rossi@email.it",
        "requeridoDomicilio": "Via del Corso 120, Roma, Italia",
        "profesional": "JANNY",
        "estado": "Tramite",
        "observaciones": "Caso E2E-02: Madre requirente en Perú solicita restitución de 2 hermanos retenidos en Roma, Italia.",
        "nna": [
            {
                "nombres": "Marco",
                "primerApellido": "Rossi",
                "segundoApellido": "Quispe",
                "sexo": "Hombre",
                "fechaNacimiento": "2020-04-10",
            },
            {
                "nombres": "Alessia",
                "primerApellido": "Rossi",
                "segundoApellido": "Quispe",
                "sexo": "Mujer",
                "fechaNacimiento": "2016-02-20",
            }
        ],
    }

    r_c2 = client.post("/api/sustracion", json=payload_c2, headers=AUTH_HEADERS)
    assert r_c2.status_code == 201, f"Error creando Caso 2: {r_c2.text}"
    data_c2 = r_c2.json()
    id_c2 = data_c2["id"]

    print_step(1, "Caso Creado en API con 2 NNA Hermanos", {
        "ID": id_c2,
        "Código": data_c2["codigo"],
        "Total NNA": len(data_c2["nna"]),
        "Hermano 1": f"{data_c2['nna'][0]['nombres']} ({data_c2['nna'][0]['edad']} {data_c2['nna'][0]['tipoEdad']})",
        "Hermano 2": f"{data_c2['nna'][1]['nombres']} ({data_c2['nna'][1]['edad']} {data_c2['nna'][1]['tipoEdad']})",
    })
    assert len(data_c2["nna"]) == 2
    edades_c2 = {n["edad"] for n in data_c2["nna"]}
    assert edades_c2 == {"6", "10"}, f"Edades esperadas {{'6', '10'}}, obtenidas: {edades_c2}"

    # Paso 2: Evaluación Inicial conforme
    payload_eval_c2 = {
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }
    r_eval_c2 = client.put(f"/api/sustracion/{id_c2}/proceso-operativo", json=payload_eval_c2, headers=AUTH_HEADERS)
    assert r_eval_c2.status_code == 200, f"Error en evaluación Caso 2: {r_eval_c2.text}"
    data_eval_c2 = r_eval_c2.json()

    print_step(2, "Evaluación Inicial Conforme -> Fase Gestión Internacional", {
        "Resultado Evaluación": data_eval_c2["procesoOperativo"]["evaluacionResultado"],
        "Fase Operativa": data_eval_c2["procesoOperativo"]["faseOperativa"],
    })
    assert data_eval_c2["procesoOperativo"]["faseOperativa"] == "Gestión internacional"

    # Paso 3: Cooperación Internacional con Oficio SGD a Autoridad Central de Roma
    payload_coop_c2 = {
        "destinatarioGestion": "Ministero della Giustizia - Autorità Centrale per la Convenzione dell'Aia, Roma, Italia",
        "tipoComunicacion": "Oficio SGD / Solicitud de Restitución Internacional",
        "fechaEnvio": "2026-07-25",
        "referenciaSgd": "EXP-2026-SGD-004521 / OFICIO-0188-2026-MIMP-DGNNA",
        "respuestaEsperada": "2026-08-25",
        "proximaAccion": "Monitoreo de admisibilidad por parte de la Autoridad Central italiana y coordinación consular.",
        "estadoCooperacion": "En seguimiento",
    }
    r_coop_c2 = client.put(f"/api/sustracion/{id_c2}/proceso-operativo", json=payload_coop_c2, headers=AUTH_HEADERS)
    assert r_coop_c2.status_code == 200, f"Error en cooperación Caso 2: {r_coop_c2.text}"
    data_coop_c2 = r_coop_c2.json()

    print_step(3, "Cooperación Internacional con Oficio SGD Registrado", {
        "Destinatario": data_coop_c2["procesoOperativo"]["destinatarioGestion"],
        "Referencia SGD": data_coop_c2["procesoOperativo"]["referenciaSgd"],
        "Fecha Envío": data_coop_c2["procesoOperativo"]["fechaEnvio"],
        "Estado Cooperación": data_coop_c2["procesoOperativo"]["estadoCooperacion"],
    })

    # Paso 4: Seguimiento Judicial Exterior en Juzgado Italiano
    payload_jud_ext_c2 = {
        "estadoCooperacion": "Proceso judicial exterior",
        "respuestaRecibida": "2026-08-15",
        "proximaAccion": "Seguimiento de audiencia en el Tribunale per i Minorenni di Roma (Expediente N.° TMR-2026-8841).",
    }
    r_jud_ext_c2 = client.put(f"/api/sustracion/{id_c2}/proceso-operativo", json=payload_jud_ext_c2, headers=AUTH_HEADERS)
    assert r_jud_ext_c2.status_code == 200, f"Error en judicial exterior Caso 2: {r_jud_ext_c2.text}"
    data_jud_ext_c2 = r_jud_ext_c2.json()

    print_step(4, "Transición a Fase Judicial Exterior (Roma)", {
        "Estado Cooperación": data_jud_ext_c2["procesoOperativo"]["estadoCooperacion"],
        "Respuesta Recibida": data_jud_ext_c2["procesoOperativo"]["respuestaRecibida"],
        "Fase Operativa Calculada": data_jud_ext_c2["procesoOperativo"]["faseOperativa"],
    })
    assert data_jud_ext_c2["procesoOperativo"]["faseOperativa"] == "Judicial exterior"

    # Registrar bitácora
    client.post(f"/api/sustracion/{id_c2}/bitacora", json={
        "fecha": "2026-08-15",
        "texto": "Autoridad Central de Italia informa inicio de procedimiento judicial ante Tribunale per i Minorenni di Roma. Exp. TMR-2026-8841.",
        "creadoPor": "JANNY",
    }, headers=AUTH_HEADERS)

    resultados_auditoria["casos"].append({
        "caso_num": 2,
        "titulo": "AC Requirente — Cooperación Internacional y Judicial Exterior",
        "codigo": "HT-2026-E2E-02",
        "id": id_c2,
        "pais": "Italia",
        "acPeru": "Requirente",
        "nna_total": 2,
        "nna_detalle": [
            {"nombre": "Marco Rossi Quispe", "edad": "6 Años", "nacimiento": "2020-04-10"},
            {"nombre": "Alessia Rossi Quispe", "edad": "10 Años", "nacimiento": "2016-02-20"},
        ],
        "fase_final": data_jud_ext_c2["procesoOperativo"]["faseOperativa"],
        "referencia_sgd": data_coop_c2["procesoOperativo"]["referenciaSgd"],
        "estado": "EXITOSO",
    })

    # =========================================================================
    # CASO DE PRUEBA 3: AC Requerida — Observación, Subsanación y Judicial Nacional
    # =========================================================================
    print_section("Ejecución Caso 3: AC Requerida — Observación, Subsanación y Judicial Nacional (Argentina)")

    payload_c3 = {
        "codigo": "HT-2026-E2E-03",
        "pais": "Argentina",
        "tipoSolicitud": "Régimen de Visitas",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-07-01",
        "solicitanteNombre": "Esteban Navarro Morales (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+54 11 5566 7788",
        "solicitanteCorreo": "esteban.navarro@email.ar",
        "solicitanteDomicilio": "Av. Corrientes 1500, Buenos Aires, Argentina",
        "requeridoNombre": "Camila Vargas Rivas (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "977 889 900",
        "requeridoCorreo": "camila.vargas@email.pe",
        "requeridoDomicilio": "Calle Las Camelias 320, San Isidro, Lima",
        "profesional": "CECILIA",
        "estado": "Tramite",
        "observaciones": "Caso E2E-03: Solicitud de Régimen de Visitas desde Argentina. Se requiere proceso judicial nacional.",
        "nna": [
            {
                "nombres": "Facundo",
                "primerApellido": "Navarro",
                "segundoApellido": "Vargas",
                "sexo": "Hombre",
                "fechaNacimiento": "2014-06-10",
            }
        ],
    }

    r_c3 = client.post("/api/sustracion", json=payload_c3, headers=AUTH_HEADERS)
    assert r_c3.status_code == 201, f"Error creando Caso 3: {r_c3.text}"
    data_c3 = r_c3.json()
    id_c3 = data_c3["id"]

    print_step(1, "Caso Creado en API (Régimen de Visitas)", {
        "ID": id_c3,
        "Código": data_c3["codigo"],
        "NNA": f"{data_c3['nna'][0]['nombres']} {data_c3['nna'][0]['primerApellido']}",
        "Edad calculada": f"{data_c3['nna'][0]['edad']} {data_c3['nna'][0]['tipoEdad']}",
    })
    assert data_c3["nna"][0]["edad"] == "12"

    # Paso 2: Evaluación con 2 Requisitos Observados (r3 y r4) y Cómputo de 5 Días Hábiles
    reqs_observados = []
    for i, nom in enumerate(SustracionService.REQUISITOS):
        req_id = f"r{i+1}"
        if req_id in ("r3", "r4"):
            reqs_observados.append({"id": req_id, "nombre": nom, "estado": "Observado"})
        else:
            reqs_observados.append({"id": req_id, "nombre": nom, "estado": "Completo"})

    payload_obs_c3 = {
        "evaluacionResultado": "Observada",
        "requisitos": reqs_observados,
        "fechaObservacion": "2026-07-05",
        "fechaNotificacion": "2026-07-06",
        "ampliacionSubsanacion": "No",
        "detalleSubsanacion": "Se observa acreditación de residencia habitual y copia de resolución previa de visitas.",
    }
    r_obs_c3 = client.put(f"/api/sustracion/{id_c3}/proceso-operativo", json=payload_obs_c3, headers=AUTH_HEADERS)
    assert r_obs_c3.status_code == 200, f"Error en observación Caso 3: {r_obs_c3.text}"
    data_obs_c3 = r_obs_c3.json()

    print_step(2, "Evaluación Observada y Cómputo Legal Automático (5 Días Hábiles)", {
        "Resultado Evaluación": data_obs_c3["procesoOperativo"]["evaluacionResultado"],
        "Fecha Notificación": data_obs_c3["procesoOperativo"]["fechaNotificacion"],
        "Fecha Límite Subsanación (Auto-calculada)": data_obs_c3["procesoOperativo"]["fechaLimiteSubsanacion"],
        "Fase Operativa": data_obs_c3["procesoOperativo"]["faseOperativa"],
    })
    assert data_obs_c3["procesoOperativo"]["fechaLimiteSubsanacion"] == "2026-07-13", "El cómputo de 5 días hábiles desde 2026-07-06 debe ser 2026-07-13"
    assert data_obs_c3["procesoOperativo"]["faseOperativa"] == "Subsanación"

    # Paso 3: Subsanación Levantada a Tiempo
    payload_subsanado_c3 = {
        "fechaRespuestaSubsanacion": "2026-07-10",
        "resultadoSubsanacion": "Subsanó",
        "detalleSubsanacion": "La Autoridad Central de Argentina remitió la documentación completa subsanando los requisitos 3 y 4.",
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }
    r_sub_c3 = client.put(f"/api/sustracion/{id_c3}/proceso-operativo", json=payload_subsanado_c3, headers=AUTH_HEADERS)
    assert r_sub_c3.status_code == 200, f"Error levantando subsanación Caso 3: {r_sub_c3.text}"
    data_sub_c3 = r_sub_c3.json()

    print_step(3, "Subsanación Levantada -> Pasa a Retorno Voluntario / Entrevista", {
        "Resultado Subsanación": data_sub_c3["procesoOperativo"]["resultadoSubsanacion"],
        "Fecha Respuesta": data_sub_c3["procesoOperativo"]["fechaRespuestaSubsanacion"],
        "Fase Operativa": data_sub_c3["procesoOperativo"]["faseOperativa"],
    })
    assert data_sub_c3["procesoOperativo"]["faseOperativa"] == "Retorno voluntario"

    # Paso 4: Entrevista Sin Acuerdo (Rechazo de acuerdo amigable de visitas)
    payload_ent_c3 = {
        "fechaEntrevista": "2026-07-20",
        "resultadoEntrevista": "Rechaza retorno",
        "estadoRetornoVoluntario": "Sin acuerdo",
        "propuestaRetorno": "Se propuso régimen de visitas presencial quincenal y virtual semanal; requerida no aceptó.",
    }
    r_ent_c3 = client.put(f"/api/sustracion/{id_c3}/proceso-operativo", json=payload_ent_c3, headers=AUTH_HEADERS)
    assert r_ent_c3.status_code == 200, f"Error en entrevista Caso 3: {r_ent_c3.text}"
    data_ent_c3 = r_ent_c3.json()

    print_step(4, "Entrevista Concluida Sin Acuerdo -> Transición Directa a Fase Judicial", {
        "Fecha Entrevista": data_ent_c3["fechaEntrevista"],
        "Resultado Entrevista": data_ent_c3["resultadoEntrevista"],
        "Fase Operativa": data_ent_c3["procesoOperativo"]["faseOperativa"],
        "Etapa del Caso": data_ent_c3["etapa"],
    })
    assert data_ent_c3["procesoOperativo"]["faseOperativa"] == "Judicial"
    assert data_ent_c3["etapa"] == "Judicial"

    # Paso 5: Interposición de Demanda Judicial en Juzgado de Familia de Lima
    payload_hist_c3 = {
        "etapa": "Demanda presentada",
        "fecha": "2026-08-01",
        "descripcion": "Demanda de Régimen de Visitas Internacional interpuesta formalmente ante el 15° Juzgado de Familia de Lima.",
        "creadoPor": "CECILIA",
    }
    r_hist_c3 = client.post(f"/api/sustracion/{id_c3}/historial-judicial", json=payload_hist_c3, headers=AUTH_HEADERS)
    assert r_hist_c3.status_code == 201, f"Error registrando demanda Caso 3: {r_hist_c3.text}"

    # Actualizar expediente y juzgado
    payload_jud_datos_c3 = {
        "juzgado": "15° Juzgado de Familia de Lima - Corte Superior de Justicia de Lima",
        "numExpedienteJudicial": "01245-2026-0-1801-JR-FT-15",
    }
    r_upd_c3 = client.put(f"/api/sustracion/{id_c3}", json=payload_jud_datos_c3, headers=AUTH_HEADERS)
    assert r_upd_c3.status_code == 200, f"Error actualizando juzgado Caso 3: {r_upd_c3.text}"
    data_final_c3 = r_upd_c3.json()

    # Segundo hito judicial: Medidas cautelares
    client.post(f"/api/sustracion/{id_c3}/historial-judicial", json={
        "etapa": "Medidas de protección",
        "fecha": "2026-08-15",
        "descripcion": "Resolución N.° 01 admite a trámite la demanda y fija régimen provisorio de comunicación virtual.",
        "creadoPor": "CECILIA",
    }, headers=AUTH_HEADERS)

    # Recargar datos finales del caso
    r_reload_c3 = client.get(f"/api/sustracion/{id_c3}", headers=AUTH_HEADERS)
    data_reload_c3 = r_reload_c3.json()

    print_step(5, "Demanda e Historial Judicial Registrados en Lima", {
        "Juzgado": data_reload_c3["juzgado"],
        "Expediente Judicial": data_reload_c3["numExpedienteJudicial"],
        "Fecha Demanda": data_reload_c3["fechaDemanda"],
        "Estado Judicial": data_reload_c3["estadoJudicial"],
        "Hitos Judiciales Registrados": len(data_reload_c3["historialJudicial"]),
    })
    assert data_reload_c3["estadoJudicial"] == "Medidas de protección"
    assert data_reload_c3["fechaDemanda"] == "2026-08-01"

    resultados_auditoria["casos"].append({
        "caso_num": 3,
        "titulo": "AC Requerida — Observación, Subsanación y Judicial Nacional",
        "codigo": "HT-2026-E2E-03",
        "id": id_c3,
        "pais": "Argentina",
        "acPeru": "Requerida",
        "nna_total": 1,
        "nna_detalle": [{"nombre": "Facundo Navarro Vargas", "edad": "12 Años", "nacimiento": "2014-06-10"}],
        "fase_final": data_reload_c3["procesoOperativo"]["faseOperativa"],
        "etapa_caso": data_reload_c3["etapa"],
        "fecha_limite_subsanacion": data_obs_c3["procesoOperativo"]["fechaLimiteSubsanacion"],
        "juzgado": data_reload_c3["juzgado"],
        "expediente": data_reload_c3["numExpedienteJudicial"],
        "estado_judicial": data_reload_c3["estadoJudicial"],
        "estado": "EXITOSO",
    })

    # =========================================================================
    # AUDITORÍA DE BASE DE DATOS ORACLE Y VERIFICACIÓN DE CONTADORES
    # =========================================================================
    print_section("Auditoría de Persistencia Directa en Base de Datos Oracle (SUSTRACION_DB)")

    with engine.connect() as conn:
        # 1. Verificar registros en CASOS_SUSTRACION
        casos_db = conn.execute(text("""
            SELECT ID, CODIGO, PAIS, ACPERU, ETAPA, ESTADO, ESTADOJUDICIAL, FECHADEMANDA, NUMEXPEDIENTEJUDICIAL, JUZGADO, RETORNO
            FROM SUSTRACION_DB.CASOS_SUSTRACION
            WHERE CODIGO IN ('HT-2026-E2E-01', 'HT-2026-E2E-02', 'HT-2026-E2E-03')
            ORDER BY CODIGO
        """)).fetchall()

        print(f"\n[ORACLE SQL] Casos auditados encontrados: {len(casos_db)} / 3")
        for row in casos_db:
            print(f"   * Código: {row[1]} | País: {row[2]} | AC: {row[3]} | Etapa: {row[4]} | Estado: {row[5]} | Judicial: {row[6]} | Exp: {row[8] or 'N/A'}")

        # 2. Verificar NNA en NNA_SUSTRACION
        nna_db = conn.execute(text("""
            SELECT c.CODIGO, n.NOMBRES, n.PRIMERAPELLIDO, n.EDAD, n.TIPOEDAD, n.FECHANACIMIENTO
            FROM SUSTRACION_DB.NNA_SUSTRACION n
            JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON n.CASOID = c.ID
            WHERE c.CODIGO IN ('HT-2026-E2E-01', 'HT-2026-E2E-02', 'HT-2026-E2E-03')
            ORDER BY c.CODIGO, n.NOMBRES
        """)).fetchall()

        print(f"\n[ORACLE SQL] Registros NNA auditados: {len(nna_db)} (Esperado: 4 NNA en total)")
        for n in nna_db:
            print(f"   * Caso {n[0]}: {n[1]} {n[2]} — {n[3]} {n[4]} (Nac: {n[5]})")

        # 3. Verificar Procesos Operativos en PROCESO_OPERATIVO_SUSTRACION
        proc_db = conn.execute(text("""
            SELECT c.CODIGO, p.FASEOPERATIVA, p.EVALUACIONRESULTADO, p.FECHALIMITESUBSANACION, p.FECHALIMITEPASAJES, p.ESTADOCOOPERACION
            FROM SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACION p
            JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON p.CASOID = c.ID
            WHERE c.CODIGO IN ('HT-2026-E2E-01', 'HT-2026-E2E-02', 'HT-2026-E2E-03')
            ORDER BY c.CODIGO
        """)).fetchall()

        print(f"\n[ORACLE SQL] Procesos Operativos auditados: {len(proc_db)} / 3")
        for p in proc_db:
            print(f"   * Caso {p[0]}: Fase={p[1]} | Eval={p[2]} | LímiteSubsanación={p[3] or 'N/A'} | LímitePasajes={p[4] or 'N/A'} | Coop={p[5] or 'N/A'}")

        # 4. Contadores Globales por Etapa y Fase Operativa
        print_section("Cómputo y Verificación de Contadores de Etapas Globales")

        contadores_fase = conn.execute(text("""
            SELECT NVL(p.FASEOPERATIVA, 'Sin proceso') as FASE, COUNT(*) as TOTAL
            FROM SUSTRACION_DB.CASOS_SUSTRACION c
            LEFT JOIN SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACION p ON c.ID = p.CASOID
            GROUP BY NVL(p.FASEOPERATIVA, 'Sin proceso')
            ORDER BY TOTAL DESC
        """)).fetchall()

        print("\n[MÉTRICAS] Distribución por Fase Operativa (Directiva 006-2021-MIMP):")
        fases_dict = {}
        for f in contadores_fase:
            print(f"   * {f[0]}: {f[1]} expedientes")
            fases_dict[f[0]] = f[1]
        resultados_auditoria["contadores_etapas"]["fases_operativas"] = fases_dict

        contadores_etapa = conn.execute(text("""
            SELECT NVL(ETAPA, 'No definida') as ETAPA, COUNT(*) as TOTAL
            FROM SUSTRACION_DB.CASOS_SUSTRACION
            GROUP BY NVL(ETAPA, 'No definida')
            ORDER BY TOTAL DESC
        """)).fetchall()

        print("\n[MÉTRICAS] Distribución por Etapa Macro (Administrativo vs Judicial):")
        etapas_dict = {}
        for e in contadores_etapa:
            print(f"   * {e[0]}: {e[1]} expedientes")
            etapas_dict[e[0]] = e[1]
        resultados_auditoria["contadores_etapas"]["etapas_macro"] = etapas_dict

        contadores_ac = conn.execute(text("""
            SELECT NVL(ACPERU, 'No definido') as ROL, COUNT(*) as TOTAL
            FROM SUSTRACION_DB.CASOS_SUSTRACION
            GROUP BY NVL(ACPERU, 'No definido')
            ORDER BY TOTAL DESC
        """)).fetchall()

        print("\n[MÉTRICAS] Distribución por Rol de Autoridad Central (Requirente vs Requerida):")
        ac_dict = {}
        for a in contadores_ac:
            print(f"   * {a[0]}: {a[1]} expedientes")
            ac_dict[a[0]] = a[1]
        resultados_auditoria["contadores_etapas"]["rol_ac"] = ac_dict

    # =========================================================================
    # REPORTE DE CONFORMIDAD Y VALIDACIONES NORMATIVAS
    # =========================================================================
    print_section("Validaciones Normativas y de Negocio (Directiva N.° 006-2021-MIMP)")

    checks = [
        ("C1 - Auto-cálculo edad NNA España (Diego, 8 años)", data_c1["nna"][0]["edad"] == "8"),
        ("C1 - Evaluación 8 requisitos completa -> Fase Retorno Voluntario", data_ret_c1["procesoOperativo"]["faseOperativa"] == "Retorno voluntario"),
        ("C1 - Auto-cálculo de 1 mes exacto para pasajes (2026-08-10 -> 2026-09-10)", data_ret_c1["procesoOperativo"]["fechaLimitePasajes"] == "2026-09-10"),
        ("C2 - Soporte Multi-NNA hermanos (Marco 6 años, Alessia 10 años)", len(data_c2["nna"]) == 2 and {n["edad"] for n in data_c2["nna"]} == {"6", "10"}),
        ("C2 - AC Requirente conforme -> Fase Gestión Internacional", data_eval_c2["procesoOperativo"]["faseOperativa"] == "Gestión internacional"),
        ("C2 - Registro de Oficio SGD y transición a Judicial Exterior", data_jud_ext_c2["procesoOperativo"]["faseOperativa"] == "Judicial exterior"),
        ("C3 - Auto-cálculo legal de 5 días hábiles (2026-07-06 -> 2026-07-13)", data_obs_c3["procesoOperativo"]["fechaLimiteSubsanacion"] == "2026-07-13"),
        ("C3 - Subsanación levantada reactiva flujo hacia Retorno/Visitas", data_sub_c3["procesoOperativo"]["faseOperativa"] == "Retorno voluntario"),
        ("C3 - Rechazo de acuerdo amigable conmuta automáticamente a Judicial", data_ent_c3["procesoOperativo"]["faseOperativa"] == "Judicial" and data_ent_c3["etapa"] == "Judicial"),
        ("C3 - Registro de demanda e hitos judiciales en Juzgado de Familia de Lima", data_reload_c3["numExpedienteJudicial"] == "01245-2026-0-1801-JR-FT-15" and data_reload_c3["fechaDemanda"] == "2026-08-01"),
        ("Persistencia SQL en Oracle XE 21c verificada al 100%", len(casos_db) == 3 and len(nna_db) == 4 and len(proc_db) == 3),
    ]

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    for label, passed in checks:
        status = "[CONFORME]   " if passed else "[NO CONFORME]"
        print(f" {status} | {label}")
        resultados_auditoria["validaciones_normativas"].append({"validacion": label, "conforme": passed})

    todos_conformes = all(c[1] for c in checks)
    print("\n" + "=" * 80)
    print(f" RESULTADO GENERAL DE LA AUDITORIA: {'APROBADO (100% CONFORME)' if todos_conformes else 'CON OBSERVACIONES'}")
    print("=" * 80 + "\n")

    return resultados_auditoria


if __name__ == "__main__":
    res = ejecutar_auditoria()
    print("[INFO] Auditoría finalizada exitosamente.")
