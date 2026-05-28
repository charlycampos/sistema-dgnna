from typing import List, Optional
from domain.entities.caso_sustracion import CasoSustracion, BitacoraSustracion, HistorialJudicial
from domain.ports.caso_repository import CasoRepository


class SustracionService:

    def __init__(self, caso_repo: CasoRepository):
        self._casos = caso_repo

    def listar(self, estado=None, profesional=None, pais=None, q=None) -> List[CasoSustracion]:
        return self._casos.listar(estado=estado, profesional=profesional, pais=pais, q=q)

    def obtener(self, id: str) -> CasoSustracion:
        caso = self._casos.obtener_por_id(id)
        if not caso:
            raise ValueError(f"Caso {id} no encontrado")
        return caso

    def crear(self, datos: dict, usuario: str = "") -> CasoSustracion:
        codigo = datos["codigo"].strip()
        if self._casos.obtener_por_codigo(codigo):
            raise ValueError(f"El código '{codigo}' ya existe")

        caso = CasoSustracion(
            codigo      = codigo,
            nnaNombre   = datos["nnaNombre"].strip(),
            pais        = datos["pais"].strip(),
            fechaIngreso = datos["fechaIngreso"],
            creadoPor   = datos.get("creadoPor") or usuario,
            **{k: v for k, v in datos.items() if k not in ("codigo", "nnaNombre", "pais", "fechaIngreso", "creadoPor")}
        )
        return self._casos.guardar(caso)

    def actualizar(self, id: str, datos: dict) -> CasoSustracion:
        caso = self.obtener(id)

        # Validar código único si cambia
        nuevo_codigo = datos.get("codigo", "").strip()
        if nuevo_codigo and nuevo_codigo != caso.codigo:
            existente = self._casos.obtener_por_codigo(nuevo_codigo)
            if existente and existente.id != id:
                raise ValueError(f"El código '{nuevo_codigo}' ya está en uso")

        for campo, valor in datos.items():
            if hasattr(caso, campo):
                setattr(caso, campo, valor.strip() if isinstance(valor, str) and campo != "codigo" else valor)

        if nuevo_codigo:
            caso.codigo = nuevo_codigo

        from datetime import datetime
        caso.updatedAt = datetime.utcnow()
        return self._casos.actualizar(caso)

    def eliminar(self, id: str) -> bool:
        self.obtener(id)
        return self._casos.eliminar(id)

    # ── Bitácora ──────────────────────────────────────────────────

    def agregar_bitacora(self, caso_id: str, datos: dict, usuario: str = "") -> BitacoraSustracion:
        self.obtener(caso_id)
        entrada = BitacoraSustracion(
            casoId    = caso_id,
            fecha     = datos["fecha"],
            texto     = datos["texto"].strip(),
            creadoPor = datos.get("creadoPor") or usuario,
        )
        return self._casos.agregar_bitacora(entrada)

    def eliminar_bitacora(self, caso_id: str, entrada_id: str) -> bool:
        return self._casos.eliminar_bitacora(caso_id, entrada_id)

    # ── Historial judicial ─────────────────────────────────────────

    def agregar_historial(self, caso_id: str, datos: dict, usuario: str = "") -> HistorialJudicial:
        caso = self.obtener(caso_id)
        entrada = HistorialJudicial(
            casoId      = caso_id,
            etapa       = datos["etapa"],
            fecha       = datos["fecha"],
            descripcion = datos.get("descripcion"),
            creadoPor   = datos.get("creadoPor") or usuario,
        )
        resultado = self._casos.agregar_historial(entrada)

        # Regla de negocio: actualizar estado judicial del caso
        caso.estadoJudicial = datos["etapa"]
        self._casos.actualizar(caso)

        return resultado

    def eliminar_historial(self, caso_id: str, entrada_id: str) -> bool:
        resultado = self._casos.eliminar_historial(caso_id, entrada_id)

        # Regla de negocio: recalcular estado judicial
        caso = self.obtener(caso_id)
        ultimo = self._casos.ultimo_historial(caso_id)
        caso.estadoJudicial = ultimo.etapa if ultimo else "Sin demanda"
        self._casos.actualizar(caso)

        return resultado
