"""
========================================================================================
AUDITORÍA DE PRUEBAS END-TO-END (E2E) — 6 CAMINOS OPERATIVOS COMPLETOS
Módulo de Sustracción Internacional — Directiva N.° 006-2021-MIMP / DGNNA
Convenio de La Haya de 1980 sobre Sustracción Internacional de Menores
========================================================================================
Caminos Auditados:
  A. AUTORIDAD CENTRAL REQUIRENTE (Perú Requirente)
     1. REQ-CAMINO-01: Éxito directo por Cooperación y Retorno en el Exterior (EE.UU.)
     2. REQ-CAMINO-02: Observación -> Subsanación -> Proceso Judicial Exterior (Italia)
     3. REQ-CAMINO-03: Inadmisible / Desistimiento / Archivo sin retorno (Chile)

  B. AUTORIDAD CENTRAL REQUERIDA (Perú Requerida)
     4. REQD-CAMINO-01: Éxito Vía Amigable / Retorno Voluntario Nacional (España)
     5. REQD-CAMINO-02: Observación -> Subsanación -> Desacuerdo -> Judicial Nacional (Argentina)
     6. REQD-CAMINO-03: Excepción Art. 13 Convenio / Sentencia Infundada / Archivo (Colombia)
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

# Configuración de autenticación JWT
SESSION_SECRET = os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026")
TOKEN_AUDITOR = jwt.encode(
    {"nombre": "Auditor Senior QA - DGNNA", "sub": "qa-auditor-senior-01", "role": "admin"},
    SESSION_SECRET,
    algorithm="HS256",
)
AUTH_HEADERS = {
    "Authorization": f"Bearer {TOKEN_AUDITOR}",
    "Content-Type": "application/json",
}

client = TestClient(app)

CODIGOS_6_CAMINOS = [
    "REQ-CAMINO-01",
    "REQ-CAMINO-02",
    "REQ-CAMINO-03",
    "REQD-CAMINO-01",
    "REQD-CAMINO-02",
    "REQD-CAMINO-03",
]


def print_banner(title: str):
    print("\n" + "═" * 80)
    print(f"  {title.upper()}")
    print("═" * 80)


def print_step(step_num: int, title: str, details: dict = None):
    print(f"\n  [PASO {step_num}] {title}")
    if details:
        for k, v in details.items():
            print(f"      * {k}: {v}")


def limpiar_casos_db(codigos: list):
    """Limpia casos de prueba previos en Oracle XE para asegurar idempotencia."""
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


def ejecutar_auditoria_6_caminos():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print_banner("INICIO DE AUDITORÍA Y REGISTRO INTEGRAL — 6 CAMINOS OPERATIVOS")
    limpiar_casos_db(CODIGOS_6_CAMINOS)

    audit_results = {
        "fecha_ejecucion": datetime.now().isoformat(),
        "ambiente": "Oracle XE 21c (SUSTRACION_DB) / FastAPI / Directiva N.° 006-2021-MIMP",
        "casos_auditados": [],
        "verificaciones_db": {},
        "conformidad_normativa": [],
    }

    reqs_conforme = [
        {"id": f"r{i+1}", "nombre": nom, "estado": "Completo"}
        for i, nom in enumerate(SustracionService.REQUISITOS)
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # A. CAMINOS DE AC REQUIRENTE (PERÚ ES AUTORIDAD CENTRAL REQUIRENTE)
    # ══════════════════════════════════════════════════════════════════════════

    # ──────────────────────────────────────────────────────────────────────────
    # 1. CASO REQ-CAMINO-01: Éxito directo por Cooperación y Retorno en el Exterior (EE.UU.)
    # ──────────────────────────────────────────────────────────────────────────
    print_banner("1. CASO REQ-CAMINO-01: AC Requirente — Éxito Cooperación y Retorno Exterior (EE.UU.)")

    # Paso 1: Creación
    p_c1 = {
        "codigo": "REQ-CAMINO-01",
        "pais": "Estados Unidos",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requirente",
        "fechaIngreso": "2026-07-01",
        "solicitanteNombre": "Carlos Smith Ramos (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+51 988 112 334",
        "solicitanteCorreo": "carlos.smith@email.pe",
        "solicitanteDomicilio": "Av. Dos de Mayo 850, San Isidro, Lima",
        "requeridoNombre": "Jennifer Bradley (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "+1 305 555 0192",
        "requeridoCorreo": "jennifer.bradley@email.us",
        "requeridoDomicilio": "1200 Brickell Ave, Miami, FL 33131, USA",
        "profesional": "EMMA",
        "estado": "Tramite",
        "observaciones": "REQ-CAMINO-01: Solicitud de restitución de menor trasladado indebidamente a Miami, EE.UU.",
        "nna": [
            {
                "nombres": "Liam Bradley",
                "primerApellido": "Smith",
                "segundoApellido": "Ramos",
                "sexo": "Hombre",
                "fechaNacimiento": "2019-02-14",
            }
        ]
    }
    r1 = client.post("/api/sustracion", json=p_c1, headers=AUTH_HEADERS)
    assert r1.status_code == 201, f"Error C1: {r1.text}"
    c1 = r1.json()
    id_c1 = c1["id"]

    print_step(1, "Expediente Registrado en API", {
        "ID": id_c1,
        "Código": c1["codigo"],
        "Rol AC": c1["acPeru"],
        "NNA": f"{c1['nna'][0]['nombres']} {c1['nna'][0]['primerApellido']}",
        "Edad NNA": f"{c1['nna'][0]['edad']} {c1['nna'][0]['tipoEdad']}",
        "Fase Inicial": c1["procesoOperativo"]["faseOperativa"],
    })
    assert c1["nna"][0]["edad"] == "7"

    # Paso 2: Evaluación Conforme (8/8)
    r1_eval = client.put(f"/api/sustracion/{id_c1}/proceso-operativo", json={
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }, headers=AUTH_HEADERS)
    assert r1_eval.status_code == 200
    c1_eval = r1_eval.json()

    print_step(2, "Evaluación Inicial 100% Conforme", {
        "Resultado": c1_eval["procesoOperativo"]["evaluacionResultado"],
        "Fase Operativa": c1_eval["procesoOperativo"]["faseOperativa"],
    })
    assert c1_eval["procesoOperativo"]["faseOperativa"] == "Gestión internacional"

    # Paso 3: Gestión Internacional con Oficio SGD N.° 0101 a Cancillería MRE y AC de EE.UU.
    r1_gest = client.put(f"/api/sustracion/{id_c1}/proceso-operativo", json={
        "destinatarioGestion": "Office of Children's Issues (OCI) - United States Department of State / Cancillería MRE",
        "tipoComunicacion": "Oficio SGD N.° 0101-2026-MIMP-DGNNA / Transmisión de Solicitud de Restitución",
        "fechaEnvio": "2026-07-10",
        "referenciaSgd": "EXP-2026-SGD-000101 / OFICIO-0101-2026-MIMP-DGNNA",
        "respuestaEsperada": "2026-08-10",
        "proximaAccion": "Coordinación con Departamento de Estado y Autoridad Central estadounidense para facilitación de retorno amigable.",
        "estadoCooperacion": "En seguimiento",
    }, headers=AUTH_HEADERS)
    assert r1_gest.status_code == 200

    # Registrar bitácora de seguimiento
    client.post(f"/api/sustracion/{id_c1}/bitacora", json={
        "fecha": "2026-07-10",
        "texto": "Se emitió y remitió el Oficio SGD N.° 0101-2026-MIMP-DGNNA a Cancillería MRE y a la Autoridad Central de EE.UU.",
        "creadoPor": "EMMA",
    }, headers=AUTH_HEADERS)

    # Conclusión amigable en EE.UU. y vuelo de repatriación
    client.post(f"/api/sustracion/{id_c1}/bitacora", json={
        "fecha": "2026-08-15",
        "texto": "Autoridad Central de EE.UU. (OCI) informa que la madre aceptó acuerdo amigable y se coordinó vuelo de repatriación Miami-Lima con arribo satisfactorio.",
        "creadoPor": "EMMA",
    }, headers=AUTH_HEADERS)

    r1_concl = client.put(f"/api/sustracion/{id_c1}/proceso-operativo", json={
        "estadoCooperacion": "Concluido",
        "respuestaRecibida": "2026-08-15",
        "proximaAccion": "Retorno concretado exitosamente en el exterior. Derivar a archivo definitivo.",
    }, headers=AUTH_HEADERS)
    assert r1_concl.status_code == 200
    assert r1_concl.json()["procesoOperativo"]["faseOperativa"] == "Cierre"

    print_step(3, "Gestión Internacional Exitosa y Transición a Cierre", {
        "Referencia SGD": r1_gest.json()["procesoOperativo"]["referenciaSgd"],
        "Estado Cooperación": r1_concl.json()["procesoOperativo"]["estadoCooperacion"],
        "Fase Operativa": r1_concl.json()["procesoOperativo"]["faseOperativa"],
    })

    # Paso 5: Cierre por Retorno Concretado al 100%
    r1_close = client.put(f"/api/sustracion/{id_c1}", json={
        "estado": "Archivado",
        "fechaSalida": "2026-08-20",
        "motivoCierre": "Retorno voluntario",
        "retorno": "SI",
        "observaciones": "Caso cerrado exitosamente al 100%. NNA Liam Bradley Smith retornó al Perú con acompañamiento consular.",
    }, headers=AUTH_HEADERS)
    assert r1_close.status_code == 200
    c1_final = r1_close.json()

    print_step(5, "Expediente Concluido y Archivado Formalmente", {
        "Estado": c1_final["estado"],
        "Fecha Salida": c1_final["fechaSalida"],
        "Motivo Cierre": c1_final["motivoCierre"],
        "Retorno": c1_final["retorno"],
    })

    audit_results["casos_auditados"].append({
        "codigo": "REQ-CAMINO-01",
        "titulo": "AC Requirente — Éxito Cooperación Exterior (EE.UU.)",
        "id": id_c1,
        "pais": "Estados Unidos",
        "rol_ac": "Requirente",
        "fase_operativa": c1_final["procesoOperativo"]["faseOperativa"],
        "estado": c1_final["estado"],
        "retorno": c1_final["retorno"],
        "motivo_cierre": c1_final["motivoCierre"],
    })

    # ──────────────────────────────────────────────────────────────────────────
    # 2. CASO REQ-CAMINO-02: Observación -> Subsanación -> Proceso Judicial Exterior (Italia)
    # ──────────────────────────────────────────────────────────────────────────
    print_banner("2. CASO REQ-CAMINO-02: AC Requirente — Observación -> Subsanación -> Judicial Exterior (Italia)")

    p_c2 = {
        "codigo": "REQ-CAMINO-02",
        "pais": "Italia",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requirente",
        "fechaIngreso": "2026-07-05",
        "solicitanteNombre": "Giancarlo Flores Ramos (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+51 977 445 566",
        "solicitanteCorreo": "giancarlo.flores@email.pe",
        "solicitanteDomicilio": "Av. Javier Prado Este 2400, San Borja, Lima",
        "requeridoNombre": "Francesca Bianchi Rossi (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "+39 06 6987 1234",
        "requeridoCorreo": "francesca.bianchi@email.it",
        "requeridoDomicilio": "Via Appia Nuova 350, Roma, Italia",
        "profesional": "JANNY",
        "estado": "Tramite",
        "observaciones": "REQ-CAMINO-02: Solicitud con observaciones iniciales que requirió subsanación en Perú y posterior proceso judicial en Roma.",
        "nna": [
            {
                "nombres": "Matteo Bianchi",
                "primerApellido": "Flores",
                "segundoApellido": "Ramos",
                "sexo": "Hombre",
                "fechaNacimiento": "2021-03-20",
            }
        ]
    }
    r2 = client.post("/api/sustracion", json=p_c2, headers=AUTH_HEADERS)
    assert r2.status_code == 201
    c2 = r2.json()
    id_c2 = c2["id"]

    print_step(1, "Expediente Registrado", {
        "ID": id_c2,
        "Código": c2["codigo"],
        "NNA": f"{c2['nna'][0]['nombres']} {c2['nna'][0]['primerApellido']}",
        "Edad NNA": f"{c2['nna'][0]['edad']} {c2['nna'][0]['tipoEdad']}",
    })
    assert c2["nna"][0]["edad"] == "5"

    # Paso 2: Evaluación con 2 Observaciones (r2 y r6) y auto-cálculo 5 días hábiles
    reqs_obs_c2 = []
    for i, nom in enumerate(SustracionService.REQUISITOS):
        rid = f"r{i+1}"
        estado = "Observado" if rid in ("r2", "r6") else "Completo"
        reqs_obs_c2.append({"id": rid, "nombre": nom, "estado": estado})

    r2_obs = client.put(f"/api/sustracion/{id_c2}/proceso-operativo", json={
        "evaluacionResultado": "Observada",
        "requisitos": reqs_obs_c2,
        "fechaObservacion": "2026-07-06",
        "fechaNotificacion": "2026-07-06",
        "ampliacionSubsanacion": "No",
        "detalleSubsanacion": "Se requiere adjuntar copia legalizada de la partida de nacimiento traducida y acreditación de ejercicio conjunto de patria potestad.",
    }, headers=AUTH_HEADERS)
    assert r2_obs.status_code == 200
    c2_obs = r2_obs.json()

    print_step(2, "Evaluación Observada y Cómputo de Plazo de 5 Días Hábiles", {
        "Resultado Evaluación": c2_obs["procesoOperativo"]["evaluacionResultado"],
        "Fecha Notificación": c2_obs["procesoOperativo"]["fechaNotificacion"],
        "Fecha Límite Subsanación (Auto-calculada)": c2_obs["procesoOperativo"]["fechaLimiteSubsanacion"],
        "Fase Operativa": c2_obs["procesoOperativo"]["faseOperativa"],
    })
    assert c2_obs["procesoOperativo"]["fechaLimiteSubsanacion"] == "2026-07-13"
    assert c2_obs["procesoOperativo"]["faseOperativa"] == "Subsanación"

    # Paso 2.2: Subsanación levantada por padre solicitante en Perú
    r2_sub = client.put(f"/api/sustracion/{id_c2}/proceso-operativo", json={
        "fechaRespuestaSubsanacion": "2026-07-10",
        "resultadoSubsanacion": "Subsanó",
        "detalleSubsanacion": "Padre solicitante presentó partida de nacimiento legalizada con apostilla y traducción oficial al italiano.",
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }, headers=AUTH_HEADERS)
    assert r2_sub.status_code == 200
    c2_sub = r2_sub.json()

    print_step(2.2, "Subsanación Levantada -> Pasa a Gestión Internacional", {
        "Resultado Subsanación": c2_sub["procesoOperativo"]["resultadoSubsanacion"],
        "Fase Operativa": c2_sub["procesoOperativo"]["faseOperativa"],
    })
    assert c2_sub["procesoOperativo"]["faseOperativa"] == "Gestión internacional"

    # Paso 3: Gestión Internacional con Oficio SGD N.° 0102
    r2_gest = client.put(f"/api/sustracion/{id_c2}/proceso-operativo", json={
        "destinatarioGestion": "Ministero della Giustizia - Dipartimento per la Giustizia Minorile, Roma, Italia",
        "tipoComunicacion": "Oficio SGD N.° 0102-2026-MIMP-DGNNA / Transmisión de Solicitud",
        "fechaEnvio": "2026-07-15",
        "referenciaSgd": "EXP-2026-SGD-000102 / OFICIO-0102-2026-MIMP-DGNNA",
        "respuestaEsperada": "2026-08-15",
        "proximaAccion": "Remisión de expediente a la Autoridad Central italiana para trámite judicial.",
        "estadoCooperacion": "Proceso judicial exterior",
        "respuestaRecibida": "2026-08-01",
    }, headers=AUTH_HEADERS)
    assert r2_gest.status_code == 200
    c2_gest = r2_gest.json()

    # Paso 4: Judicial Exterior con medidas cautelares dictadas en Roma
    client.post(f"/api/sustracion/{id_c2}/bitacora", json={
        "fecha": "2026-08-01",
        "texto": "Autoridad Central italiana confirma inicio de proceso ante el Tribunale per i Minorenni di Roma (Exp. N.° TMR-2026-4412). Se dictaron medidas cautelares de arraigo y prohibición de salida.",
        "creadoPor": "JANNY",
    }, headers=AUTH_HEADERS)

    # Actualizar estado judicial exterior en caso
    client.put(f"/api/sustracion/{id_c2}", json={
        "estadoJudicial": "Medidas cautelares dictadas",
        "juzgado": "Tribunale per i Minorenni di Roma - Sezione Famiglia",
        "numExpedienteJudicial": "TMR-2026-4412",
        "observaciones": "Proceso judicial exterior en trámite ante tribunal de menores de Roma con medidas cautelares activas.",
    }, headers=AUTH_HEADERS)

    r2_final = client.get(f"/api/sustracion/{id_c2}", headers=AUTH_HEADERS).json()

    print_step(4, "Seguimiento de Proceso Judicial Exterior en Roma", {
        "Fase Operativa": r2_final["procesoOperativo"]["faseOperativa"],
        "Tribunal Exterior": r2_final["juzgado"],
        "Expediente Exterior": r2_final["numExpedienteJudicial"],
        "Estado Judicial": r2_final["estadoJudicial"],
        "Estado Expediente": r2_final["estado"],
    })
    assert r2_final["procesoOperativo"]["faseOperativa"] == "Judicial exterior"

    audit_results["casos_auditados"].append({
        "codigo": "REQ-CAMINO-02",
        "titulo": "AC Requirente — Subsanación y Judicial Exterior (Italia)",
        "id": id_c2,
        "pais": "Italia",
        "rol_ac": "Requirente",
        "fase_operativa": r2_final["procesoOperativo"]["faseOperativa"],
        "estado": r2_final["estado"],
        "estado_judicial": r2_final["estadoJudicial"],
        "juzgado": r2_final["juzgado"],
    })

    # ──────────────────────────────────────────────────────────────────────────
    # 3. CASO REQ-CAMINO-03: Inadmisible / Desistimiento / Archivo sin retorno (Chile)
    # ──────────────────────────────────────────────────────────────────────────
    print_banner("3. CASO REQ-CAMINO-03: AC Requirente — Inadmisible / Desistimiento / Archivo (Chile)")

    p_c3 = {
        "codigo": "REQ-CAMINO-03",
        "pais": "Chile",
        "tipoSolicitud": "Régimen de Visitas",
        "acPeru": "Requirente",
        "fechaIngreso": "2026-07-20",
        "solicitanteNombre": "Rodrigo Soto Peña (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+51 966 332 119",
        "solicitanteCorreo": "rodrigo.soto@email.pe",
        "solicitanteDomicilio": "Av. Arequipa 1850, Lince, Lima",
        "requeridoNombre": "Marcela Valenzuela Castro (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "+56 9 8765 4321",
        "requeridoCorreo": "marcela.valenzuela@email.cl",
        "requeridoDomicilio": "Av. Providencia 2200, Santiago, Chile",
        "profesional": "CECILIA",
        "estado": "Tramite",
        "observaciones": "REQ-CAMINO-03: Solicitud de régimen de visitas. Solicitante desiste formalmente por acuerdo privado extra-convenio.",
        "nna": [
            {
                "nombres": "Valentina",
                "primerApellido": "Soto",
                "segundoApellido": "Valenzuela",
                "sexo": "Mujer",
                "fechaNacimiento": "2017-06-11",
            }
        ]
    }
    r3 = client.post("/api/sustracion", json=p_c3, headers=AUTH_HEADERS)
    assert r3.status_code == 201
    c3 = r3.json()
    id_c3 = c3["id"]

    print_step(1, "Expediente Registrado", {
        "ID": id_c3,
        "Código": c3["codigo"],
        "Tipo Solicitud": c3["tipoSolicitud"],
        "NNA": f"{c3['nna'][0]['nombres']} {c3['nna'][0]['primerApellido']}",
        "Edad NNA": f"{c3['nna'][0]['edad']} {c3['nna'][0]['tipoEdad']}",
    })
    assert c3["nna"][0]["edad"] == "9"

    # Paso 2: Evaluación Inicial No Conforme / Desistimiento formal del solicitante
    r3_eval = client.put(f"/api/sustracion/{id_c3}/proceso-operativo", json={
        "evaluacionResultado": "No corresponde",
        "detalleSubsanacion": "El padre solicitante presentó escrito formal de desistimiento al haber arribado a un acuerdo privado directo con la madre.",
    }, headers=AUTH_HEADERS)
    assert r3_eval.status_code == 200
    c3_eval = r3_eval.json()

    print_step(2, "Evaluación: No Corresponde / Desistimiento -> Derivación Directa a Cierre", {
        "Resultado Evaluación": c3_eval["procesoOperativo"]["evaluacionResultado"],
        "Fase Operativa": c3_eval["procesoOperativo"]["faseOperativa"],
    })
    assert c3_eval["procesoOperativo"]["faseOperativa"] == "Cierre"

    # Bitácora
    client.post(f"/api/sustracion/{id_c3}/bitacora", json={
        "fecha": "2026-07-25",
        "texto": "Ingreso de escrito con firma legalizada del solicitante desistiendo formalmente del procedimiento internacional.",
        "creadoPor": "CECILIA",
    }, headers=AUTH_HEADERS)

    # Paso 5: Cierre formal por desistimiento
    r3_close = client.put(f"/api/sustracion/{id_c3}", json={
        "estado": "Archivado",
        "fechaSalida": "2026-08-10",
        "motivoCierre": "Desistimiento del solicitante",
        "retorno": "NO",
        "observaciones": "Expediente archivado por desistimiento formal voluntario del solicitante.",
    }, headers=AUTH_HEADERS)
    assert r3_close.status_code == 200
    c3_final = r3_close.json()

    print_step(5, "Expediente Concluido y Archivado por Desistimiento", {
        "Estado": c3_final["estado"],
        "Fecha Salida": c3_final["fechaSalida"],
        "Motivo Cierre": c3_final["motivoCierre"],
        "Retorno": c3_final["retorno"],
    })

    audit_results["casos_auditados"].append({
        "codigo": "REQ-CAMINO-03",
        "titulo": "AC Requirente — Desistimiento y Cierre (Chile)",
        "id": id_c3,
        "pais": "Chile",
        "rol_ac": "Requirente",
        "fase_operativa": c3_final["procesoOperativo"]["faseOperativa"],
        "estado": c3_final["estado"],
        "retorno": c3_final["retorno"],
        "motivo_cierre": c3_final["motivoCierre"],
    })

    # ══════════════════════════════════════════════════════════════════════════
    # B. CAMINOS DE AC REQUERIDA (PERÚ ES AUTORIDAD CENTRAL REQUERIDA)
    # ══════════════════════════════════════════════════════════════════════════

    # ──────────────────────────────────────────────────────────────────────────
    # 4. CASO REQD-CAMINO-01: Éxito Vía Amigable / Retorno Voluntario Nacional (España)
    # ──────────────────────────────────────────────────────────────────────────
    print_banner("4. CASO REQD-CAMINO-01: AC Requerida — Éxito Vía Amigable y Retorno Voluntario (España)")

    p_c4 = {
        "codigo": "REQD-CAMINO-01",
        "pais": "España",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-07-01",
        "solicitanteNombre": "Javier Navarro Sanz (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+34 611 223 344",
        "solicitanteCorreo": "javier.navarro@email.es",
        "solicitanteDomicilio": "Paseo de la Castellana 100, Madrid, España",
        "requeridoNombre": "Patricia Gómez Alva (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "+51 991 778 899",
        "requeridoCorreo": "patricia.gomez@email.pe",
        "requeridoDomicilio": "Calle Alcanfores 450, Miraflores, Lima",
        "profesional": "EMMA",
        "estado": "Tramite",
        "observaciones": "REQD-CAMINO-01: Solicitud de restitución remitida por AC de España. Retorno voluntario exitoso en MIMP.",
        "nna": [
            {
                "nombres": "Lucas",
                "primerApellido": "Navarro",
                "segundoApellido": "Gómez",
                "sexo": "Hombre",
                "fechaNacimiento": "2018-05-15",
            }
        ]
    }
    r4 = client.post("/api/sustracion", json=p_c4, headers=AUTH_HEADERS)
    assert r4.status_code == 201
    c4 = r4.json()
    id_c4 = c4["id"]

    print_step(1, "Expediente Registrado", {
        "ID": id_c4,
        "Código": c4["codigo"],
        "Rol AC": c4["acPeru"],
        "NNA": f"{c4['nna'][0]['nombres']} {c4['nna'][0]['primerApellido']}",
        "Edad NNA": f"{c4['nna'][0]['edad']} {c4['nna'][0]['tipoEdad']}",
    })
    assert c4["nna"][0]["edad"] == "8"

    # Paso 2: Evaluación Inicial Conforme (8/8) -> Pasa a Retorno Voluntario
    r4_eval = client.put(f"/api/sustracion/{id_c4}/proceso-operativo", json={
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }, headers=AUTH_HEADERS)
    assert r4_eval.status_code == 200
    c4_eval = r4_eval.json()

    print_step(2, "Evaluación Inicial 100% Conforme", {
        "Fase Operativa": c4_eval["procesoOperativo"]["faseOperativa"],
    })
    assert c4_eval["procesoOperativo"]["faseOperativa"] == "Retorno voluntario"

    # Paso 3: Entrevista amigable en MIMP con acuerdo firmado y auto-cálculo de 1 mes de pasajes
    r4_ret = client.put(f"/api/sustracion/{id_c4}/proceso-operativo", json={
        "fechaEntrevista": "2026-08-01",
        "resultadoEntrevista": "Acepta retorno voluntario",
        "estadoRetornoVoluntario": "Acuerdo alcanzado",
        "fechaAcuerdo": "2026-08-01",
        "propuestaRetorno": "Retorno amigable a Madrid con acompañamiento materno; padre cubre pasajes aéreos.",
        "fechaPrevistaRetorno": "2026-08-20",
        "compromisosRetorno": "El padre envía billetes de vuelo Madrid-Lima-Madrid y madre tramita autorización de viaje.",
    }, headers=AUTH_HEADERS)
    assert r4_ret.status_code == 200
    c4_ret = r4_ret.json()

    print_step(3, "Acuerdo Suscrito y Auto-cálculo Legal de Pasajes (1 Mes)", {
        "Fecha Entrevista": c4_ret["fechaEntrevista"],
        "Resultado Entrevista": c4_ret["resultadoEntrevista"],
        "Fecha Acuerdo": c4_ret["procesoOperativo"]["fechaAcuerdo"],
        "Fecha Límite Pasajes (Auto-calculada 1 Mes)": c4_ret["procesoOperativo"]["fechaLimitePasajes"],
    })
    assert c4_ret["procesoOperativo"]["fechaLimitePasajes"] == "2026-09-01"

    # Emisión de pasajes y retorno efectivo ejecutado
    r4_efec = client.put(f"/api/sustracion/{id_c4}/proceso-operativo", json={
        "pasajesRecibidos": "2026-08-15",
        "fechaRetornoEfectivo": "2026-08-20",
    }, headers=AUTH_HEADERS)
    assert r4_efec.status_code == 200
    c4_efec = r4_efec.json()

    print_step(3.2, "Retorno Voluntario Ejecutado Efectivamente -> Conmuta a Cierre", {
        "Pasajes Recibidos": c4_efec["procesoOperativo"]["pasajesRecibidos"],
        "Fecha Retorno Efectivo": c4_efec["procesoOperativo"]["fechaRetornoEfectivo"],
        "Fase Operativa": c4_efec["procesoOperativo"]["faseOperativa"],
        "Retorno Registrado en Caso": c4_efec["retorno"],
    })
    assert c4_efec["procesoOperativo"]["faseOperativa"] == "Cierre"
    assert c4_efec["retorno"] == "SI"

    # Bitácora
    client.post(f"/api/sustracion/{id_c4}/bitacora", json={
        "fecha": "2026-08-20",
        "texto": "Se constató en el Aeropuerto Jorge Chávez el embarque del NNA Lucas Navarro rumbo a Madrid, España en vuelo directo.",
        "creadoPor": "EMMA",
    }, headers=AUTH_HEADERS)

    # Paso 5: Cierre por Retorno Voluntario Efectuado
    r4_close = client.put(f"/api/sustracion/{id_c4}", json={
        "estado": "Archivado",
        "fechaSalida": "2026-08-20",
        "motivoCierre": "Retorno voluntario",
        "retorno": "SI",
        "observaciones": "Expediente archivado formalmente tras retorno voluntario 100% concretado a España.",
    }, headers=AUTH_HEADERS)
    assert r4_close.status_code == 200
    c4_final = r4_close.json()

    print_step(5, "Expediente Archivado Formalmente", {
        "Estado": c4_final["estado"],
        "Fecha Salida": c4_final["fechaSalida"],
        "Motivo Cierre": c4_final["motivoCierre"],
        "Retorno": c4_final["retorno"],
    })

    audit_results["casos_auditados"].append({
        "codigo": "REQD-CAMINO-01",
        "titulo": "AC Requerida — Retorno Voluntario Nacional (España)",
        "id": id_c4,
        "pais": "España",
        "rol_ac": "Requerida",
        "fase_operativa": c4_final["procesoOperativo"]["faseOperativa"],
        "estado": c4_final["estado"],
        "retorno": c4_final["retorno"],
        "fecha_limite_pasajes": c4_ret["procesoOperativo"]["fechaLimitePasajes"],
    })

    # ──────────────────────────────────────────────────────────────────────────
    # 5. CASO REQD-CAMINO-02: Observación -> Subsanación -> Desacuerdo -> Judicial Nacional (Argentina)
    # ──────────────────────────────────────────────────────────────────────────
    print_banner("5. CASO REQD-CAMINO-02: AC Requerida — Subsanación -> Desacuerdo -> Judicial Nacional (Argentina)")

    p_c5 = {
        "codigo": "REQD-CAMINO-02",
        "pais": "Argentina",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-07-01",
        "solicitanteNombre": "Martín Fernández Silva (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+54 11 4455 6677",
        "solicitanteCorreo": "martin.fernandez@email.ar",
        "solicitanteDomicilio": "Av. Santa Fe 3200, Buenos Aires, Argentina",
        "requeridoNombre": "Luciana Rojas Paz (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "+51 988 554 433",
        "requeridoCorreo": "luciana.rojas@email.pe",
        "requeridoDomicilio": "Av. Benavides 2800, Surco, Lima",
        "profesional": "CECILIA",
        "estado": "Tramite",
        "observaciones": "REQD-CAMINO-02: Solicitud remitida por SENAF Argentina con observación inicial, subsanada y judicializada en Lima.",
        "nna": [
            {
                "nombres": "Joaquín",
                "primerApellido": "Fernández",
                "segundoApellido": "Rojas",
                "sexo": "Hombre",
                "fechaNacimiento": "2015-01-25",
            }
        ]
    }
    r5 = client.post("/api/sustracion", json=p_c5, headers=AUTH_HEADERS)
    assert r5.status_code == 201
    c5 = r5.json()
    id_c5 = c5["id"]

    print_step(1, "Expediente Registrado", {
        "ID": id_c5,
        "Código": c5["codigo"],
        "NNA": f"{c5['nna'][0]['nombres']} {c5['nna'][0]['primerApellido']}",
        "Edad NNA": f"{c5['nna'][0]['edad']} {c5['nna'][0]['tipoEdad']}",
    })
    assert c5["nna"][0]["edad"] == "11"

    # Paso 2: Evaluación con 2 observaciones (r3 y r4) y auto-cálculo 5 días hábiles
    reqs_obs_c5 = []
    for i, nom in enumerate(SustracionService.REQUISITOS):
        rid = f"r{i+1}"
        estado = "Observado" if rid in ("r3", "r4") else "Completo"
        reqs_obs_c5.append({"id": rid, "nombre": nom, "estado": estado})

    r5_obs = client.put(f"/api/sustracion/{id_c5}/proceso-operativo", json={
        "evaluacionResultado": "Observada",
        "requisitos": reqs_obs_c5,
        "fechaObservacion": "2026-07-06",
        "fechaNotificacion": "2026-07-06",
        "ampliacionSubsanacion": "No",
        "detalleSubsanacion": "Se solicita a SENAF Argentina remitir certificado de residencia habitual y copia de resolución de tenencia.",
    }, headers=AUTH_HEADERS)
    assert r5_obs.status_code == 200
    c5_obs = r5_obs.json()

    print_step(2, "Evaluación Observada y Plazo Legal Auto-calculado", {
        "Fecha Notificación": c5_obs["procesoOperativo"]["fechaNotificacion"],
        "Fecha Límite Subsanación (5 días hábiles)": c5_obs["procesoOperativo"]["fechaLimiteSubsanacion"],
        "Fase Operativa": c5_obs["procesoOperativo"]["faseOperativa"],
    })
    assert c5_obs["procesoOperativo"]["fechaLimiteSubsanacion"] == "2026-07-13"

    # Paso 2.2: Subsanación levantada por SENAF Argentina
    r5_sub = client.put(f"/api/sustracion/{id_c5}/proceso-operativo", json={
        "fechaRespuestaSubsanacion": "2026-07-10",
        "resultadoSubsanacion": "Subsanó",
        "detalleSubsanacion": "SENAF remitió la documentación completa y legalizada requerida.",
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }, headers=AUTH_HEADERS)
    assert r5_sub.status_code == 200
    assert r5_sub.json()["procesoOperativo"]["faseOperativa"] == "Retorno voluntario"

    # Paso 3: Entrevista sin acuerdo (Madre rechaza retorno) -> Conmuta a Judicial
    r5_ent = client.put(f"/api/sustracion/{id_c5}/proceso-operativo", json={
        "fechaEntrevista": "2026-07-20",
        "resultadoEntrevista": "Rechaza retorno",
        "estadoRetornoVoluntario": "Sin acuerdo",
        "propuestaRetorno": "Se propuso retorno con asistencia legal y psicológica; la madre se negó rotundamente a firmar.",
    }, headers=AUTH_HEADERS)
    assert r5_ent.status_code == 200
    c5_ent = r5_ent.json()

    print_step(3, "Entrevista Concluida Sin Acuerdo -> Transición Automática a Judicial", {
        "Fecha Entrevista": c5_ent["fechaEntrevista"],
        "Resultado Entrevista": c5_ent["resultadoEntrevista"],
        "Fase Operativa": c5_ent["procesoOperativo"]["faseOperativa"],
        "Etapa del Caso": c5_ent["etapa"],
    })
    assert c5_ent["procesoOperativo"]["faseOperativa"] == "Judicial"
    assert c5_ent["etapa"] == "Judicial"

    # Paso 4: Demanda en 15° Juzgado de Familia de Lima e Hitos Judiciales
    # Hito 1: Demanda presentada
    client.post(f"/api/sustracion/{id_c5}/historial-judicial", json={
        "etapa": "Demanda presentada",
        "fecha": "2026-08-01",
        "descripcion": "Demanda de Restitución Internacional interpuesta formalmente ante el 15° Juzgado de Familia de Lima.",
        "creadoPor": "CECILIA",
    }, headers=AUTH_HEADERS)

    # Actualizar juzgado y expediente
    client.put(f"/api/sustracion/{id_c5}", json={
        "juzgado": "15° Juzgado de Familia de Lima - Corte Superior de Justicia de Lima",
        "numExpedienteJudicial": "01588-2026-0-1801-JR-FC-15",
    }, headers=AUTH_HEADERS)

    # Hito 2: Audiencia única de pruebas
    client.post(f"/api/sustracion/{id_c5}/historial-judicial", json={
        "etapa": "En audiencia",
        "fecha": "2026-08-10",
        "descripcion": "Audiencia única de pruebas y escucha reservada del menor Joaquín Fernández.",
        "creadoPor": "CECILIA",
    }, headers=AUTH_HEADERS)

    # Hito 3: Sentencia Fundada de Restitución
    client.post(f"/api/sustracion/{id_c5}/historial-judicial", json={
        "etapa": "Sentencia 1ra instancia",
        "fecha": "2026-08-20",
        "descripcion": "Resolución N.° 05: Sentencia que declara FUNDADA la demanda de restitución internacional y ordena el retorno inmediato a la República Argentina.",
        "creadoPor": "CECILIA",
    }, headers=AUTH_HEADERS)

    # Actualizar sentencia en caso
    client.put(f"/api/sustracion/{id_c5}", json={
        "sentencia1ra": "Resolución N.° 05: Declarar FUNDADA la solicitud de restitución internacional de NNA a la República Argentina.",
    }, headers=AUTH_HEADERS)

    r5_final = client.get(f"/api/sustracion/{id_c5}", headers=AUTH_HEADERS).json()

    print_step(4, "Proceso Judicial Nacional con Sentencia Fundada", {
        "Juzgado": r5_final["juzgado"],
        "Expediente CEJ": r5_final["numExpedienteJudicial"],
        "Fecha Demanda": r5_final["fechaDemanda"],
        "Estado Judicial": r5_final["estadoJudicial"],
        "Sentencia 1ra Instancia": r5_final["sentencia1ra"],
        "Total Hitos Judiciales": len(r5_final["historialJudicial"]),
    })
    assert r5_final["estadoJudicial"] == "Sentencia 1ra instancia"
    assert r5_final["fechaDemanda"] == "2026-08-01"

    audit_results["casos_auditados"].append({
        "codigo": "REQD-CAMINO-02",
        "titulo": "AC Requerida — Judicial Nacional con Sentencia Fundada (Argentina)",
        "id": id_c5,
        "pais": "Argentina",
        "rol_ac": "Requerida",
        "fase_operativa": r5_final["procesoOperativo"]["faseOperativa"],
        "estado": r5_final["estado"],
        "juzgado": r5_final["juzgado"],
        "expediente": r5_final["numExpedienteJudicial"],
        "estado_judicial": r5_final["estadoJudicial"],
    })

    # ──────────────────────────────────────────────────────────────────────────
    # 6. CASO REQD-CAMINO-03: Excepción Art. 13 Convenio / Sentencia Infundada / Archivo (Colombia)
    # ──────────────────────────────────────────────────────────────────────────
    print_banner("6. CASO REQD-CAMINO-03: AC Requerida — Excepción Art. 13 Convenio / Sentencia Infundada / Archivo (Colombia)")

    p_c6 = {
        "codigo": "REQD-CAMINO-03",
        "pais": "Colombia",
        "tipoSolicitud": "Restitución",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-06-01",
        "solicitanteNombre": "Andrés Restrepo Londoño (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+57 310 987 6543",
        "solicitanteCorreo": "andres.restrepo@email.co",
        "solicitanteDomicilio": "Carrera 7 N.° 72-10, Bogotá, Colombia",
        "requeridoNombre": "Claudia Chávez Morales (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "+51 987 665 544",
        "requeridoCorreo": "claudia.chavez@email.pe",
        "requeridoDomicilio": "Calle Monterrey 320, San Borja, Lima",
        "profesional": "JANNY",
        "estado": "Tramite",
        "observaciones": "REQD-CAMINO-03: Demanda judicial con oposición sustentada en grave riesgo (Art. 13.b Convenio de La Haya). Sentencia Infundada firme y archivo.",
        "nna": [
            {
                "nombres": "Mariana",
                "primerApellido": "Restrepo",
                "segundoApellido": "Chávez",
                "sexo": "Mujer",
                "fechaNacimiento": "2019-04-03",
            }
        ]
    }
    r6 = client.post("/api/sustracion", json=p_c6, headers=AUTH_HEADERS)
    assert r6.status_code == 201
    c6 = r6.json()
    id_c6 = c6["id"]

    print_step(1, "Expediente Registrado", {
        "ID": id_c6,
        "Código": c6["codigo"],
        "NNA": f"{c6['nna'][0]['nombres']} {c6['nna'][0]['primerApellido']}",
        "Edad NNA": f"{c6['nna'][0]['edad']} {c6['nna'][0]['tipoEdad']}",
    })
    assert c6["nna"][0]["edad"] == "7"

    # Paso 2: Evaluación Inicial Conforme (8/8)
    client.put(f"/api/sustracion/{id_c6}/proceso-operativo", json={
        "evaluacionResultado": "Completa",
        "requisitos": reqs_conforme,
    }, headers=AUTH_HEADERS)

    # Paso 3: Entrevista sin acuerdo (Alegación de grave riesgo Art. 13.b)
    r6_ent = client.put(f"/api/sustracion/{id_c6}/proceso-operativo", json={
        "fechaEntrevista": "2026-06-15",
        "resultadoEntrevista": "Rechaza retorno",
        "estadoRetornoVoluntario": "Sin acuerdo",
        "propuestaRetorno": "Madre alega grave riesgo de daño psíquico y físico del menor según Art. 13.b de La Haya y rechaza retorno.",
    }, headers=AUTH_HEADERS)
    assert r6_ent.status_code == 200
    assert r6_ent.json()["procesoOperativo"]["faseOperativa"] == "Judicial"

    # Paso 4: Proceso Judicial Nacional
    # Hito 1: Demanda presentada
    client.post(f"/api/sustracion/{id_c6}/historial-judicial", json={
        "etapa": "Demanda presentada",
        "fecha": "2026-06-25",
        "descripcion": "Demanda interpuesta formalmente ante el 3° Juzgado de Familia de Lima.",
        "creadoPor": "JANNY",
    }, headers=AUTH_HEADERS)

    client.put(f"/api/sustracion/{id_c6}", json={
        "juzgado": "3° Juzgado de Familia de Lima - CSJ Lima",
        "numExpedienteJudicial": "00842-2026-0-1801-JR-FC-03",
    }, headers=AUTH_HEADERS)

    # Hito 2: Audiencia y pericia psicológica
    client.post(f"/api/sustracion/{id_c6}/historial-judicial", json={
        "etapa": "En audiencia",
        "fecha": "2026-07-15",
        "descripcion": "Audiencia única y evaluación psicológica forense del Instituto de Medicina Legal.",
        "creadoPor": "JANNY",
    }, headers=AUTH_HEADERS)

    # Hito 3: Sentencia Infundada (Excepción Art. 13.b acreditada)
    client.post(f"/api/sustracion/{id_c6}/historial-judicial", json={
        "etapa": "Sentencia 1ra instancia",
        "fecha": "2026-08-05",
        "descripcion": "Resolución N.° 07: Sentencia declara INFUNDADA la restitución al acreditarse excepción de grave riesgo (Art. 13.b Convenio de La Haya).",
        "creadoPor": "JANNY",
    }, headers=AUTH_HEADERS)

    # Hito 4: Consentida y ejecutoriada
    client.post(f"/api/sustracion/{id_c6}/historial-judicial", json={
        "etapa": "Sentencia consentida/ejecutoriada",
        "fecha": "2026-08-15",
        "descripcion": "Resolución N.° 08: Se declara consentida y ejecutoriada la sentencia de primera instancia al no haberse interpuesto recurso de apelación.",
        "creadoPor": "JANNY",
    }, headers=AUTH_HEADERS)

    # Actualizar sentencia y proceso
    client.put(f"/api/sustracion/{id_c6}", json={
        "sentencia1ra": "Resolución N.° 07: Declarar INFUNDADA la demanda por configurarse excepción del Art. 13.b del Convenio de La Haya.",
    }, headers=AUTH_HEADERS)

    # Transición de proceso a Cierre
    r6_proc_cie = client.put(f"/api/sustracion/{id_c6}/proceso-operativo", json={
        "faseOperativa": "Cierre",
        "proximaAccion": "Sentencia judicial firme denegó restitución. Proceder con archivo definitivo de actuados.",
    }, headers=AUTH_HEADERS)
    assert r6_proc_cie.status_code == 200

    # Paso 5: Cierre por Sentencia Judicial Firme que deniega restitución
    r6_close = client.put(f"/api/sustracion/{id_c6}", json={
        "estado": "Archivado",
        "fechaSalida": "2026-08-18",
        "motivoCierre": "Sentencia infundada - Art. 13 B",
        "retorno": "NO",
        "observaciones": "Expediente archivado definitivamente por Sentencia Judicial Firme del 3° Juzgado de Familia de Lima que declaró infundada la restitución por excepción de grave riesgo (Art. 13.b).",
    }, headers=AUTH_HEADERS)
    assert r6_close.status_code == 200
    c6_final = r6_close.json()

    print_step(5, "Expediente Concluido y Archivado por Sentencia Firme (Art. 13.b)", {
        "Estado": c6_final["estado"],
        "Fecha Salida": c6_final["fechaSalida"],
        "Motivo Cierre": c6_final["motivoCierre"],
        "Retorno": c6_final["retorno"],
        "Sentencia 1ra": c6_final["sentencia1ra"],
        "Estado Judicial": c6_final["estadoJudicial"],
    })

    audit_results["casos_auditados"].append({
        "codigo": "REQD-CAMINO-03",
        "titulo": "AC Requerida — Sentencia Infundada Art. 13.b y Archivo (Colombia)",
        "id": id_c6,
        "pais": "Colombia",
        "rol_ac": "Requerida",
        "fase_operativa": c6_final["procesoOperativo"]["faseOperativa"],
        "estado": c6_final["estado"],
        "retorno": c6_final["retorno"],
        "motivo_cierre": c6_final["motivoCierre"],
        "juzgado": c6_final["juzgado"],
        "expediente": c6_final["numExpedienteJudicial"],
        "estado_judicial": c6_final["estadoJudicial"],
    })

    # ══════════════════════════════════════════════════════════════════════════
    # AUDITORÍA DIRECTA EN BASE DE DATOS ORACLE XE (SUSTRACION_DB)
    # ══════════════════════════════════════════════════════════════════════════
    print_banner("VERIFICACIÓN DIRECTA DE PERSISTENCIA EN ORACLE XE (SUSTRACION_DB)")

    with engine.connect() as conn:
        # 1. CASOS_SUSTRACION
        casos_sql = conn.execute(text("""
            SELECT ID, CODIGO, PAIS, ACPERU, ETAPA, ESTADO, ESTADOJUDICIAL, FECHADEMANDA, NUMEXPEDIENTEJUDICIAL, JUZGADO, RETORNO, MOTIVOCIERRE
            FROM SUSTRACION_DB.CASOS_SUSTRACION
            WHERE CODIGO IN ('REQ-CAMINO-01', 'REQ-CAMINO-02', 'REQ-CAMINO-03', 'REQD-CAMINO-01', 'REQD-CAMINO-02', 'REQD-CAMINO-03')
            ORDER BY CODIGO
        """)).fetchall()

        print(f"\n[ORACLE SQL] CASOS_SUSTRACION: {len(casos_sql)} / 6 registros verificados:")
        for r in casos_sql:
            print(f"  * Código: {r[1]:<14} | País: {r[2]:<14} | AC: {r[3]:<10} | Etapa: {r[4]:<13} | Estado: {r[5]:<10} | Retorno: {r[10] or 'N/A':<6} | Cierre: {r[11] or 'N/A'}")
        audit_results["verificaciones_db"]["casos_count"] = len(casos_sql)

        # 2. NNA_SUSTRACION
        nna_sql = conn.execute(text("""
            SELECT c.CODIGO, n.NOMBRES, n.PRIMERAPELLIDO, n.EDAD, n.TIPOEDAD, n.FECHANACIMIENTO
            FROM SUSTRACION_DB.NNA_SUSTRACION n
            JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON n.CASOID = c.ID
            WHERE c.CODIGO IN ('REQ-CAMINO-01', 'REQ-CAMINO-02', 'REQ-CAMINO-03', 'REQD-CAMINO-01', 'REQD-CAMINO-02', 'REQD-CAMINO-03')
            ORDER BY c.CODIGO
        """)).fetchall()

        print(f"\n[ORACLE SQL] NNA_SUSTRACION: {len(nna_sql)} / 6 NNA vinculados verificados:")
        for n in nna_sql:
            print(f"  * Caso: {n[0]:<14} | NNA: {n[1]} {n[2]} | Edad: {n[3]} {n[4]} (Nac: {n[5]})")
        audit_results["verificaciones_db"]["nna_count"] = len(nna_sql)

        # 3. PROCESO_OPERATIVO_SUSTRACION
        proc_sql = conn.execute(text("""
            SELECT c.CODIGO, p.FASEOPERATIVA, p.EVALUACIONRESULTADO, p.FECHALIMITESUBSANACION, p.FECHALIMITEPASAJES, p.ESTADOCOOPERACION
            FROM SUSTRACION_DB.PROCESO_OPERATIVO_SUSTRACION p
            JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON p.CASOID = c.ID
            WHERE c.CODIGO IN ('REQ-CAMINO-01', 'REQ-CAMINO-02', 'REQ-CAMINO-03', 'REQD-CAMINO-01', 'REQD-CAMINO-02', 'REQD-CAMINO-03')
            ORDER BY c.CODIGO
        """)).fetchall()

        print(f"\n[ORACLE SQL] PROCESO_OPERATIVO_SUSTRACION: {len(proc_sql)} / 6 procesos operativos verificados:")
        for p in proc_sql:
            print(f"  * Caso: {p[0]:<14} | Fase: {p[1]:<20} | Eval: {p[2] or 'N/A':<12} | LímSubsan: {p[3] or 'N/A':<10} | LímPasajes: {p[4] or 'N/A':<10} | Coop: {p[5] or 'N/A'}")
        audit_results["verificaciones_db"]["proceso_count"] = len(proc_sql)

        # 4. HISTORIAL_JUDICIAL
        hist_sql = conn.execute(text("""
            SELECT c.CODIGO, h.ETAPA, h.FECHA, h.DESCRIPCION
            FROM SUSTRACION_DB.HISTORIAL_JUDICIAL h
            JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON h.CASOID = c.ID
            WHERE c.CODIGO IN ('REQ-CAMINO-01', 'REQ-CAMINO-02', 'REQ-CAMINO-03', 'REQD-CAMINO-01', 'REQD-CAMINO-02', 'REQD-CAMINO-03')
            ORDER BY c.CODIGO, h.FECHA
        """)).fetchall()

        print(f"\n[ORACLE SQL] HISTORIAL_JUDICIAL: {len(hist_sql)} hitos judiciales registrados:")
        for h in hist_sql:
            print(f"  * Caso: {h[0]:<14} | Etapa: {h[1]:<30} | Fecha: {h[2]} | Detalle: {h[3][:60]}...")
        audit_results["verificaciones_db"]["historial_count"] = len(hist_sql)

        # 5. BITACORA_SUSTRACION
        bit_sql = conn.execute(text("""
            SELECT c.CODIGO, b.FECHA, b.TEXTO, b.CREADOPOR
            FROM SUSTRACION_DB.BITACORA_SUSTRACION b
            JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON b.CASOID = c.ID
            WHERE c.CODIGO IN ('REQ-CAMINO-01', 'REQ-CAMINO-02', 'REQ-CAMINO-03', 'REQD-CAMINO-01', 'REQD-CAMINO-02', 'REQD-CAMINO-03')
            ORDER BY c.CODIGO, b.FECHA
        """)).fetchall()

        print(f"\n[ORACLE SQL] BITACORA_SUSTRACION: {len(bit_sql)} entradas de bitácora registradas:")
        for b in bit_sql:
            print(f"  * Caso: {b[0]:<14} | Fecha: {b[1]} | Por: {b[3]} | Nota: {b[2][:65]}...")
        audit_results["verificaciones_db"]["bitacora_count"] = len(bit_sql)

    # ══════════════════════════════════════════════════════════════════════════
    # VERIFICACIÓN DEL ENDPOINT GET /api/sustracion
    # ══════════════════════════════════════════════════════════════════════════
    print_banner("VERIFICACIÓN DEL ENDPOINT GET /api/sustracion")

    r_list = client.get("/api/sustracion", headers=AUTH_HEADERS)
    assert r_list.status_code == 200, f"Error listando casos: {r_list.text}"
    todos_casos = r_list.json()

    casos_6_dict = {c["codigo"]: c for c in todos_casos if c["codigo"] in CODIGOS_6_CAMINOS}
    print(f"\n[API GET /api/sustracion] Casos auditados listados correctamente: {len(casos_6_dict)} / 6")

    for cod in CODIGOS_6_CAMINOS:
        assert cod in casos_6_dict, f"El caso {cod} no fue listado por la API"
        item = casos_6_dict[cod]
        print(f"  ✓ {item['codigo']:<14} | {item['pais']:<14} | AC: {item['acPeru']:<10} | Fase: {item['procesoOperativo']['faseOperativa']:<20} | Estado: {item['estado']:<10}")

    # ══════════════════════════════════════════════════════════════════════════
    # CONFORMIDAD NORMATIVA Y RESUMEN FINAL
    # ══════════════════════════════════════════════════════════════════════════
    print_banner("MATRIZ DE CONFORMIDAD NORMATIVA Y OPERATIVA")

    checks = [
        ("REQ-01: AC Requirente éxito directo cooperación y vuelo repatriación (EE.UU.)", c1_final["estado"] == "Archivado" and c1_final["retorno"] == "SI"),
        ("REQ-02: AC Requirente observación -> subsanación 5 días -> judicial exterior Roma", r2_final["procesoOperativo"]["faseOperativa"] == "Judicial exterior" and r2_final["estadoJudicial"] == "Medidas cautelares dictadas"),
        ("REQ-03: AC Requirente inadmisible / desistimiento formal -> archivo sin retorno (Chile)", c3_final["estado"] == "Archivado" and c3_final["retorno"] == "NO" and c3_final["motivoCierre"] == "Desistimiento del solicitante"),
        ("REQD-01: AC Requerida acuerdo voluntario en MIMP -> auto-cómputo 1 mes pasajes -> retorno concretado", c4_final["estado"] == "Archivado" and c4_final["retorno"] == "SI" and c4_ret["procesoOperativo"]["fechaLimitePasajes"] == "2026-09-01"),
        ("REQD-02: AC Requerida subsanación 5 días -> desacuerdo -> demanda 15° Juzgado Lima -> Sentencia Fundada", r5_final["estadoJudicial"] == "Sentencia 1ra instancia" and r5_final["juzgado"] is not None and "FUNDADA" in r5_final["sentencia1ra"]),
        ("REQD-03: AC Requerida excepción Art. 13.b -> Sentencia Infundada firme -> Cierre y Archivo", c6_final["estado"] == "Archivado" and c6_final["retorno"] == "NO" and "Art. 13 B" in (c6_final["motivoCierre"] or "")),
        ("Persistencia SQL: Verificación en 5 tablas de SUSTRACION_DB (Casos, NNA, Proceso, Historial, Bitácora)", len(casos_sql) == 6 and len(nna_sql) == 6 and len(proc_sql) == 6 and len(hist_sql) >= 6 and len(bit_sql) >= 4),
        ("API GET /api/sustracion lista los 6 caminos operativos con datos enriquecidos", len(casos_6_dict) == 6),
    ]

    for label, ok in checks:
        status = "[CONFORME]   " if ok else "[NO CONFORME]"
        print(f"  {status} | {label}")
        audit_results["conformidad_normativa"].append({"requisito": label, "conforme": ok})

    todos_ok = all(c[1] for c in checks)
    print_banner(f"RESULTADO GENERAL: {'APROBADO AL 100% (CONFORMIDAD PLENA)' if todos_ok else 'CON OBSERVACIONES'}")

    return audit_results


if __name__ == "__main__":
    res = ejecutar_auditoria_6_caminos()
    print("\n[INFO] Auditoría de 6 caminos completada con éxito.")
