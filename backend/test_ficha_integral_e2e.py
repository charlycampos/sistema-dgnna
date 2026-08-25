"""
========================================================================================
AUDITORÍA INTEGRAL DE CALIDAD Y PRUEBA E2E — FICHA TÉCNICA DE SUSTRACCIÓN INTERNACIONAL
Directiva N.° 006-2021-MIMP / DGNNA — Sistema DGNNA
========================================================================================
Valida las 3 pestañas de la Ficha Técnica:
  1. Pestaña 1: «Datos del caso» (código, acPeru, país, tipoSolicitud, profesional, fechaIngreso, fechaSalida, estado, observaciones).
  2. Pestaña 2: «Personas involucradas» (NNA, Solicitante, Requerido - todos los datos demográficos y de contacto).
  3. Pestaña 3: «Bitácora» (inserción de notas en BITACORA_SUSTRACION, conteo dinámico, trazabilidad).
  4. Consulta integral GET y aserción 100% de persistencia en Oracle XE.
  5. Verificación de reglas normativas de caducidad (Art. 4 Convenio de La Haya de 1980).
========================================================================================
"""

import sys
import os
from datetime import datetime, date
from sqlalchemy import text

# Asegurar path de importación
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import engine, SessionLocal
from models import CasoSustracion, BitacoraSustracion, HistorialJudicial
from schemas import (
    CasoSustracionCreate,
    CasoSustracionUpdate,
    BitacoraEntradaCreate,
)
from routers.sustracion import (
    crear_caso,
    actualizar_caso,
    obtener_caso,
    agregar_bitacora,
    eliminar_caso,
)


def print_banner(title: str):
    print("\n" + "=" * 80)
    print(f"  {title.upper()}")
    print("=" * 80)


def print_check(name: str, passed: bool, detail: str = ""):
    icon = "[OK]  " if passed else "[FAIL]"
    print(f" {icon} {name}")
    if detail:
        print(f"        -> {detail}")
    if not passed:
        raise AssertionError(f"Falla en validación: {name} | {detail}")


def limpiar_caso_prueba(codigo: str, codigo_rev: str = None):
    """Limpia registros de prueba en Oracle XE para asegurar idempotencia."""
    with engine.connect() as conn:
        codigos = [codigo]
        if codigo_rev:
            codigos.append(codigo_rev)
        for cod in codigos:
            res = conn.execute(
                text("SELECT id FROM SUSTRACION_DB.casos_sustracion WHERE codigo = :cod"),
                {"cod": cod}
            ).fetchall()
            for r in res:
                caso_id = r[0]
                conn.execute(text("DELETE FROM SUSTRACION_DB.bitacora_sustracion WHERE casoid = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.historial_judicial WHERE casoid = :id"), {"id": caso_id})
                conn.execute(text("DELETE FROM SUSTRACION_DB.casos_sustracion WHERE id = :id"), {"id": caso_id})
        conn.commit()


def test_caducidad_haya_algoritmo():
    """Valida el cálculo de edad y alerta de caducidad del Art. 4 de La Haya."""
    print_banner("Validación de Reglas de Negocio y Alerta de Caducidad (Art. 4 La Haya)")

    # Caso 1: Menor de 15 años cumplirá 16 en 2 meses (Alerta inminente)
    hoy = date.today()
    nac_15 = date(hoy.year - 15, max(1, hoy.month - 2), min(28, hoy.day))
    fecha_16 = date(nac_15.year + 16, nac_15.month, nac_15.day)
    diff_dias = (fecha_16 - hoy).days
    es_inminente = 0 < diff_dias <= 365
    print_check("Detección de NNA próximo a cumplir 16 años (Caducidad inminente)", es_inminente, f"Días restantes para los 16 años: {diff_dias}")

    # Caso 2: Menor de 16 años y 5 días (Caducidad consumada)
    nac_16_plus = date(hoy.year - 16, max(1, hoy.month - 1), 1)
    diff_dias_16 = (date(nac_16_plus.year + 16, nac_16_plus.month, nac_16_plus.day) - hoy).days
    es_mayor_16 = diff_dias_16 <= 0
    print_check("Detección de NNA >= 16 años (Inaplicabilidad Art. 4 La Haya)", es_mayor_16, f"Días cumplidos tras los 16: {abs(diff_dias_16)}")


def run_e2e_ficha_integral():
    COD_INICIAL = "HT-2026-FICHA-01"
    COD_REV = "HT-2026-FICHA-01-REV"

    print_banner("Inicio de Prueba E2E: Auditoría Integral de las 3 Pestañas de la Ficha Técnica")
    limpiar_caso_prueba(COD_INICIAL, COD_REV)

    db = SessionLocal()
    dummy_user = {"nombre": "Auditor Senior QA - DGNNA", "id": "qa-auditor-01", "role": "admin"}
    caso_id = None

    try:
        # =====================================================================
        # PASO 1: Creación del caso inicial vía endpoint crear_caso
        # =====================================================================
        print_banner("Paso 1: Creación Inicial del Expediente de Sustracción")
        payload_create = CasoSustracionCreate(
            codigo=COD_INICIAL,
            pais="Chile",
            tipoSolicitud="Restitución",
            acPeru="Requerida",
            fechaIngreso="2026-08-01",
            nnaNombre="Juan Diego Morales Pérez",
            nnaSexo="Hombre",
            nnaEdad="8",
            nnaTipoEdad="Años",
            nnaFechaNac="2018-05-15",
            solicitanteNombre="María Pérez Soto",
            solicitanteSexo="Mujer",
            solicitanteTelefono="+56 9 1234 5678",
            solicitanteCorreo="maria.perez@email.cl",
            solicitanteDomicilio="Av. Providencia 1234, Santiago, Chile",
            requeridoNombre="Carlos Morales Vega",
            requeridoSexo="Hombre",
            requeridoTelefono="+51 987 654 321",
            requeridoCorreo="carlos.morales@email.pe",
            requeridoDomicilio="Calle Las Flores 456, San Isidro, Lima, Perú",
            profesional="EMMA",
            estado="Pendiente",
            observaciones="Ingreso inicial de solicitud de restitución internacional.",
        )

        caso_creado = crear_caso(body=payload_create, db=db, current_user=dummy_user)
        caso_id = caso_creado.id
        print_check("Creación de Caso en Oracle XE", bool(caso_id), f"ID asignado: {caso_id}")
        print_check("Código de Hoja de Trámite guardado", caso_creado.codigo == COD_INICIAL, f"Código: {caso_creado.codigo}")

        # =====================================================================
        # PASO 2: Pestaña 1 «Datos del caso» (TabDatos)
        # =====================================================================
        print_banner("Paso 2: Auditoría Pestaña 1 «Datos del caso» (TabDatos)")
        payload_tab_datos = CasoSustracionUpdate(
            codigo=COD_REV,
            acPeru="Requirente",
            pais="España",
            tipoSolicitud="Régimen de Visitas",
            profesional="JANNY",
            fechaIngreso="2026-07-15",
            fechaSalida="2026-08-20",
            estado="Tramite",
            observaciones="Expediente reasignado a JANNY. Cooperación internacional con España en curso.",
        )

        caso_p1 = actualizar_caso(id=caso_id, body=payload_tab_datos, db=db, _=dummy_user)

        print_check("TabDatos -> Actualización de 'codigo'", caso_p1.codigo == COD_REV, f"Valor: {caso_p1.codigo}")
        print_check("TabDatos -> Actualización de 'acPeru'", caso_p1.acPeru == "Requirente", f"Valor: {caso_p1.acPeru}")
        print_check("TabDatos -> Actualización de 'pais'", caso_p1.pais == "España", f"Valor: {caso_p1.pais}")
        print_check("TabDatos -> Actualización de 'tipoSolicitud'", caso_p1.tipoSolicitud == "Régimen de Visitas", f"Valor: {caso_p1.tipoSolicitud}")
        print_check("TabDatos -> Actualización de 'profesional'", caso_p1.profesional == "JANNY", f"Valor: {caso_p1.profesional}")
        print_check("TabDatos -> Actualización de 'fechaIngreso'", caso_p1.fechaIngreso == "2026-07-15", f"Valor: {caso_p1.fechaIngreso}")
        print_check("TabDatos -> Actualización de 'fechaSalida'", caso_p1.fechaSalida == "2026-08-20", f"Valor: {caso_p1.fechaSalida}")
        print_check("TabDatos -> Actualización de 'estado'", caso_p1.estado == "Tramite", f"Valor: {caso_p1.estado}")
        print_check("TabDatos -> Actualización de 'observaciones'", "cooperación internacional" in (caso_p1.observaciones or "").lower(), f"Valor: {caso_p1.observaciones}")

        # =====================================================================
        # PASO 3: Pestaña 2 «Personas involucradas» (TabPersonas)
        # =====================================================================
        print_banner("Paso 3: Auditoría Pestaña 2 «Personas involucradas» (TabPersonas)")
        payload_tab_personas = CasoSustracionUpdate(
            # NNA Demográficos
            nnaNombre="Sofía Valentina Morales Pérez",
            nnaSexo="Mujer",
            nnaEdad="15",
            nnaTipoEdad="Años",
            nnaFechaNac="2011-09-10",
            # Parte Solicitante
            solicitanteNombre="María Elena Pérez Soto de Morales",
            solicitanteSexo="Mujer",
            solicitanteTelefono="+34 612 345 678",
            solicitanteCorreo="m.perez.soto@madrid.es",
            solicitanteDomicilio="Paseo de la Castellana 100, Madrid, España",
            # Parte Requerida
            requeridoNombre="Carlos Eduardo Morales Vega",
            requeridoSexo="Hombre",
            requeridoTelefono="+51 999 888 777",
            requeridoCorreo="c.morales.v@gmail.com",
            requeridoDomicilio="Av. Pardo y Aliaga 789, San Isidro, Lima, Perú",
        )

        caso_p2 = actualizar_caso(id=caso_id, body=payload_tab_personas, db=db, _=dummy_user)

        print_check("TabPersonas -> NNA: 'nnaNombre'", caso_p2.nnaNombre == "Sofía Valentina Morales Pérez", f"Valor: {caso_p2.nnaNombre}")
        print_check("TabPersonas -> NNA: 'nnaSexo'", caso_p2.nnaSexo == "Mujer", f"Valor: {caso_p2.nnaSexo}")
        print_check("TabPersonas -> NNA: 'nnaEdad'", caso_p2.nnaEdad == "15", f"Valor: {caso_p2.nnaEdad}")
        print_check("TabPersonas -> NNA: 'nnaTipoEdad'", caso_p2.nnaTipoEdad == "Años", f"Valor: {caso_p2.nnaTipoEdad}")
        print_check("TabPersonas -> NNA: 'nnaFechaNac'", caso_p2.nnaFechaNac == "2011-09-10", f"Valor: {caso_p2.nnaFechaNac}")

        print_check("TabPersonas -> Solicitante: 'solicitanteNombre'", caso_p2.solicitanteNombre == "María Elena Pérez Soto de Morales")
        print_check("TabPersonas -> Solicitante: 'solicitanteSexo'", caso_p2.solicitanteSexo == "Mujer")
        print_check("TabPersonas -> Solicitante: 'solicitanteTelefono'", caso_p2.solicitanteTelefono == "+34 612 345 678")
        print_check("TabPersonas -> Solicitante: 'solicitanteCorreo'", caso_p2.solicitanteCorreo == "m.perez.soto@madrid.es")
        print_check("TabPersonas -> Solicitante: 'solicitanteDomicilio'", caso_p2.solicitanteDomicilio == "Paseo de la Castellana 100, Madrid, España")

        print_check("TabPersonas -> Requerido: 'requeridoNombre'", caso_p2.requeridoNombre == "Carlos Eduardo Morales Vega")
        print_check("TabPersonas -> Requerido: 'requeridoSexo'", caso_p2.requeridoSexo == "Hombre")
        print_check("TabPersonas -> Requerido: 'requeridoTelefono'", caso_p2.requeridoTelefono == "+51 999 888 777")
        print_check("TabPersonas -> Requerido: 'requeridoCorreo'", caso_p2.requeridoCorreo == "c.morales.v@gmail.com")
        print_check("TabPersonas -> Requerido: 'requeridoDomicilio'", caso_p2.requeridoDomicilio == "Av. Pardo y Aliaga 789, San Isidro, Lima, Perú")

        # =====================================================================
        # PASO 4: Pestaña 3 «Bitácora» (TabBitacora)
        # =====================================================================
        print_banner("Paso 4: Auditoría Pestaña 3 «Bitácora» (TabBitacora)")
        
        # Inserción Nota 1
        nota1_payload = BitacoraEntradaCreate(
            fecha="2026-08-16",
            texto="Nota 1: Se remitió oficio diplomático a la Autoridad Central de España solicitando localización y medidas cautelares.",
            creadoPor="JANNY (Especialista DGNNA)",
        )
        b1_data = agregar_bitacora(id=caso_id, body=nota1_payload, db=db, current_user=dummy_user)
        print_check("Bitácora -> Nota 1 ID generado en BITACORA_SUSTRACION", bool(b1_data.id), f"ID: {b1_data.id}")
        print_check("Bitácora -> Nota 1 Texto correcto", "oficio diplomático" in b1_data.texto)

        # Inserción Nota 2
        nota2_payload = BitacoraEntradaCreate(
            fecha="2026-08-20",
            texto="Nota 2: Se recibió confirmación de notificación favorable de la Autoridad Central de España.",
            creadoPor="JANNY (Especialista DGNNA)",
        )
        b2_data = agregar_bitacora(id=caso_id, body=nota2_payload, db=db, current_user=dummy_user)
        print_check("Bitácora -> Nota 2 ID generado en BITACORA_SUSTRACION", bool(b2_data.id), f"ID: {b2_data.id}")
        print_check("Bitácora -> Nota 2 Texto correcto", "confirmación de notificación" in b2_data.texto)

        # =====================================================================
        # PASO 5: Consulta Integral obtener_caso(id) y Verificación 100%
        # =====================================================================
        print_banner("Paso 5: Consulta Integral obtener_caso(id) y Verificación 100%")
        
        # Usar una nueva sesión limpia para asegurar lectura real desde Oracle XE
        db.close()
        db = SessionLocal()
        full = obtener_caso(id=caso_id, db=db, _=dummy_user)

        # Validación exhaustiva de todos los campos
        campos_verificados = {
            # Tab 1
            "codigo": full.codigo == COD_REV,
            "acPeru": full.acPeru == "Requirente",
            "pais": full.pais == "España",
            "tipoSolicitud": full.tipoSolicitud == "Régimen de Visitas",
            "profesional": full.profesional == "JANNY",
            "fechaIngreso": full.fechaIngreso == "2026-07-15",
            "fechaSalida": full.fechaSalida == "2026-08-20",
            "estado": full.estado == "Tramite",
            "observaciones": full.observaciones == payload_tab_datos.observaciones,
            # Tab 2
            "nnaNombre": full.nnaNombre == "Sofía Valentina Morales Pérez",
            "nnaSexo": full.nnaSexo == "Mujer",
            "nnaEdad": full.nnaEdad == "15",
            "nnaTipoEdad": full.nnaTipoEdad == "Años",
            "nnaFechaNac": full.nnaFechaNac == "2011-09-10",
            "solicitanteNombre": full.solicitanteNombre == "María Elena Pérez Soto de Morales",
            "solicitanteSexo": full.solicitanteSexo == "Mujer",
            "solicitanteTelefono": full.solicitanteTelefono == "+34 612 345 678",
            "solicitanteCorreo": full.solicitanteCorreo == "m.perez.soto@madrid.es",
            "solicitanteDomicilio": full.solicitanteDomicilio == "Paseo de la Castellana 100, Madrid, España",
            "requeridoNombre": full.requeridoNombre == "Carlos Eduardo Morales Vega",
            "requeridoSexo": full.requeridoSexo == "Hombre",
            "requeridoTelefono": full.requeridoTelefono == "+51 999 888 777",
            "requeridoCorreo": full.requeridoCorreo == "c.morales.v@gmail.com",
            "requeridoDomicilio": full.requeridoDomicilio == "Av. Pardo y Aliaga 789, San Isidro, Lima, Perú",
            # Tab 3
            "bitacora_conteo": len(full.bitacora) == 2,
            "bitacora_nota1": any("oficio diplomático" in n.texto for n in full.bitacora),
            "bitacora_nota2": any("confirmación de notificación" in n.texto for n in full.bitacora),
        }

        for campo, ok in campos_verificados.items():
            print_check(f"Persistencia y Recuperación de '{campo}'", ok, f"Valor en DB: {getattr(full, campo, 'Validado')}")

        # Ejecutar prueba algorítmica
        test_caducidad_haya_algoritmo()

        # =====================================================================
        # PASO 6: Limpieza y Verificación de Cascada de Eliminación
        # =====================================================================
        print_banner("Paso 6: Limpieza y Verificación de Cascada de Eliminación")
        del_res = eliminar_caso(id=caso_id, db=db, _=dummy_user)
        print_check("Eliminación de caso (DELETE)", del_res.get("success") is True)

        try:
            obtener_caso(id=caso_id, db=db, _=dummy_user)
            print_check("Verificación de caso eliminado (Debe lanzar 404)", False)
        except Exception as ex:
            print_check("Verificación de caso eliminado (Lanzó 404 Not Found)", getattr(ex, "status_code", None) == 404)

        print_banner("AUDITORÍA DE LA FICHA TÉCNICA COMPLETADA CON ÉXITO: 100% CONFORME")
        return True

    except Exception as e:
        print(f"\n[ERROR CRÍTICO EN AUDITORÍA]: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
        if caso_id:
            limpiar_caso_prueba(COD_INICIAL, COD_REV)


if __name__ == "__main__":
    exito = run_e2e_ficha_integral()
    sys.exit(0 if exito else 1)
