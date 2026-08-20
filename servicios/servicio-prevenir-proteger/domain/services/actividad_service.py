from datetime import datetime
from typing import List

from domain.entities.actividad import Actividad
from domain.ports.actividad_repository import ActividadRepository


class ActividadService:
    def __init__(self, repository: ActividadRepository):
        self._repository = repository

    def listar(self, **filtros) -> List[Actividad]:
        return self._repository.listar(**filtros)

    def obtener(self, id: str) -> Actividad:
        actividad = self._repository.obtener_por_id(id)
        if not actividad:
            raise ValueError("Actividad no encontrada")
        return actividad

    def crear(self, datos: dict, usuario: str = "") -> Actividad:
        self._validar(datos)
        actividad = Actividad(
            nombreActividad=datos["nombreActividad"].strip(),
            tipoActividad=datos["tipoActividad"],
            fecha=datos["fecha"],
            departamento=datos["departamento"].strip(),
            modalidad=datos["modalidad"],
            estado=datos.get("estado", "Planificada"),
            codigo=datos.get("codigo") or None,
            provincia=datos.get("provincia") or None,
            distrito=datos.get("distrito") or None,
            entidadAliada=datos.get("entidadAliada") or None,
            publicoObjetivo=datos.get("publicoObjetivo") or None,
            participantesMujeres=datos.get("participantesMujeres", 0),
            participantesHombres=datos.get("participantesHombres", 0),
            participantesOtros=datos.get("participantesOtros", 0),
            responsable=datos.get("responsable") or None,
            observaciones=datos.get("observaciones") or None,
            creadoPor=usuario or datos.get("creadoPor"),
        )
        return self._repository.guardar(actividad)

    def actualizar(self, id: str, datos: dict) -> Actividad:
        actividad = self.obtener(id)
        valores = {**actividad.__dict__, **datos}
        self._validar(valores)
        for campo, valor in datos.items():
            if hasattr(actividad, campo):
                setattr(actividad, campo, valor if valor != "" else None)
        actividad.nombreActividad = actividad.nombreActividad.strip()
        actividad.departamento = actividad.departamento.strip()
        actividad.updatedAt = datetime.utcnow()
        return self._repository.actualizar(actividad)

    def eliminar(self, id: str) -> bool:
        self.obtener(id)
        return self._repository.eliminar(id)

    @staticmethod
    def _validar(datos: dict) -> None:
        if not str(datos.get("nombreActividad", "")).strip():
            raise ValueError("El nombre de la actividad es obligatorio")
        if not str(datos.get("departamento", "")).strip():
            raise ValueError("El departamento es obligatorio")
        for campo, etiqueta in (
            ("tipoActividad", "tipo de actividad"),
            ("fecha", "fecha"),
            ("modalidad", "modalidad"),
            ("estado", "estado"),
        ):
            if not str(datos.get(campo, "")).strip():
                raise ValueError(f"El campo {etiqueta} es obligatorio")
        for campo in ("participantesMujeres", "participantesHombres", "participantesOtros"):
            if int(datos.get(campo, 0) or 0) < 0:
                raise ValueError("La cantidad de participantes no puede ser negativa")
