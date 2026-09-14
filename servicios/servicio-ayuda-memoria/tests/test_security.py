"""Pruebas de seguridad, autorización e inmutabilidad para el microservicio de Ayuda Memoria."""

import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from fastapi import HTTPException

SERVICE_DIR = Path(__file__).resolve().parents[1]
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SESSION_SECRET"] = "test-secret-dgnna-2026"
sys.path.insert(0, str(SERVICE_DIR))

from infrastructure.db.database import Base, engine, SessionLocal  # noqa: E402
from infrastructure.db.models import Plantilla, Seccion, Documento, Valor  # noqa: E402
from infrastructure.api import router  # noqa: E402
from infrastructure.api.schemas import PlantillaCreate, SeccionConfig, DocumentoUpdate, AccionCreate, ValorUpdate, DocumentoVersionarRequest  # noqa: E402


USUARIO_ADMIN = {
    "nombre": "Admin User",
    "correo": "admin@mimp.gob.pe",
    "rol": "admin",
    "direccion": "DGNNA"
}

USUARIO_DPE = {
    "nombre": "Especialista DPE",
    "correo": "dpe@mimp.gob.pe",
    "rol": "usuario",
    "direccion": "DPE"
}

USUARIO_DA = {
    "nombre": "Especialista DA",
    "correo": "da@mimp.gob.pe",
    "rol": "usuario",
    "direccion": "DA"
}

USUARIO_REVISOR_AM = {
    "nombre": "Revisora DGNNA",
    "correo": "revisora@mimp.gob.pe",
    "rol": "usuario",
    "direccion": "DGNNA",
    "modulos": [{"modulo": "ayuda-memoria", "rolModulo": "revisor"}]
}

# La única vía asignable hoy desde Gestión de Usuarios (servicio-auth): el módulo
# "ayuda-memoria" en rol "directora", la misma convención de supervisión/consulta
# elevada que usan todos los demás módulos del sistema.
USUARIO_DIRECTORA_AM = {
    "nombre": "Directora de Línea DPE",
    "correo": "directora.dpe@mimp.gob.pe",
    "rol": "usuario",
    "direccion": "DPE",
    "modulos": [{"modulo": "ayuda-memoria", "rolModulo": "directora"}]
}


class SecurityAyudaMemoriaTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

        # Crear plantilla base
        self.plantilla = Plantilla(
            id="plantilla-test-1",
            codigo="PLANT_TEST",
            nombre="Plantilla Prueba",
            tipoAmbito="NACIONAL",
            direccionDuena="DPE",
            esOficial=True,
            activo=True,
            creadoPor="Admin User"
        )
        self.seccion = Seccion(
            id="sec-test-1",
            plantillaId=self.plantilla.id,
            orden=1,
            titulo="Sección 1",
            tipoSeccion="TEXTO"
        )
        self.db.add(self.plantilla)
        self.db.add(self.seccion)

        # Crear documento borrador de DPE
        self.doc_dpe = Documento(
            id="doc-dpe-1",
            plantillaId=self.plantilla.id,
            codigoInterno="AM-TEST-2026-001",
            titulo="Informe DPE 2026",
            estado="BORRADOR",
            direccion="DPE",
            nivelRiesgo="MODERADO",
            creadoPor="Especialista DPE"
        )
        self.val_dpe = Valor(
            id="val-dpe-1",
            documentoId=self.doc_dpe.id,
            seccionId=self.seccion.id,
            textoContenido="Contenido inicial"
        )
        self.db.add(self.doc_dpe)
        self.db.add(self.val_dpe)

        # Crear documento publicado (inmutable)
        self.doc_publicado = Documento(
            id="doc-pub-1",
            plantillaId=self.plantilla.id,
            codigoInterno="AM-PUB-2026-002",
            titulo="Informe Publicado Sellado",
            estado="PUBLICADO",
            direccion="DPE",
            creadoPor="Especialista DPE"
        )
        self.db.add(self.doc_publicado)

        # Crear documento crítico (reserva D.L. 1297)
        self.doc_critico = Documento(
            id="doc-crit-1",
            plantillaId=self.plantilla.id,
            codigoInterno="CS-CRIT-2026-003",
            titulo="Caso Protección Crítico",
            estado="BORRADOR",
            direccion="DPE",
            nivelRiesgo="CRITICO",
            creadoPor="Especialista DPE"
        )
        self.db.add(self.doc_critico)

        # Caso crítico de otra persona en la misma dirección: ni el compañero de
        # dirección ni nadie fuera de DPE deben verlo listado, solo su autor o admin.
        self.doc_critico_ajeno = Documento(
            id="doc-crit-2",
            plantillaId=self.plantilla.id,
            codigoInterno="CS-CRIT-2026-004",
            titulo="Caso Protección Crítico (otro especialista)",
            estado="BORRADOR",
            direccion="DPE",
            nivelRiesgo="CRITICO",
            creadoPor="Otro Especialista DPE"
        )
        self.db.add(self.doc_critico_ajeno)

        # Documento en estado APROBADO, listo para probar el sellado real
        self.doc_aprobado = Documento(
            id="doc-aprob-1",
            plantillaId=self.plantilla.id,
            codigoInterno="AM-APROB-2026-005",
            titulo="Informe Aprobado Listo para Publicar",
            estado="APROBADO",
            direccion="DPE",
            creadoPor="Especialista DPE"
        )
        self.db.add(self.doc_aprobado)

        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_seed_requires_admin(self):
        # Admin debe poder ejecutar seed
        res_admin = router.seed(db=self.db, u=USUARIO_ADMIN)
        self.assertEqual(res_admin["status"], "ok")

    def test_crear_plantilla_oficial_requires_admin(self):
        data = PlantillaCreate(
            nombre="Plantilla Oficial No Autorizada",
            esOficial=True,
            secciones=[SeccionConfig(titulo="Sec 1", tipoSeccion="TEXTO")]
        )
        # Especialista DPE debe recibir 403
        with self.assertRaises(HTTPException) as ctx:
            router.crear_plantilla(data=data, db=self.db, u=USUARIO_DPE)
        self.assertEqual(ctx.exception.status_code, 403)

        # Admin sí puede
        res_admin = router.crear_plantilla(data=data, db=self.db, u=USUARIO_ADMIN)
        self.assertIn("id", res_admin)

    def test_inmutabilidad_documento_publicado(self):
        data = DocumentoUpdate(
            titulo="Intento de Modificación",
            valores=[]
        )
        with self.assertRaises(HTTPException) as ctx:
            router.actualizar(doc_id=self.doc_publicado.id, data=data, db=self.db, u=USUARIO_ADMIN)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("inmutable", ctx.exception.detail.lower())

    def test_rechazo_seccion_ajena(self):
        data = DocumentoUpdate(
            valores=[ValorUpdate(seccionId="seccion-inexistente-o-ajena", textoContenido="Texto")]
        )
        with self.assertRaises(HTTPException) as ctx:
            router.actualizar(doc_id=self.doc_dpe.id, data=data, db=self.db, u=USUARIO_DPE)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_reserva_caso_critico_entre_direcciones(self):
        mock_req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

        # DA no debe poder consultar caso crítico de DPE (403)
        with self.assertRaises(HTTPException) as ctx:
            router.obtener(doc_id=self.doc_critico.id, request=mock_req, db=self.db, u=USUARIO_DA)
        self.assertEqual(ctx.exception.status_code, 403)

        # DPE sí puede consultar su caso
        res_dpe = router.obtener(doc_id=self.doc_critico.id, request=mock_req, db=self.db, u=USUARIO_DPE)
        self.assertEqual(res_dpe["id"], self.doc_critico.id)

    def test_no_agregar_acciones_en_documento_publicado(self):
        data = AccionCreate(fecha="11/09/2026", institucion="UPE", descripcion="Actuación")
        with self.assertRaises(HTTPException) as ctx:
            router.accion(doc_id=self.doc_publicado.id, data=data, db=self.db, u=USUARIO_DPE)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_publicar_requiere_estado_aprobado(self):
        """El documento BORRADOR no puede sellarse aunque lo intente un administrador:
        primero debe pasar por revisar/observar/aprobar."""
        mock_req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
        with self.assertRaises(HTTPException) as ctx:
            router.sellar_y_publicar(doc_id=self.doc_dpe.id, request=mock_req, db=self.db, u=USUARIO_ADMIN)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("APROBADO", ctx.exception.detail)

    def test_publicar_requiere_permiso_de_revisor(self):
        """Un usuario común, aunque el documento ya esté APROBADO, no puede publicarlo."""
        mock_req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
        with self.assertRaises(HTTPException) as ctx:
            router.sellar_y_publicar(doc_id=self.doc_aprobado.id, request=mock_req, db=self.db, u=USUARIO_DPE)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_directora_de_modulo_ayuda_memoria_puede_publicar(self):
        """La vía real hoy: rolModulo="directora" asignado desde Gestión de Usuarios
        (no existe un rol "revisor" separado en la pantalla de administración)."""
        mock_req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
        res = router.sellar_y_publicar(doc_id=self.doc_aprobado.id, request=mock_req, db=self.db, u=USUARIO_DIRECTORA_AM)
        self.assertEqual(res["estado"], "PUBLICADO")

    def test_publicar_con_permiso_y_estado_correcto_sella_el_documento(self):
        """Un revisor asignado vía modulos (no rol global) sí puede sellar un APROBADO,
        y el Word ya no debe imprimir un hash de relleno."""
        mock_req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
        res = router.sellar_y_publicar(doc_id=self.doc_aprobado.id, request=mock_req, db=self.db, u=USUARIO_REVISOR_AM)
        self.assertEqual(res["estado"], "PUBLICADO")
        self.assertEqual(64, len(res["hashIntegridad"]))

        doc_db = self.db.query(Documento).filter_by(id=self.doc_aprobado.id).first()
        from domain.services.docx_renderer import renderizar
        from docx import Document as DocxDocument
        contenido = renderizar(doc_db)
        docx_obj = DocxDocument(contenido)
        partes = [p.text for p in docx_obj.paragraphs]
        for tabla in docx_obj.tables:
            for fila in tabla.rows:
                for celda in fila.cells:
                    partes.append(celda.text)
        texto = "\n".join(partes)
        self.assertNotIn("SHA256-OFICIAL-DGNNA-VERIFICADO", texto)
        self.assertIn(doc_db.hashIntegridad, texto)

    def test_listado_no_expone_documentos_ajenos_ni_criticos(self):
        """DA no debe ver documentos de DPE. DPE ve los de su dirección, pero no el
        caso crítico de un compañero de la misma dirección (solo su propio crítico)."""
        ids_da = {d["id"] for d in router.documentos(db=self.db, u=USUARIO_DA)}
        self.assertNotIn(self.doc_dpe.id, ids_da)
        self.assertNotIn(self.doc_critico.id, ids_da)
        self.assertNotIn(self.doc_critico_ajeno.id, ids_da)

        ids_dpe = {d["id"] for d in router.documentos(db=self.db, u=USUARIO_DPE)}
        self.assertIn(self.doc_dpe.id, ids_dpe)
        self.assertIn(self.doc_critico.id, ids_dpe)          # es su propio caso crítico
        self.assertNotIn(self.doc_critico_ajeno.id, ids_dpe)  # crítico de un compañero

        ids_admin = {d["id"] for d in router.documentos(db=self.db, u=USUARIO_ADMIN)}
        self.assertIn(self.doc_critico_ajeno.id, ids_admin)

