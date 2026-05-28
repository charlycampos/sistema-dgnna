"""
Script de carga inicial — 5 casos de Sustracción Internacional
Uso:
    python seed_sustracion.py

Requisitos:
    - Backend corriendo en http://localhost:8000
    - pip install requests
"""

import sys
import requests

BASE = "http://localhost:8000"

# ── Credenciales de login ─────────────────────────────────────────────
# Cambia estas credenciales por las tuyas
EMAIL    = "admin@dgnna.gob.pe"
PASSWORD = "Admin2026!"


def login():
    res = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if not res.ok:
        print(f"❌ Error de login: {res.status_code} — {res.text}")
        sys.exit(1)
    token = res.json()["access_token"]
    print(f"✅ Login OK")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


CASOS = [
    {
        "codigo": "SI-2023-001",
        "nnaNombre": "Valentina Torres Solís",
        "nnaFechaNac": "2016-04-12",
        "pais": "Argentina",
        "tipologia": "Traslado ilícito",
        "fechaIngreso": "2023-03-15",
        "fechaSalida": None,
        "solicitanteNombre": "María Solís Ríos (madre)",
        "solicitanteDomicilio": "Jr. Los Álamos 345, Miraflores, Lima",
        "solicitanteTelefono": "987-654-321",
        "requeridoNombre": "Carlos Torres Vega",
        "requeridoDomicilio": "Av. Corrientes 2890, Buenos Aires, Argentina",
        "profesional": "EMMA",
        "estado": "Tramite",
        "estadoJudicial": "Audiencia",
        "motivoCierre": None,
        "observaciones": "Padre trasladó a la menor a Argentina sin consentimiento de la madre en febrero de 2023. Se inició proceso ante el SENAF argentino.",
        "bitacora": [
            {"fecha": "2023-03-16", "texto": "Primera entrevista con la madre solicitante. Refiere que el padre trasladó a la menor a Buenos Aires el 10/02/2023 sin su autorización. Se recaba documentación."},
            {"fecha": "2023-04-02", "texto": "Se remite solicitud formal a la Autoridad Central Argentina (SENAF) con toda la documentación requerida por el Convenio de La Haya."},
            {"fecha": "2023-05-18", "texto": "SENAF confirma recepción y asigna el caso al equipo de Buenos Aires. Localizan a la menor en domicilio del requerido."},
            {"fecha": "2023-07-10", "texto": "Audiencia de mediación realizada ante el Juzgado de Familia N° 3 de Buenos Aires. Padre solicita prórroga. Nueva fecha: 25/08/2023."},
        ],
    },
    {
        "codigo": "SI-2023-014",
        "nnaNombre": "Diego Ramírez Vega",
        "nnaFechaNac": "2014-09-30",
        "pais": "España",
        "tipologia": "Retención ilícita",
        "fechaIngreso": "2023-09-05",
        "fechaSalida": None,
        "solicitanteNombre": "Ana Vega Castillo (madre)",
        "solicitanteDomicilio": "Calle Las Flores 120, San Isidro, Lima",
        "solicitanteTelefono": "964-112-233",
        "requeridoNombre": "Luis Ramírez Peralta",
        "requeridoDomicilio": "Calle Bravo Murillo 48, Madrid, España",
        "profesional": "JANNY",
        "estado": "Tramite",
        "estadoJudicial": "Demanda presentada",
        "motivoCierre": None,
        "observaciones": "El menor viajó a España en período vacacional y el padre no lo retornó en la fecha acordada.",
        "bitacora": [
            {"fecha": "2023-09-06", "texto": "Recepción de solicitud. La madre refiere que el padre no devolvió al menor tras visitas de verano pactadas del 01/07 al 31/08/2023."},
            {"fecha": "2023-09-20", "texto": "Se solicita localización a la Autoridad Central española (MSSS). Caso aperturado bajo referencia ES-2023-0892."},
            {"fecha": "2023-11-04", "texto": "MSSS confirma localización del menor en Madrid. Abogado local designado. Se presentó demanda de restitución ante el Juzgado de Primera Instancia N° 12."},
        ],
    },
    {
        "codigo": "SI-2022-007",
        "nnaNombre": "Camila Quispe Mendoza",
        "nnaFechaNac": "2013-02-18",
        "pais": "Chile",
        "tipologia": "Traslado ilícito",
        "fechaIngreso": "2022-06-14",
        "fechaSalida": "2022-10-22",
        "solicitanteNombre": "Roberto Mendoza Cruz (padre)",
        "solicitanteDomicilio": "Av. Arequipa 3456, Lince, Lima",
        "solicitanteTelefono": "991-445-678",
        "requeridoNombre": "Lucía Quispe Apaza",
        "requeridoDomicilio": "Av. Providencia 1880, Santiago, Chile",
        "profesional": "CECILIA",
        "estado": "Archivado",
        "estadoJudicial": "Sin demanda",
        "motivoCierre": "Restitución voluntaria",
        "observaciones": "Caso resuelto exitosamente mediante mediación. La madre aceptó retornar con la menor al Perú sin necesidad de proceso judicial.",
        "bitacora": [
            {"fecha": "2022-06-15", "texto": "Ingreso de solicitud. El padre manifiesta que la madre se llevó a la menor a Chile sin su consentimiento el 02/06/2022."},
            {"fecha": "2022-06-28", "texto": "Comunicación formal a la Autoridad Central de Chile (SENAME). Caso admitido y asignado a mediadora en Santiago."},
            {"fecha": "2022-08-10", "texto": "Primera sesión de mediación en Santiago. La madre reconoce la irregularidad del traslado. Se abre plazo de 30 días para acuerdo."},
            {"fecha": "2022-09-15", "texto": "Acuerdo de mediación suscrito. La madre se compromete a retornar con la menor antes del 22/10/2022."},
            {"fecha": "2022-10-22", "texto": "Restitución completada. Camila regresó al Perú con el padre. Caso cerrado exitosamente por restitución voluntaria."},
        ],
    },
    {
        "codigo": "SI-2024-003",
        "nnaNombre": "Santiago Flores Cruz",
        "nnaFechaNac": "2015-11-07",
        "pais": "Estados Unidos",
        "tipologia": "Retención ilícita",
        "fechaIngreso": "2024-01-28",
        "fechaSalida": None,
        "solicitanteNombre": "Paola Cruz Huanca (madre)",
        "solicitanteDomicilio": "Jr. Independencia 890, Jesús María, Lima",
        "solicitanteTelefono": "976-334-512",
        "requeridoNombre": "Andrés Flores Mejía",
        "requeridoDomicilio": "8421 NW 14th St, Miami, FL 33126, USA",
        "profesional": "EMMA",
        "estado": "Tramite",
        "estadoJudicial": "Sentencia 1ra instancia",
        "motivoCierre": None,
        "observaciones": "El padre retiene al menor en Miami. La madre tiene la tenencia legal otorgada por el Poder Judicial peruano.",
        "bitacora": [
            {"fecha": "2024-01-29", "texto": "Recepción y revisión de solicitud. Se verifica que el menor tiene residencia habitual en Lima y que la madre cuenta con resolución de tenencia."},
            {"fecha": "2024-02-12", "texto": "Remisión a la Autoridad Central de EE.UU. (OCA - Office of Children's Issues). Se adjunta documentación completa en español e inglés."},
            {"fecha": "2024-03-01", "texto": "OCA confirma recepción. Caso asignado. Se sugiere patrocinio legal local. Abogada Miriam Goldstein designada en Miami."},
            {"fecha": "2024-03-25", "texto": "Abogada local presenta petición de Habeas Corpus ante el Tribunal de Familia del Condado de Miami-Dade."},
            {"fecha": "2024-04-16", "texto": "Audiencia preliminar realizada. Juez ordena audiencia de fondo para el 10/06/2024."},
            {"fecha": "2024-06-11", "texto": "Sentencia de primera instancia: el tribunal ordena la restitución del menor al Perú. El padre anuncia apelación. Se suspende ejecución de la sentencia."},
        ],
    },
    {
        "codigo": "SI-2024-009",
        "nnaNombre": "Isabella Paredes Núñez",
        "nnaFechaNac": "2018-07-25",
        "pais": "Italia",
        "tipologia": "Traslado ilícito",
        "fechaIngreso": "2024-04-03",
        "fechaSalida": None,
        "solicitanteNombre": "José Paredes Tarazona (padre)",
        "solicitanteDomicilio": "Av. Brasil 760, Breña, Lima",
        "solicitanteTelefono": "983-227-441",
        "requeridoNombre": "Francesca Núñez Bianchi",
        "requeridoDomicilio": "Via Nazionale 55, Roma, Italia",
        "profesional": "JANNY",
        "estado": "Pendiente",
        "estadoJudicial": "Sin demanda",
        "motivoCierre": None,
        "observaciones": "Madre de nacionalidad italiana trasladó a la menor a Roma. Se investiga si la menor fue registrada en el consulado italiano. Caso en etapa de localización.",
        "bitacora": [
            {"fecha": "2024-04-04", "texto": "Recepción de solicitud urgente. El padre refiere que la madre salió del país el 28/03/2024 con la menor sin su consentimiento ni autorización judicial."},
            {"fecha": "2024-04-18", "texto": "Se remite comunicación urgente a la Autoridad Central italiana (Dipartimento per la Giustizia Minorile). Se solicita localización inmediata."},
            {"fecha": "2024-05-30", "texto": "Autoridad italiana confirma que la menor se encuentra en Roma con la madre. Localización positiva. Se evalúan opciones: mediación vs. demanda judicial. Pendiente decisión del padre solicitante."},
        ],
    },
]


def crear_caso(headers: dict, caso: dict):
    bitacora = caso.pop("bitacora", [])

    res = requests.post(f"{BASE}/api/sustracion", json=caso, headers=headers)
    if res.status_code == 409:
        print(f"  ⚠️  Ya existe: {caso['codigo']} — omitido.")
        return
    if not res.ok:
        print(f"  ❌ Error creando {caso['codigo']}: {res.status_code} — {res.text}")
        return

    data = res.json()
    caso_id = data["id"]
    print(f"  ✅ Caso creado: {caso['codigo']} — {caso['nnaNombre']} ({caso['pais']})")

    for entrada in bitacora:
        rb = requests.post(
            f"{BASE}/api/sustracion/{caso_id}/bitacora",
            json=entrada,
            headers=headers,
        )
        if rb.ok:
            print(f"     📝 Bitácora [{entrada['fecha']}] agregada")
        else:
            print(f"     ⚠️  Error en bitácora: {rb.text}")


def main():
    print("\n🌐 Carga inicial — Sustracción Internacional\n" + "─" * 45)
    headers = login()
    print()

    for caso in CASOS:
        crear_caso(headers, dict(caso))

    print("\n" + "─" * 45)
    print("✅ Proceso completado.\n")


if __name__ == "__main__":
    main()
