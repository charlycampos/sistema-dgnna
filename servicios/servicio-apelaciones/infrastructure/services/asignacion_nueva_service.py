from datetime import datetime
from sqlalchemy.orm import Session
from domain.services.asignacion_nueva import decidir_asignacion, ORDEN_NOMBRES
from infrastructure.db.models import (AbogadoModel, ComplejidadModel, ExtensionRangoModel,
    ApelacionModel, ApelanteDetalleModel, NnaDetalleModel, AsignacionModalidadModel, AsignacionEventoModel)


class AsignacionNuevaService:
    def __init__(self, db: Session): self.db = db

    def _modalidad(self, bloquear=False):
        q = self.db.query(AsignacionModalidadModel).filter(AsignacionModalidadModel.id == "asignacion-nueva-desde-cero", AsignacionModalidadModel.activo == True)
        if bloquear: q = q.with_for_update()
        modalidad = q.one_or_none()
        if not modalidad: raise ValueError("La nueva modalidad de asignación aún no está configurada")
        return modalidad

    def _orden(self, modalidad):
        ids = [modalidad.karlaId, modalidad.karolId, modalidad.claraId]
        abogados = self.db.query(AbogadoModel).filter(AbogadoModel.id.in_(ids)).all()
        encontrados = {a.id: a for a in abogados}
        if len(encontrados) != 3:
            raise ValueError("No se encontró la configuración de Karla Garcia, Karol Castro y Clara Michaud")
        return ids, encontrados

    def propuesta(self, complejidad_id, folios):
        if folios < 1 or folios > 1000000: raise ValueError("Folios debe estar entre 1 y 1 000 000")
        if not self.db.query(ComplejidadModel).filter(ComplejidadModel.id == complejidad_id, ComplejidadModel.activo == True).first():
            raise ValueError("Complejidad jurídica no encontrada o inactiva")
        modalidad = self._modalidad()
        orden, abogados = self._orden(modalidad)
        eventos = self.db.query(AsignacionEventoModel).filter(AsignacionEventoModel.modalidadId == modalidad.id).order_by(AsignacionEventoModel.secuencia).all()
        elegido, criterio = decidir_asignacion(orden, eventos, complejidad_id, folios, modalidad.ultimoAbogadoId)
        return self._tablero(modalidad, orden, abogados, eventos, elegido, criterio, folios, complejidad_id)

    def _tablero(self, modalidad, orden, abogados, eventos, elegido, criterio, folios, complejidad_id):
        salida = []
        for abogado_id in orden:
            propios = [e for e in eventos if e.abogadoId == abogado_id]
            salida.append({"abogado": {"id": abogado_id, "nombre": abogados[abogado_id].nombre, "activo": True},
                "total": len(propios), "mayores500": sum(1 for e in propios if e.esMayor500),
                "porComplejidad": {cid: sum(1 for e in propios if e.complejidadId == cid) for cid in set([complejidad_id] + [e.complejidadId for e in eventos])},
                "ultimasAsignaciones": [{"secuencia": e.secuencia, "complejidadId": e.complejidadId, "folios": e.folios, "esMayor500": e.esMayor500, "criterio": e.criterio, "asignadoEn": e.asignadoEn} for e in propios[-10:]]})
        turno = orden[0] if not eventos else orden[(orden.index(modalidad.ultimoAbogadoId) + 1) % 3]
        return {"modalidadId": modalidad.id, "abogadoId": elegido, "abogadoNombre": abogados[elegido].nombre,
            "criterio": criterio, "turnoReferenciaId": turno, "siguienteSecuencia": modalidad.ultimaSecuencia + 1,
            "esMayor500": folios > 500, "abogados": salida}

    def estado_tablero(self):
        """Estado actual de la modalidad para el dashboard (sin proponer un caso)."""
        complejidades = self.db.query(ComplejidadModel).filter(ComplejidadModel.activo == True).order_by(ComplejidadModel.nombre).all()
        lista_comp = [{"id": c.id, "nombre": c.nombre} for c in complejidades]
        modalidad = self.db.query(AsignacionModalidadModel).filter(AsignacionModalidadModel.id == "asignacion-nueva-desde-cero", AsignacionModalidadModel.activo == True).one_or_none()
        if not modalidad:
            return {"configurada": False, "mensaje": "La nueva modalidad de asignación aún no está configurada (revise los nombres de Karla Garcia, Karol Castro y Clara Michaud).", "complejidades": lista_comp, "abogados": [], "recientes": []}
        orden, abogados = self._orden(modalidad)
        eventos = self.db.query(AsignacionEventoModel).filter(AsignacionEventoModel.modalidadId == modalidad.id).order_by(AsignacionEventoModel.secuencia).all()
        nombres_comp = {c.id: c.nombre for c in complejidades}
        # Abogados fuera de las tres (p. ej. casos vinculados a expedientes de otro abogado)
        otros_ids = {e.abogadoId for e in eventos} - set(orden)
        nombres_ab = {a.id: a.nombre for a in self.db.query(AbogadoModel).filter(AbogadoModel.id.in_(list(otros_ids) + orden)).all()} if eventos else {i: abogados[i].nombre for i in orden}
        exp = {}
        ultimos = eventos[-8:]
        if ultimos:
            exp = {a.id: a.numeroExpediente for a in self.db.query(ApelacionModel.id, ApelacionModel.numeroExpediente).filter(ApelacionModel.id.in_([e.apelacionId for e in ultimos])).all()}
        filas = []
        for abogado_id in orden:
            propios = [e for e in eventos if e.abogadoId == abogado_id]
            filas.append({
                "abogado": {"id": abogado_id, "nombre": abogados[abogado_id].nombre},
                "total": len(propios),
                "mayores500": sum(1 for e in propios if e.esMayor500),
                "vinculados": sum(1 for e in propios if (e.criterio or "").startswith("Vinculado")),
                "porComplejidad": {c["id"]: sum(1 for e in propios if e.complejidadId == c["id"]) for c in lista_comp},
            })
        totales = [f["total"] for f in filas]
        turno = orden[0] if not modalidad.ultimoAbogadoId else orden[(orden.index(modalidad.ultimoAbogadoId) + 1) % 3]
        return {
            "configurada": True,
            "modalidadId": modalidad.id,
            "iniciadoEn": modalidad.iniciadoEn,
            "totalAsignados": len(eventos),
            "siguienteSecuencia": modalidad.ultimaSecuencia + 1,
            "turnoReferenciaId": turno,
            "turnoReferenciaNombre": abogados[turno].nombre,
            "brechaTotal": (max(totales) - min(totales)) if totales else 0,
            "casosOtrosAbogados": sum(1 for e in eventos if e.abogadoId in otros_ids),
            "complejidades": lista_comp,
            "abogados": filas,
            "recientes": [{
                "secuencia": e.secuencia,
                "numeroExpediente": exp.get(e.apelacionId, ""),
                "abogadoId": e.abogadoId,
                "abogadoNombre": nombres_ab.get(e.abogadoId, "—"),
                "complejidadId": e.complejidadId,
                "complejidadNombre": nombres_comp.get(e.complejidadId, "—"),
                "folios": e.folios,
                "esMayor500": e.esMayor500,
                "criterio": e.criterio,
                "asignadoEn": e.asignadoEn,
            } for e in reversed(ultimos)],
        }

    def registrar(self, datos):
        modalidad = self._modalidad(bloquear=True)
        orden, abogados = self._orden(modalidad)
        complejidad = self.db.query(ComplejidadModel).filter(ComplejidadModel.id == datos["complejidadId"], ComplejidadModel.activo == True).first()
        if not complejidad: raise ValueError("Complejidad jurídica no encontrada o inactiva")
        folios = datos["folios"]
        if not isinstance(folios, int) or folios < 1 or folios > 1000000: raise ValueError("Folios debe ser un entero entre 1 y 1 000 000")
        eventos = self.db.query(AsignacionEventoModel).filter(AsignacionEventoModel.modalidadId == modalidad.id).order_by(AsignacionEventoModel.secuencia).all()
        vinculada_id = datos.get("apelacionVinculadaId")
        if vinculada_id:
            # Caso vinculado: va al mismo abogado del expediente existente (se lee de BD,
            # no del navegador) y suma a su cuenta. No mueve el turno circular.
            vinculada = self.db.query(ApelacionModel).filter(ApelacionModel.id == vinculada_id).first()
            if not vinculada:
                raise ValueError("El expediente vinculado no existe")
            abogado_id = vinculada.abogadoId
            criterio = f"Vinculado al expediente {vinculada.numeroExpediente}"[:200]
        else:
            abogado_id, criterio = decidir_asignacion(orden, eventos, datos["complejidadId"], folios, modalidad.ultimoAbogadoId)
        rango = self.db.query(ExtensionRangoModel).filter(ExtensionRangoModel.activo == True, ExtensionRangoModel.minFolios <= folios).filter((ExtensionRangoModel.maxFolios == None) | (ExtensionRangoModel.maxFolios >= folios)).order_by(ExtensionRangoModel.minFolios.desc()).first()
        puntos_extension = rango.puntos if rango else 1
        ahora = datetime.utcnow()
        apelacion = ApelacionModel(numeroExpediente=datos["numeroExpediente"], fechaIngreso=datos["fechaIngreso"], fechaIngresoMIMP=datos.get("fechaIngresoMIMP"), plazoVencimiento=datos.get("plazoVencimiento"), apelante=datos.get("apelante"), nnaCar=datos.get("nnaCar"), procedencia=datos["procedencia"], documento=datos["documento"], asunto=datos["asunto"], folios=folios, puntosExtension=puntos_extension, complejidadId=complejidad.id, puntosComplejidad=complejidad.puntos, puntosTotal=puntos_extension + complejidad.puntos, abogadoId=abogado_id, fechaAsignacion=datos.get("fechaAsignacion") or ahora, estado=datos.get("estado", "Pendiente"), numeroResolucion=datos.get("numeroResolucion"), resultadoResolucion=datos.get("resultadoResolucion"), fechaResolucion=datos.get("fechaResolucion"), documentoAtencion=datos.get("documentoAtencion"), cargos=datos.get("cargos"), observaciones=datos.get("observaciones"), revisorId=datos.get("revisorId"), fechaRevisor=datos.get("fechaRevisor"))
        apelacion.apelantes = [ApelanteDetalleModel(**x) for x in (datos.get("apelantes") or [])]
        apelacion.nnas = [NnaDetalleModel(**x) for x in (datos.get("nnas") or [])]
        self.db.add(apelacion); self.db.flush()
        secuencia = modalidad.ultimaSecuencia + 1
        self.db.add(AsignacionEventoModel(modalidadId=modalidad.id, secuencia=secuencia, apelacionId=apelacion.id, abogadoId=abogado_id, complejidadId=complejidad.id, folios=folios, esMayor500=folios > 500, criterio=criterio))
        modalidad.ultimaSecuencia = secuencia
        if not vinculada_id:
            modalidad.ultimoAbogadoId = abogado_id
        self.db.flush()
        return apelacion

    def sincronizar(self, apelacion_id, abogado_id, complejidad_id, folios):
        """Mantiene el evento alineado con la apelación editada.

        Si se reasigna el abogado ("Cambiar abogado"), el caso pasa a contar para
        el nuevo abogado. También refleja cambios de complejidad o folios.
        Las apelaciones históricas no tienen evento y no se tocan.
        """
        evento = self.db.query(AsignacionEventoModel).filter(AsignacionEventoModel.apelacionId == apelacion_id).first()
        if not evento:
            return
        evento.abogadoId = abogado_id
        evento.complejidadId = complejidad_id
        evento.folios = folios
        evento.esMayor500 = folios > 500
        self.db.flush()

    def quitar(self, apelacion_id):
        """Elimina el evento de una apelación que se va a borrar (evita el error de FK)."""
        self.db.query(AsignacionEventoModel).filter(AsignacionEventoModel.apelacionId == apelacion_id).delete(synchronize_session=False)
        self.db.flush()
