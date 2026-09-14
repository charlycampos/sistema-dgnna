"""Pruebas de integridad, enums, validación sintáctica de JSON y correlativos transaccionales."""

import json
import os
import sys
import unittest
from pathlib import Path
from pydantic import ValidationError

SERVICE_DIR = Path(__file__).resolve().parents[1]
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SESSION_SECRET"] = "test-secret-dgnna-2026"
sys.path.insert(0, str(SERVICE_DIR))

from infrastructure.db.database import Base, engine, SessionLocal  # noqa: E402
from infrastructure.db.models import Plantilla, Seccion, Documento, Valor  # noqa: E402
from infrastructure.api import router  # noqa: E402
from infrastructure.api.schemas import (  # noqa: E402
    EstadoDocumento,
    TipoAmbito,
    DireccionDgnna,
    TipoSeccion,
    NivelRiesgo,
    PlantillaCreate,
    SeccionConfig,
    DocumentoCreate,
    DocumentoUpdate,
    ValorUpdate,
    AccionCreate,
)


USUARIO_ADMIN = {
    "nombre": "Admin Integridad",
    "correo": "admin@mimp.gob.pe",
    "rol": "admin",
    "direccion": "DGNNA"
}


class DataIntegrityTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

        self.plantilla = Plantilla(
            id="plantilla-integ-1",
            codigo="INTEG_DEMO",
            nombre="Plantilla Demo Integridad",
            tipoAmbito="NACIONAL",
            direccionDuena="DPE",
            esOficial=True,
            activo=True,
            creadoPor="Admin Integridad"
        )
        self.seccion = Seccion(
            id="sec-integ-1",
            plantillaId=self.plantilla.id,
            orden=1,
            titulo="Bloque 1",
            tipoSeccion="TEXTO"
        )
        self.db.add(self.plantilla)
        self.db.add(self.seccion)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_enums_rechazan_valores_invalidos(self):
        # "estado" ya no existe en DocumentoUpdate: los cambios de estado pasan por
        # /revisar, /observar, /aprobar, /publicar y /versionar, nunca por el PUT
        # genérico. Pasar ese campo no debe romper la validación, simplemente se ignora.
        DocumentoUpdate(estado="ESTADO_INVENTADO")  # type: ignore[call-arg]

        # Dirección inválida
        with self.assertRaises(ValidationError):
            DocumentoCreate(
                plantillaId="plantilla-integ-1",
                titulo="Documento Prueba",
                direccion="DIRECCION_FANTASMA"  # type: ignore
            )

        # Tipo de sección inválido
        with self.assertRaises(ValidationError):
            SeccionConfig(
                titulo="Sección Test",
                tipoSeccion="TIPO_INVALIDO"  # type: ignore
            )

    def test_validacion_json_malformado(self):
        # JSON inválido en SeccionConfig
        with self.assertRaises(ValidationError):
            SeccionConfig(
                titulo="Sección Tabla",
                tipoSeccion=TipoSeccion.TABLA_DATOS,
                configuracionJson="{esto_no_es_json: true"
            )

        # JSON inválido en ValorUpdate
        with self.assertRaises(ValidationError):
            ValorUpdate(
                seccionId="sec-integ-1",
                datosTablaJson="[{columna: no_cerrado"
            )

        # JSON válido pero no arreglo ni objeto
        with self.assertRaises(ValidationError):
            ValorUpdate(
                seccionId="sec-integ-1",
                datosTablaJson='"solo_un_string_plano"'
            )

        # JSON válido correcto (lista de dicts)
        val = ValorUpdate(
            seccionId="sec-integ-1",
            datosTablaJson=json.dumps([{"columna1": "valor1", "columna2": 100}])
        )
        self.assertIsNotNone(val.datosTablaJson)

    def test_correlativo_transaccional_consecutivo(self):
        # Crear 3 documentos consecutivos y verificar correlativo
        doc1 = router.crear_documento(
            data=DocumentoCreate(
                plantillaId=self.plantilla.id,
                titulo="Reporte Integridad 1",
                direccion=DireccionDgnna.DPE
            ),
            db=self.db,
            u=USUARIO_ADMIN
        )
        doc2 = router.crear_documento(
            data=DocumentoCreate(
                plantillaId=self.plantilla.id,
                titulo="Reporte Integridad 2",
                direccion=DireccionDgnna.DPE
            ),
            db=self.db,
            u=USUARIO_ADMIN
        )
        doc3 = router.crear_documento(
            data=DocumentoCreate(
                plantillaId=self.plantilla.id,
                titulo="Reporte Integridad 3",
                direccion=DireccionDgnna.DPE,
                region="Cusco"
            ),
            db=self.db,
            u=USUARIO_ADMIN
        )

        self.assertTrue(doc1["codigoInterno"].endswith("-001"))
        self.assertTrue(doc2["codigoInterno"].endswith("-002"))
        self.assertTrue(doc3["codigoInterno"].endswith("-003-CUS"))

    def test_actualizar_documento_con_enums(self):
        doc = router.crear_documento(
            data=DocumentoCreate(
                plantillaId=self.plantilla.id,
                titulo="Reporte para Actualizar",
                direccion=DireccionDgnna.DPE
            ),
            db=self.db,
            u=USUARIO_ADMIN
        )

        # Actualizar usando Enums. "estado" se intenta pasar (compatibilidad con
        # clientes viejos) pero debe ignorarse: el PUT genérico nunca cambia el
        # estado del documento, eso pasa por los endpoints dedicados del flujo.
        res = router.actualizar(
            doc_id=doc["id"],
            data=DocumentoUpdate(
                nivelRiesgo=NivelRiesgo.ALTO,
                direccion=DireccionDgnna.DA,
                valores=[
                    ValorUpdate(
                        seccionId="sec-integ-1",
                        textoContenido="Nuevo contenido validado"
                    )
                ]
            ),
            db=self.db,
            u=USUARIO_ADMIN
        )

        self.assertEqual(res["estado"], "BORRADOR")
        doc_db = self.db.query(Documento).filter_by(id=doc["id"]).first()
        self.assertIsNotNone(doc_db)
        self.assertEqual(doc_db.estado, "BORRADOR")
        self.assertEqual(doc_db.nivelRiesgo, "ALTO")
        self.assertEqual(doc_db.direccion, "DA")

    def test_put_no_puede_forzar_publicado_sin_pasar_por_el_flujo(self):
        """Cierra el hueco encontrado en la revisión: antes, PUT + estado=PUBLICADO
        sellaba un documento sin hash ni validación de aprobación."""
        doc = router.crear_documento(
            data=DocumentoCreate(
                plantillaId=self.plantilla.id,
                titulo="Intento de publicación indebida",
                direccion=DireccionDgnna.DPE
            ),
            db=self.db,
            u=USUARIO_ADMIN
        )

        res = router.actualizar(
            doc_id=doc["id"],
            data=DocumentoUpdate(titulo="Intento de publicación indebida (editado)"),
            db=self.db,
            u=USUARIO_ADMIN
        )
        self.assertEqual(res["estado"], "BORRADOR")

        doc_db = self.db.query(Documento).filter_by(id=doc["id"]).first()
        self.assertEqual(doc_db.estado, "BORRADOR")
        self.assertIsNone(doc_db.hashIntegridad)


if __name__ == "__main__":
    unittest.main()
