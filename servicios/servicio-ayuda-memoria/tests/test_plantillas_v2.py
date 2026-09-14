import os
import unittest

os.environ["TESTING"] = "true"

from infrastructure.db.database import Base, engine, SessionLocal
from infrastructure.db.models import Plantilla, Seccion, Documento
from infrastructure.api.router import (
    plantillas,
    obtener_plantilla,
    crear_plantilla,
    actualizar_plantilla,
    clonar_plantilla,
    publicar_plantilla,
    retirar_plantilla,
    crear_documento
)
from infrastructure.api.schemas import (
    PlantillaCreate,
    PlantillaUpdate,
    PlantillaClonarRequest,
    DocumentoCreate,
    SeccionConfig,
    TipoAmbito,
    DireccionDgnna,
    TipoSeccion,
    EstadoPlantilla
)
from fastapi import HTTPException


class TestPlantillasV2(unittest.TestCase):

    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.admin_user = {"id": "1", "nombre": "Admin User", "rol": "admin", "direccion": "DPE"}
        self.normal_user = {"id": "2", "nombre": "Normal User", "rol": "especialista", "direccion": "DPE"}

    def tearDown(self):
        self.db.close()

    def test_crear_plantilla_con_version_y_estado(self):
        req = PlantillaCreate(
            codigo="PLANT_TEST",
            nombre="Plantilla de Prueba",
            tipoAmbito=TipoAmbito.NACIONAL,
            direccionDuena=DireccionDgnna.DPE,
            version="1.0",
            estadoPlantilla=EstadoPlantilla.BORRADOR,
            secciones=[
                SeccionConfig(orden=1, titulo="Introducción", tipoSeccion=TipoSeccion.TEXTO)
            ]
        )
        res = crear_plantilla(req, self.db, self.admin_user)
        self.assertEqual(res["version"], "1.0")
        self.assertEqual(res["estadoPlantilla"], "BORRADOR")

        # Consultar por ID
        detalle = obtener_plantilla(res["id"], self.db, self.normal_user)
        self.assertEqual(detalle["codigo"], "PLANT_TEST")
        self.assertEqual(detalle["version"], "1.0")
        self.assertEqual(detalle["estadoPlantilla"], "BORRADOR")
        self.assertEqual(len(detalle["secciones"]), 1)

    def test_filtro_plantillas_por_estado_y_rol(self):
        # Admin crea una VIGENTE y una BORRADOR
        crear_plantilla(
            PlantillaCreate(
                codigo="P_VIGENTE",
                nombre="Plantilla Vigente",
                estadoPlantilla=EstadoPlantilla.VIGENTE,
                esOficial=True
            ),
            self.db,
            self.admin_user
        )
        crear_plantilla(
            PlantillaCreate(
                codigo="P_BORRADOR",
                nombre="Plantilla Borrador",
                estadoPlantilla=EstadoPlantilla.BORRADOR
            ),
            self.db,
            self.admin_user
        )

        # Usuario normal solo ve VIGENTE por defecto
        lista_normal = plantillas(direccion=None, estado=None, db=self.db, u=self.normal_user)
        codigos_normal = [p["codigo"] for p in lista_normal]
        self.assertIn("P_VIGENTE", codigos_normal)
        self.assertNotIn("P_BORRADOR", codigos_normal)

        # Admin ve todas si no filtra
        lista_admin = plantillas(direccion=None, estado=None, db=self.db, u=self.admin_user)
        codigos_admin = [p["codigo"] for p in lista_admin]
        self.assertIn("P_VIGENTE", codigos_admin)
        self.assertIn("P_BORRADOR", codigos_admin)

    def test_clonar_plantilla(self):
        # Crear plantilla original
        p_orig = crear_plantilla(
            PlantillaCreate(
                codigo="P_BASE",
                nombre="Plantilla Base",
                estadoPlantilla=EstadoPlantilla.VIGENTE,
                secciones=[
                    SeccionConfig(orden=1, titulo="Seccion 1", tipoSeccion=TipoSeccion.TEXTO)
                ]
            ),
            self.db,
            self.admin_user
        )

        # Clonar
        req_clon = PlantillaClonarRequest(
            nuevaVersion="2.0",
            nuevoNombre="Plantilla Base v2"
        )
        res_clon = clonar_plantilla(p_orig["id"], req_clon, self.db, self.normal_user)
        self.assertEqual(res_clon["version"], "2.0")
        self.assertEqual(res_clon["estadoPlantilla"], "BORRADOR")
        self.assertEqual(res_clon["plantillaOrigenId"], p_orig["id"])

        # Verificar que heredo secciones
        detalle_clon = obtener_plantilla(res_clon["id"], self.db, self.normal_user)
        self.assertEqual(len(detalle_clon["secciones"]), 1)
        self.assertEqual(detalle_clon["secciones"][0]["titulo"], "Seccion 1")

    def test_publicar_y_retirar_plantilla(self):
        p = crear_plantilla(
            PlantillaCreate(
                codigo="P_CICLO",
                nombre="Plantilla Ciclo",
                estadoPlantilla=EstadoPlantilla.BORRADOR
            ),
            self.db,
            self.admin_user
        )

        # Usuario normal no puede publicar (403)
        with self.assertRaises(HTTPException) as ctx:
            publicar_plantilla(p["id"], self.db, self.normal_user)
        self.assertEqual(ctx.exception.status_code, 403)

        # Admin publica
        pub_res = publicar_plantilla(p["id"], self.db, self.admin_user)
        self.assertEqual(pub_res["estadoPlantilla"], "VIGENTE")

        # Admin retira
        ret_res = retirar_plantilla(p["id"], self.db, self.admin_user)
        self.assertEqual(ret_res["estadoPlantilla"], "RETIRADA")

    def test_inmutabilidad_plantilla_con_documentos(self):
        # Crear plantilla vigente con 1 seccion
        p = crear_plantilla(
            PlantillaCreate(
                codigo="P_DOCS",
                nombre="Plantilla con Docs",
                estadoPlantilla=EstadoPlantilla.VIGENTE,
                secciones=[
                    SeccionConfig(orden=1, titulo="Seccion Base", tipoSeccion=TipoSeccion.TEXTO)
                ]
            ),
            self.db,
            self.admin_user
        )

        # Crear documento usando esa plantilla
        doc_req = DocumentoCreate(
            plantillaId=p["id"],
            titulo="Documento de Prueba",
            direccion=DireccionDgnna.DPE
        )
        crear_documento(doc_req, self.db, self.normal_user)

        # Intentar modificar la plantilla vigente con documentos (debe fallar 400)
        upd_req = PlantillaUpdate(
            nombre="Intento de Cambio",
            secciones=[
                SeccionConfig(orden=1, titulo="Nueva Seccion", tipoSeccion=TipoSeccion.TEXTO)
            ]
        )
        with self.assertRaises(HTTPException) as ctx:
            actualizar_plantilla(p["id"], upd_req, self.db, self.admin_user)
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
