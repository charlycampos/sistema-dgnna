import os
import unittest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from infrastructure.db.database import Base
from infrastructure.db.models import Documento, Plantilla, Seccion, Valor
from infrastructure.api.router import (
    enviar_a_revision,
    observar_documento,
    aprobar_documento,
    sellar_y_publicar,
    crear_nueva_version_documento,
    actualizar
)
from infrastructure.api.schemas import DocumentoObservarRequest, DocumentoVersionarRequest, DocumentoUpdate

class DocumentLifecycleTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        self.plantilla = Plantilla(
            id="plt-test-1",
            codigo="PLT_TEST",
            nombre="Plantilla de Pruebas",
            tipoAmbito="NACIONAL",
            direccionDuena="DPE",
            version="1.0",
            estadoPlantilla="VIGENTE"
        )
        self.db.add(self.plantilla)
        self.db.flush()

        self.sec1 = Seccion(plantillaId=self.plantilla.id, orden=1, titulo="Resumen", tipoSeccion="TEXTO")
        self.db.add(self.sec1)

        self.doc = Documento(
            id="doc-test-1",
            plantillaId=self.plantilla.id,
            codigoInterno="AM-DPE-2026-0001",
            titulo="Informe Situacional de Prueba",
            estado="BORRADOR",
            direccion="DPE",
            creadoPor="Especialista DPE"
        )
        self.db.add(self.doc)
        self.db.flush()

        self.val1 = Valor(documentoId=self.doc.id, seccionId=self.sec1.id, textoContenido="Contenido inicial")
        self.db.add(self.val1)
        self.db.commit()

        self.u_especialista = {"id": "u1", "name": "Especialista DPE", "correo": "esp@mimp.gob.pe", "rol": "especialista", "direccion": "DPE"}
        self.u_revisor = {"id": "u2", "name": "Revisor DPE", "correo": "rev@mimp.gob.pe", "rol": "revisor", "direccion": "DPE"}
        self.u_admin = {"id": "u3", "name": "Admin Sistema", "correo": "admin@mimp.gob.pe", "rol": "admin", "direccion": "DGNNA"}

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_flujo_completo_aprobacion(self):
        res_rev = enviar_a_revision(self.doc.id, db=self.db, u=self.u_especialista)
        self.assertEqual("EN_REVISION", res_rev["estado"])

        res_obs = observar_documento(self.doc.id, DocumentoObservarRequest(observaciones="Ampliar antecedentes"), db=self.db, u=self.u_revisor)
        self.assertEqual("OBSERVADO", res_obs["estado"])
        self.assertIn("Ampliar antecedentes", res_obs["observaciones"])

        enviar_a_revision(self.doc.id, db=self.db, u=self.u_especialista)

        res_aprob = aprobar_documento(self.doc.id, db=self.db, u=self.u_revisor)
        self.assertEqual("APROBADO", res_aprob["estado"])

        class MockRequest:
            client = None
        
        res_pub = sellar_y_publicar(self.doc.id, request=MockRequest(), db=self.db, u=self.u_admin)
        self.assertEqual("PUBLICADO", res_pub["estado"])
        self.assertIsNotNone(res_pub["hashIntegridad"])
        self.assertEqual(64, len(res_pub["hashIntegridad"]))

        with self.assertRaises(HTTPException) as ctx:
            actualizar(self.doc.id, DocumentoUpdate(titulo="Modificación ilegal"), db=self.db, u=self.u_especialista)
        self.assertEqual(403, ctx.exception.status_code)

    def test_versionar_documento_publicado(self):
        self.doc.estado = "PUBLICADO"
        self.doc.hashIntegridad = "abcdef123456"
        self.db.commit()

        res_ver = crear_nueva_version_documento(
            self.doc.id,
            DocumentoVersionarRequest(nuevaVersion="2.0", motivo="Actualización de cifras"),
            db=self.db,
            u=self.u_especialista
        )
        self.assertEqual("2.0", res_ver["versionDoc"])
        self.assertEqual(self.doc.id, res_ver["documentoOrigenId"])
        self.assertIn("AM-DPE-2026-0001-V2_0", res_ver["codigoInterno"])

if __name__ == "__main__":
    unittest.main()
