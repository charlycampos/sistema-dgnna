from typing import List, Optional
from domain.entities.reserva_sala import ReservaSala
from domain.ports.sala_repository import SalaRepository


class SalaService:

    def __init__(self, sala_repo: SalaRepository):
        self._sala = sala_repo

    def listar(self, mes=None, estado=None, categoria=None) -> List[ReservaSala]:
        return self._sala.listar(mes=mes, estado=estado, categoria=categoria)

    def obtener(self, id: str) -> ReservaSala:
        reserva = self._sala.obtener_por_id(id)
        if not reserva:
            raise ValueError(f"Reserva {id} no encontrada")
        return reserva

    def crear(self, datos: dict, usuario: str = "") -> ReservaSala:
        reserva = ReservaSala(
            fecha       = datos["fecha"],
            titulo      = datos["titulo"].strip(),
            horaInicio  = datos["horaInicio"],
            horaFin     = datos["horaFin"],
            categoria   = datos["categoria"].strip(),
            estado      = datos.get("estado", "Programado"),
            descripcion = datos.get("descripcion"),
            creadoPor   = datos.get("creadoPor") or usuario,
        )
        self._verificar_conflictos(reserva)
        return self._sala.guardar(reserva)

    def actualizar(self, id: str, datos: dict) -> ReservaSala:
        reserva = self.obtener(id)

        # Aplicar cambios
        if datos.get("fecha")      is not None: reserva.fecha      = datos["fecha"]
        if datos.get("titulo")     is not None: reserva.titulo     = datos["titulo"].strip()
        if datos.get("horaInicio") is not None: reserva.horaInicio = datos["horaInicio"]
        if datos.get("horaFin")    is not None: reserva.horaFin    = datos["horaFin"]
        if datos.get("categoria")  is not None: reserva.categoria  = datos["categoria"].strip()
        if datos.get("estado")     is not None: reserva.estado     = datos["estado"]
        if datos.get("descripcion")is not None: reserva.descripcion= datos["descripcion"]

        from datetime import datetime
        reserva.updatedAt = datetime.utcnow()

        # Solo verificar conflictos si no se está cancelando
        if reserva.estado != "Cancelado":
            self._verificar_conflictos(reserva, excluir_id=id)

        return self._sala.actualizar(reserva)

    def eliminar(self, id: str) -> bool:
        self.obtener(id)
        return self._sala.eliminar(id)

    # ── Regla de negocio ──────────────────────────────────────────

    def _verificar_conflictos(self, nueva: ReservaSala, excluir_id: Optional[str] = None) -> None:
        """Lanza ValueError si hay solapamiento de horarios en la misma fecha."""
        existentes = self._sala.listar_por_fecha(nueva.fecha, excluir_id=excluir_id)
        for existente in existentes:
            if nueva.tiene_conflicto_con(existente):
                raise ValueError(
                    f"Conflicto con '{existente.titulo}' ({existente.horaInicio}–{existente.horaFin})"
                )
