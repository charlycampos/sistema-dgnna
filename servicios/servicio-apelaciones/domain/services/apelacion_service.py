"""
Casos de uso del módulo de Apelaciones.
Solo depende de entidades y puertos — cero imports de FastAPI o SQLAlchemy.
"""
from typing import List, Optional
from domain.entities.apelacion import Apelacion
from domain.ports.apelacion_repository import ApelacionRepository
from domain.ports.complejidad_repository import ComplejidadRepository


class ApelacionService:

    def __init__(
        self,
        apelacion_repo: ApelacionRepository,
        complejidad_repo: ComplejidadRepository,
    ):
        self._apelaciones  = apelacion_repo
        self._complejidades = complejidad_repo

    # ── Casos de uso ──────────────────────────────────────────────

    def listar(self, estado: Optional[str] = None, abogado_id: Optional[str] = None) -> List[Apelacion]:
        return self._apelaciones.listar(estado=estado, abogado_id=abogado_id)

    def obtener(self, id: str) -> Apelacion:
        ap = self._apelaciones.obtener_por_id(id)
        if not ap:
            raise ValueError(f"Apelación {id} no encontrada")
        return ap

    def registrar(self, datos: dict) -> Apelacion:
        """Caso de uso: registrar una nueva apelación con cálculo de puntos."""
        pts_ext, pts_comp = self._calcular_puntos(datos["complejidadId"], datos["folios"])

        apelacion = Apelacion(
            numeroExpediente  = datos["numeroExpediente"],
            fechaIngreso      = datos["fechaIngreso"],
            fechaIngresoMIMP  = datos.get("fechaIngresoMIMP"),
            plazoVencimiento  = datos.get("plazoVencimiento"),
            apelante          = datos["apelante"],
            nnaCar            = datos.get("nnaCar"),
            procedencia       = datos["procedencia"],
            documento         = datos["documento"],
            asunto            = datos["asunto"],
            folios            = datos["folios"],
            complejidadId     = datos["complejidadId"],
            abogadoId         = datos["abogadoId"],
            fechaAsignacion   = datos.get("fechaAsignacion"),
            estado            = datos.get("estado", "Pendiente"),
            numeroResolucion  = datos.get("numeroResolucion"),
            documentoAtencion = datos.get("documentoAtencion"),
            cargos            = datos.get("cargos"),
            observaciones     = datos.get("observaciones"),
        )
        apelacion.calcular_puntos(pts_ext, pts_comp)
        return self._apelaciones.guardar(apelacion)

    def actualizar(self, id: str, datos: dict) -> Apelacion:
        """Caso de uso: actualizar una apelación existente."""
        apelacion = self.obtener(id)
        pts_ext, pts_comp = self._calcular_puntos(datos["complejidadId"], datos["folios"])

        apelacion.numeroExpediente  = datos["numeroExpediente"]
        apelacion.fechaIngreso      = datos["fechaIngreso"]
        apelacion.fechaIngresoMIMP  = datos.get("fechaIngresoMIMP")
        apelacion.plazoVencimiento  = datos.get("plazoVencimiento")
        apelacion.apelante          = datos["apelante"]
        apelacion.nnaCar            = datos.get("nnaCar")
        apelacion.procedencia       = datos["procedencia"]
        apelacion.documento         = datos["documento"]
        apelacion.asunto            = datos["asunto"]
        apelacion.folios            = datos["folios"]
        apelacion.complejidadId     = datos["complejidadId"]
        apelacion.abogadoId         = datos["abogadoId"]
        apelacion.estado            = datos.get("estado", apelacion.estado)
        apelacion.numeroResolucion  = datos.get("numeroResolucion")
        apelacion.documentoAtencion = datos.get("documentoAtencion")
        apelacion.cargos            = datos.get("cargos")
        apelacion.observaciones     = datos.get("observaciones")
        apelacion.revisorId         = datos.get("revisorId")
        if datos.get("fechaAsignacion"):
            apelacion.fechaAsignacion = datos["fechaAsignacion"]

        apelacion.calcular_puntos(pts_ext, pts_comp)
        return self._apelaciones.actualizar(apelacion)

    def eliminar(self, id: str) -> bool:
        self.obtener(id)  # valida que exista
        return self._apelaciones.eliminar(id)

    # ── Lógica interna ────────────────────────────────────────────

    def _calcular_puntos(self, complejidad_id: str, folios: int):
        complejidad = self._complejidades.obtener_por_id(complejidad_id)
        if not complejidad:
            raise ValueError("Complejidad jurídica no encontrada")

        rangos = self._complejidades.listar_rangos()
        pts_extension = 1
        for rango in rangos:
            if rango.aplica_para(folios):
                pts_extension = rango.puntos
                break

        return pts_extension, complejidad.puntos
