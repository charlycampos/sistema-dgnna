import sys
from datetime import datetime
from database import SessionLocal, engine
from models import CasoSustracion, BitacoraSustracion, HistorialJudicial
from schemas import CasoSustracionUpdate, CasoSustracionOut
from routers.sustracion import actualizar_caso

def test_crud():
    db = SessionLocal()
    try:
        # 1. Fetch an existing case or create a dummy test case
        caso = db.query(CasoSustracion).first()
        if not caso:
            print("No existing case found. Creating test case...")
            caso = CasoSustracion(
                codigo="TEST-001",
                nnaNombre="Test NNA Original",
                pais="Chile",
                fechaIngreso="2026-01-01",
                estado="Pendiente"
            )
            db.add(caso)
            db.commit()
            db.refresh(caso)

        print(f"Testing with case ID: {caso.id}, Codigo: {caso.codigo}")

        # 2. Test updating all fields in TabPersonas and TabDatos
        update_payload = CasoSustracionUpdate(
            solicitanteNombre="Maria Elena Gomez Test",
            solicitanteSexo="Mujer",
            solicitanteTelefono="+51 987654321",
            solicitanteCorreo="maria.gomez@test.com",
            solicitanteDomicilio="Av. Larco 123, Miraflores, Lima",
            requeridoNombre="Carlos Alberto Perez Test",
            requeridoSexo="Hombre",
            requeridoTelefono="+56 912345678",
            requeridoCorreo="carlos.perez@test.cl",
            requeridoDomicilio="Providencia 456, Santiago, Chile",
            nnaNombre="Sofia Perez Gomez Test",
            nnaSexo="Mujer",
            nnaEdad="8",
            nnaTipoEdad="Años",
            nnaFechaNac="2018-05-15",
            pais="Chile",
            acPeru="Requerida",
            tipoSolicitud="Restitución",
            profesional="EMMA",
            fechaIngreso="2026-02-10",
            fechaSalida="2026-08-20",
            estado="Tramite",
            observaciones="Observación de prueba automatizada para verificación exhaustiva.",
        )

        dummy_user = {"nombre": "Test Runner", "id": "test-user-id"}

        # Call endpoint handler directly
        res = actualizar_caso(id=caso.id, body=update_payload, db=db, _=dummy_user)
        print("actualizar_caso returned:", res.codigo, res.solicitanteNombre, res.requeridoNombre, res.nnaNombre)

        # Close session and open a fresh one to test real persistence from Oracle DB
        db.close()
        db = SessionLocal()

        reloaded = db.query(CasoSustracion).filter(CasoSustracion.id == caso.id).first()
        assert reloaded is not None, "Case not found on reload"
        assert reloaded.solicitanteNombre == "Maria Elena Gomez Test", f"Expected 'Maria Elena Gomez Test', got '{reloaded.solicitanteNombre}'"
        assert reloaded.solicitanteSexo == "Mujer", f"Expected 'Mujer', got '{reloaded.solicitanteSexo}'"
        assert reloaded.solicitanteTelefono == "+51 987654321", f"Expected '+51 987654321', got '{reloaded.solicitanteTelefono}'"
        assert reloaded.solicitanteCorreo == "maria.gomez@test.com", f"Expected 'maria.gomez@test.com', got '{reloaded.solicitanteCorreo}'"
        assert reloaded.solicitanteDomicilio == "Av. Larco 123, Miraflores, Lima", f"Mismatch in solicitanteDomicilio: {reloaded.solicitanteDomicilio}"
        assert reloaded.requeridoNombre == "Carlos Alberto Perez Test", f"Expected 'Carlos Alberto Perez Test', got '{reloaded.requeridoNombre}'"
        assert reloaded.requeridoSexo == "Hombre", f"Expected 'Hombre', got '{reloaded.requeridoSexo}'"
        assert reloaded.requeridoTelefono == "+56 912345678", f"Expected '+56 912345678', got '{reloaded.requeridoTelefono}'"
        assert reloaded.requeridoCorreo == "carlos.perez@test.cl", f"Expected 'carlos.perez@test.cl', got '{reloaded.requeridoCorreo}'"
        assert reloaded.requeridoDomicilio == "Providencia 456, Santiago, Chile", f"Mismatch in requeridoDomicilio: {reloaded.requeridoDomicilio}"
        assert reloaded.nnaNombre == "Sofia Perez Gomez Test", f"Mismatch in nnaNombre: {reloaded.nnaNombre}"
        assert reloaded.nnaSexo == "Mujer", f"Mismatch in nnaSexo: {reloaded.nnaSexo}"
        assert reloaded.nnaEdad == "8", f"Mismatch in nnaEdad: {reloaded.nnaEdad}"
        assert reloaded.nnaTipoEdad == "Años", f"Mismatch in nnaTipoEdad: {reloaded.nnaTipoEdad}"
        assert reloaded.nnaFechaNac == "2018-05-15", f"Mismatch in nnaFechaNac: {reloaded.nnaFechaNac}"
        assert reloaded.profesional == "EMMA", f"Mismatch in profesional: {reloaded.profesional}"
        assert reloaded.observaciones == "Observación de prueba automatizada para verificación exhaustiva.", f"Mismatch in observaciones: {reloaded.observaciones}"

        print("=== ALL ASSERTIONS PASSED SUCCESSFULLY IN ORACLE XE ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_crud()
