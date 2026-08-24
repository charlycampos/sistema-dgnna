"""
Script para insertar los 5 casos reales de prueba de la Directiva N.° 006-2021-MIMP
directamente en la Base de Datos de Sustracción Internacional.
"""
import uuid
from datetime import datetime
from database import SessionLocal
from models import CasoSustracion, BitacoraSustracion, HistorialJudicial

CASOS_5 = [
    {
        "codigo": "HT-2026-0041",
        "nnaNombre": "Mateo Ramos Alarcón",
        "nnaSexo": "Hombre",
        "nnaEdad": "8",
        "nnaTipoEdad": "Años",
        "nnaFechaNac": "2018-05-12",
        "pais": "España",
        "etapa": "Administrativa",
        "tipoSolicitud": "Restitución internacional",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-08-18",
        "solicitanteNombre": "Carlos Ramos Vega (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+34 612 345 678",
        "solicitanteCorreo": "carlos.ramos@email.es",
        "solicitanteDomicilio": "Calle Gran Vía 42, Madrid, España",
        "requeridoNombre": "Lucía Alarcón Soto (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "987 654 321",
        "requeridoCorreo": "lucia.alarcon@email.com",
        "requeridoDomicilio": "Av. Arequipa 1234, Lima",
        "profesional": "EMMA",
        "estado": "Pendiente",
        "estadoJudicial": "Sin demanda",
        "observaciones": "Ruta 1 Directiva: Solicitud remitida por Ministerio de Justicia de España. En fase de Evaluación Inicial con 2 requisitos pendientes de revisión.",
        "bitacora": [
            {"fecha": "2026-08-18", "texto": "Recepción formal del expediente vía SGD desde la Autoridad Central de España. Pasa a evaluación técnica de 8 requisitos.", "creadoPor": "Mesa de Partes"}
        ]
    },
    {
        "codigo": "HT-2026-0035",
        "nnaNombre": "Sofía Castillo Gómez",
        "nnaSexo": "Mujer",
        "nnaEdad": "5",
        "nnaTipoEdad": "Años",
        "nnaFechaNac": "2021-03-20",
        "pais": "Chile",
        "etapa": "Administrativa",
        "tipoSolicitud": "Restitución internacional",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-08-12",
        "solicitanteNombre": "Martín Castillo Flores (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+56 9 8765 4321",
        "solicitanteCorreo": "m.castillo@correo.cl",
        "solicitanteDomicilio": "Av. Providencia 1100, Santiago, Chile",
        "requeridoNombre": "Elena Gómez Paredes (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "954 321 987",
        "requeridoCorreo": "elena.gomez@correo.pe",
        "requeridoDomicilio": "Calle Mercaderes 210, Arequipa",
        "profesional": "JANNY",
        "estado": "Tramite",
        "estadoJudicial": "Sin demanda",
        "observaciones": "Ruta 2 Directiva: Se observaron los requisitos de acreditación de custodia en Chile y traducción de partida. Plazo legal de 5 días hábiles activo.",
        "bitacora": [
            {"fecha": "2026-08-12", "texto": "Ingreso y evaluación técnica. Se detectan observaciones en documentación de custodia y partida.", "creadoPor": "JANNY"},
            {"fecha": "2026-08-14", "texto": "Notificación de Oficio de Observaciones N.° 0142-2026 concediendo 5 días hábiles para subsanar (vence 21/08/2026).", "creadoPor": "JANNY"}
        ]
    },
    {
        "codigo": "HT-2026-0028",
        "nnaNombre": "Lucas Morales Benítez",
        "nnaSexo": "Hombre",
        "nnaEdad": "10",
        "nnaTipoEdad": "Años",
        "nnaFechaNac": "2015-09-14",
        "pais": "Italia",
        "etapa": "Administrativa",
        "tipoSolicitud": "Restitución internacional",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-07-20",
        "fechaEntrevista": "2026-08-10",
        "resultadoEntrevista": "Acepta retorno",
        "retorno": "SI",
        "solicitanteNombre": "Giancarlo Rossi Moretti (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+39 06 1234567",
        "solicitanteCorreo": "giancarlo.rossi@email.it",
        "solicitanteDomicilio": "Via Veneto 88, Roma, Italia",
        "requeridoNombre": "Carla Benítez Quispe (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "984 112 233",
        "requeridoCorreo": "carla.benitez@email.com",
        "requeridoDomicilio": "Av. El Sol 450, Cusco",
        "profesional": "CECILIA",
        "estado": "Tramite",
        "estadoJudicial": "Sin demanda",
        "observaciones": "Ruta 3 Directiva: Entrevista amigable exitosa. La madre aceptó el retorno voluntario. Se otorga 1 mes para compra de pasajes y condiciones de viaje.",
        "bitacora": [
            {"fecha": "2026-07-20", "texto": "Recepción y evaluación conforme de la solicitud.", "creadoPor": "CECILIA"},
            {"fecha": "2026-08-10", "texto": "Entrevista de retorno voluntario. La requerida suscribe acta de compromiso acordando el retorno amigable del NNA.", "creadoPor": "CECILIA"}
        ]
    },
    {
        "codigo": "HT-2026-0019",
        "nnaNombre": "Joaquín Delgado Silva",
        "nnaSexo": "Hombre",
        "nnaEdad": "5",
        "nnaTipoEdad": "Años",
        "nnaFechaNac": "2020-10-08",
        "pais": "Argentina",
        "etapa": "Judicial",
        "tipoSolicitud": "Restitución internacional",
        "acPeru": "Requerida",
        "fechaIngreso": "2026-06-15",
        "fechaEntrevista": "2026-07-05",
        "resultadoEntrevista": "Rechaza retorno",
        "estadoJudicial": "Demanda interpuesta",
        "fechaDemanda": "2026-07-22",
        "numExpedienteJudicial": "00452-2026-0-1601-JR-FT-02",
        "juzgado": "2° Juzgado de Familia de Trujillo",
        "solicitanteNombre": "Gonzalo Delgado Cabrera (Padre)",
        "solicitanteSexo": "Hombre",
        "solicitanteTelefono": "+54 11 4321 8765",
        "solicitanteCorreo": "gonzalo.delgado@correo.ar",
        "solicitanteDomicilio": "Calle Florida 550, Buenos Aires, Argentina",
        "requeridoNombre": "Patricia Silva Ríos (Madre)",
        "requeridoSexo": "Mujer",
        "requeridoTelefono": "944 556 677",
        "requeridoCorreo": "patricia.silva@correo.pe",
        "requeridoDomicilio": "Urb. California Mz. B Lt. 14, Trujillo",
        "profesional": "EMMA",
        "estado": "Tramite",
        "observaciones": "Ruta 4 Directiva: Requerida rechazó retorno en entrevista. DGNNA interpuso demanda ante 2° Juzgado de Familia y obtuvo medida cautelar de impedimento de salida.",
        "bitacora": [
            {"fecha": "2026-06-15", "texto": "Recepción de solicitud desde Argentina.", "creadoPor": "EMMA"},
            {"fecha": "2026-07-05", "texto": "Entrevista de retorno amigable concluida sin acuerdo por rechazo de la requerida. Se dispone pase a la vía judicial.", "creadoPor": "EMMA"},
            {"fecha": "2026-07-22", "texto": "Interposición formal de demanda de restitución internacional ante el Juzgado de Familia.", "creadoPor": "EMMA"}
        ],
        "historialJudicial": [
            {"etapa": "Demanda interpuesta", "fecha": "2026-07-22", "descripcion": "Demanda de restitución internacional de menor ingresada al 2° Juzgado de Familia de Trujillo.", "creadoPor": "EMMA"},
            {"etapa": "Medidas de protección", "fecha": "2026-08-05", "descripcion": "Auto admisorio N.° 01 concede medida cautelar de impedimento de salida del país para el menor.", "creadoPor": "EMMA"}
        ]
    },
    {
        "codigo": "HT-2026-0050",
        "nnaNombre": "Valery Méndez Castro",
        "nnaSexo": "Mujer",
        "nnaEdad": "9",
        "nnaTipoEdad": "Años",
        "nnaFechaNac": "2017-02-14",
        "pais": "Estados Unidos",
        "etapa": "Administrativa",
        "tipoSolicitud": "Restitución internacional",
        "acPeru": "Requirente",
        "fechaIngreso": "2026-08-01",
        "solicitanteNombre": "Valeria Castro Morales (Madre)",
        "solicitanteSexo": "Mujer",
        "solicitanteTelefono": "998 877 665",
        "solicitanteCorreo": "valeria.castro@correo.pe",
        "solicitanteDomicilio": "Calle Dos de Mayo 650, Miraflores, Lima",
        "requeridoNombre": "Jorge Méndez Valdivia (Padre)",
        "requeridoSexo": "Hombre",
        "requeridoTelefono": "+1 305 555 0199",
        "requeridoCorreo": "jorge.mendez@email.us",
        "requeridoDomicilio": "8421 NW 14th St, Miami, FL 33126, EE.UU.",
        "profesional": "JANNY",
        "estado": "Tramite",
        "estadoJudicial": "Sin demanda",
        "observaciones": "Ruta 5 Directiva (Requirente): Menor retenida en Miami, EE.UU. Calificación nacional conforme y remisión de expediente oficial vía SGD al Departamento de Estado de EE.UU.",
        "bitacora": [
            {"fecha": "2026-08-01", "texto": "Recepción de solicitud en Lima por madre requirente.", "creadoPor": "JANNY"},
            {"fecha": "2026-08-05", "texto": "Evaluación conforme de los 8 requisitos de admisibilidad conforme a la Directiva 006-2021-MIMP.", "creadoPor": "JANNY"},
            {"fecha": "2026-08-10", "texto": "Remisión de Oficio N.° 0289-2026 a la Autoridad Central de EE.UU. (Office of Children's Issues) bajo referencia SGD EXP-2026-SGD-008912.", "creadoPor": "JANNY"}
        ]
    }
]


def poblar():
    from database import engine
    from sqlalchemy import text

    print("[INFO] Conectando a la Base de Datos Oracle (SUSTRACION_DB)...")
    with engine.connect() as conn:
        for datos in CASOS_5:
            cod = datos["codigo"]
            bitacora = datos.get("bitacora", [])
            historial = datos.get("historialJudicial", [])
            
            # 1. Separar NNA
            nombre_completo = datos["nnaNombre"]
            partes = nombre_completo.split(" ")
            nombres = partes[0]
            primer_ap = partes[1] if len(partes) > 1 else ""
            segundo_ap = partes[2] if len(partes) > 2 else ""

            # 2. Verificar existencia
            res = conn.execute(text('SELECT ID FROM SUSTRACION_DB.CASOS_SUSTRACION WHERE CODIGO = :cod'), {"cod": cod}).fetchone()
            if res:
                caso_id = res[0]
                print(f"[INFO] Actualizando caso {cod} en SUSTRACION_DB...")
                conn.execute(text("""
                    UPDATE SUSTRACION_DB.CASOS_SUSTRACION SET
                        NNANOMBRE = :nnaNombre,
                        NNASEXO = :nnaSexo,
                        NNAEDAD = :nnaEdad,
                        NNATIPOEDAD = :nnaTipoEdad,
                        NNAFECHANAC = :nnaFechaNac,
                        PAIS = :pais,
                        ETAPA = :etapa,
                        TIPOSOLICITUD = :tipoSolicitud,
                        ACPERU = :acPeru,
                        FECHAINGRESO = :fechaIngreso,
                        FECHAENTREVISTA = :fechaEntrevista,
                        RESULTADOENTREVISTA = :resultadoEntrevista,
                        SOLICITANTENOMBRE = :solicitanteNombre,
                        SOLICITANTESEXO = :solicitanteSexo,
                        SOLICITANTETELEFONO = :solicitanteTelefono,
                        SOLICITANTECORREO = :solicitanteCorreo,
                        SOLICITANTEDOMICILIO = :solicitanteDomicilio,
                        REQUERIDOMBRE = :requeridoNombre,
                        REQUERIDOSEXO = :requeridoSexo,
                        REQUERIDOTELEFONO = :requeridoTelefono,
                        REQUERIDOCORREO = :requeridoCorreo,
                        REQUERIDODOMICILIO = :requeridoDomicilio,
                        PROFESIONAL = :profesional,
                        ESTADO = :estado,
                        ESTADOJUDICIAL = :estadoJudicial,
                        FECHADEMANDA = :fechaDemanda,
                        NUMEXPEDIENTEJUDICIAL = :numExpedienteJudicial,
                        JUZGADO = :juzgado,
                        RETORNO = :retorno,
                        OBSERVACIONES = :observaciones,
                        UPDATEDAT = SYSDATE
                    WHERE CODIGO = :cod
                """), {
                    "cod": cod,
                    "nnaNombre": datos["nnaNombre"],
                    "nnaSexo": datos["nnaSexo"],
                    "nnaEdad": datos["nnaEdad"],
                    "nnaTipoEdad": datos["nnaTipoEdad"],
                    "nnaFechaNac": datos.get("nnaFechaNac"),
                    "pais": datos["pais"],
                    "etapa": datos.get("etapa"),
                    "tipoSolicitud": datos.get("tipoSolicitud"),
                    "acPeru": datos.get("acPeru"),
                    "fechaIngreso": datos["fechaIngreso"],
                    "fechaEntrevista": datos.get("fechaEntrevista"),
                    "resultadoEntrevista": datos.get("resultadoEntrevista"),
                    "solicitanteNombre": datos.get("solicitanteNombre"),
                    "solicitanteSexo": datos.get("solicitanteSexo"),
                    "solicitanteTelefono": datos.get("solicitanteTelefono"),
                    "solicitanteCorreo": datos.get("solicitanteCorreo"),
                    "solicitanteDomicilio": datos.get("solicitanteDomicilio"),
                    "requeridoNombre": datos.get("requeridoNombre"),
                    "requeridoSexo": datos.get("requeridoSexo"),
                    "requeridoTelefono": datos.get("requeridoTelefono"),
                    "requeridoCorreo": datos.get("requeridoCorreo"),
                    "requeridoDomicilio": datos.get("requeridoDomicilio"),
                    "profesional": datos.get("profesional"),
                    "estado": datos.get("estado", "Tramite"),
                    "estadoJudicial": datos.get("estadoJudicial", "Sin demanda"),
                    "fechaDemanda": datos.get("fechaDemanda"),
                    "numExpedienteJudicial": datos.get("numExpedienteJudicial"),
                    "juzgado": datos.get("juzgado"),
                    "retorno": datos.get("retorno"),
                    "observaciones": datos.get("observaciones"),
                })
            else:
                caso_id = str(uuid.uuid4())
                print(f"[INFO] Insertando caso {cod} en SUSTRACION_DB...")
                conn.execute(text("""
                    INSERT INTO SUSTRACION_DB.CASOS_SUSTRACION (
                        ID, CODIGO, NNANOMBRE, NNASEXO, NNAEDAD, NNATIPOEDAD, NNAFECHANAC,
                        PAIS, ETAPA, TIPOSOLICITUD, ACPERU, FECHAINGRESO, FECHAENTREVISTA, RESULTADOENTREVISTA,
                        SOLICITANTENOMBRE, SOLICITANTESEXO, SOLICITANTETELEFONO, SOLICITANTECORREO, SOLICITANTEDOMICILIO,
                        REQUERIDOMBRE, REQUERIDOSEXO, REQUERIDOTELEFONO, REQUERIDOCORREO, REQUERIDODOMICILIO,
                        PROFESIONAL, ESTADO, ESTADOJUDICIAL, FECHADEMANDA, NUMEXPEDIENTEJUDICIAL, JUZGADO,
                        RETORNO, OBSERVACIONES, CREATEDAT, UPDATEDAT
                    ) VALUES (
                        :id, :cod, :nnaNombre, :nnaSexo, :nnaEdad, :nnaTipoEdad, :nnaFechaNac,
                        :pais, :etapa, :tipoSolicitud, :acPeru, :fechaIngreso, :fechaEntrevista, :resultadoEntrevista,
                        :solicitanteNombre, :solicitanteSexo, :solicitanteTelefono, :solicitanteCorreo, :solicitanteDomicilio,
                        :requeridoNombre, :requeridoSexo, :requeridoTelefono, :requeridoCorreo, :requeridoDomicilio,
                        :profesional, :estado, :estadoJudicial, :fechaDemanda, :numExpedienteJudicial, :juzgado,
                        :retorno, :observaciones, SYSDATE, SYSDATE
                    )
                """), {
                    "id": caso_id,
                    "cod": cod,
                    "nnaNombre": datos["nnaNombre"],
                    "nnaSexo": datos["nnaSexo"],
                    "nnaEdad": datos["nnaEdad"],
                    "nnaTipoEdad": datos["nnaTipoEdad"],
                    "nnaFechaNac": datos.get("nnaFechaNac"),
                    "pais": datos["pais"],
                    "etapa": datos.get("etapa"),
                    "tipoSolicitud": datos.get("tipoSolicitud"),
                    "acPeru": datos.get("acPeru"),
                    "fechaIngreso": datos["fechaIngreso"],
                    "fechaEntrevista": datos.get("fechaEntrevista"),
                    "resultadoEntrevista": datos.get("resultadoEntrevista"),
                    "solicitanteNombre": datos.get("solicitanteNombre"),
                    "solicitanteSexo": datos.get("solicitanteSexo"),
                    "solicitanteTelefono": datos.get("solicitanteTelefono"),
                    "solicitanteCorreo": datos.get("solicitanteCorreo"),
                    "solicitanteDomicilio": datos.get("solicitanteDomicilio"),
                    "requeridoNombre": datos.get("requeridoNombre"),
                    "requeridoSexo": datos.get("requeridoSexo"),
                    "requeridoTelefono": datos.get("requeridoTelefono"),
                    "requeridoCorreo": datos.get("requeridoCorreo"),
                    "requeridoDomicilio": datos.get("requeridoDomicilio"),
                    "profesional": datos.get("profesional"),
                    "estado": datos.get("estado", "Tramite"),
                    "estadoJudicial": datos.get("estadoJudicial", "Sin demanda"),
                    "fechaDemanda": datos.get("fechaDemanda"),
                    "numExpedienteJudicial": datos.get("numExpedienteJudicial"),
                    "juzgado": datos.get("juzgado"),
                    "retorno": datos.get("retorno"),
                    "observaciones": datos.get("observaciones"),
                })

            # 3. Insertar NNA en tabla NNA_SUSTRACION
            conn.execute(text('DELETE FROM SUSTRACION_DB.NNA_SUSTRACION WHERE CASOID = :casoId'), {"casoId": caso_id})
            conn.execute(text("""
                INSERT INTO SUSTRACION_DB.NNA_SUSTRACION (
                    ID, CASOID, NOMBRES, PRIMERAPELLIDO, SEGUNDOAPELLIDO, SEXO, FECHANACIMIENTO, EDAD, TIPOEDAD, CREATEDAT
                ) VALUES (
                    :id, :casoId, :nombres, :primerApellido, :segundoApellido, :sexo, :fechaNac, :edad, :tipoEdad, SYSDATE
                )
            """), {
                "id": str(uuid.uuid4()),
                "casoId": caso_id,
                "nombres": nombres,
                "primerApellido": primer_ap,
                "segundoApellido": segundo_ap,
                "sexo": datos.get("nnaSexo"),
                "fechaNac": datos.get("nnaFechaNac"),
                "edad": datos.get("nnaEdad"),
                "tipoEdad": datos.get("nnaTipoEdad", "Años"),
            })

            # 4. Insertar Bitácora
            conn.execute(text('DELETE FROM SUSTRACION_DB.BITACORA_SUSTRACION WHERE CASOID = :casoId'), {"casoId": caso_id})
            for b in bitacora:
                conn.execute(text("""
                    INSERT INTO SUSTRACION_DB.BITACORA_SUSTRACION (
                        ID, CASOID, FECHA, TEXTO, CREADOPOR, CREATEDAT
                    ) VALUES (
                        :id, :casoId, :fecha, :texto, :creadoPor, SYSDATE
                    )
                """), {
                    "id": str(uuid.uuid4()),
                    "casoId": caso_id,
                    "fecha": b["fecha"],
                    "texto": b["texto"],
                    "creadoPor": b.get("creadoPor", "Sistema")
                })

            # 5. Insertar Historial Judicial
            conn.execute(text('DELETE FROM SUSTRACION_DB.HISTORIAL_JUDICIAL WHERE CASOID = :casoId'), {"casoId": caso_id})
            for h in historial:
                conn.execute(text("""
                    INSERT INTO SUSTRACION_DB.HISTORIAL_JUDICIAL (
                        ID, CASOID, ETAPA, FECHA, DESCRIPCION, CREADOPOR, CREATEDAT
                    ) VALUES (
                        :id, :casoId, :etapa, :fecha, :descripcion, :creadoPor, SYSDATE
                    )
                """), {
                    "id": str(uuid.uuid4()),
                    "casoId": caso_id,
                    "etapa": h["etapa"],
                    "fecha": h["fecha"],
                    "descripcion": h.get("descripcion", ""),
                    "creadoPor": h.get("creadoPor", "Sistema")
                })

            conn.commit()

        print("[OK] Los 5 casos de prueba de la Directiva N. 006-2021-MIMP se han insertado exitosamente en SUSTRACION_DB.")


if __name__ == "__main__":
    poblar()
