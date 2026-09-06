"""Reconstruye hitos históricos de Resuelto usando únicamente Auditoría.

La migración es idempotente: solo completa ``FECHACAMBIORESUELTO`` cuando está
vacío y existe un evento auditado cuyo estado nuevo es ``Resuelto`` y cuyo
estado anterior era distinto. No utiliza ``FECHARESOLUCION`` como aproximación.
"""

import os
from typing import Iterable, Mapping

from sqlalchemy import create_engine, text

from infrastructure.db.database import engine as apelaciones_engine


AUDITORIA_DATABASE_URL = os.getenv(
    "AUDITORIA_DATABASE_URL",
    "oracle+oracledb://auditoria_db:Auditoria2026@localhost:1521/?service_name=XEPDB1",
)


def normalizar_hitos(filas: Iterable[Mapping]) -> dict[str, object]:
    """Conserva el primer evento verificable por expediente."""
    hitos: dict[str, object] = {}
    for fila in filas:
        registro_id = str(fila["registro_id"])
        fecha = fila["fecha_cambio_resuelto"]
        if registro_id not in hitos or fecha < hitos[registro_id]:
            hitos[registro_id] = fecha
    return hitos


def obtener_hitos_auditados(auditoria_engine) -> dict[str, object]:
    consulta = text(
        """
        SELECT registroid AS registro_id,
               MIN(createdat) AS fecha_cambio_resuelto
          FROM auditoria_sistema
         WHERE LOWER(modulo) = 'apelaciones'
           AND JSON_VALUE(valoresnuevos, '$.estado') = 'Resuelto'
           AND (
                valoresprevios IS NULL
                OR JSON_VALUE(valoresprevios, '$.estado') IS NULL
                OR JSON_VALUE(valoresprevios, '$.estado') <> 'Resuelto'
           )
         GROUP BY registroid
        """
    )
    with auditoria_engine.connect() as connection:
        return normalizar_hitos(connection.execute(consulta).mappings())


def aplicar_migracion() -> tuple[int, int]:
    auditoria_engine = create_engine(AUDITORIA_DATABASE_URL)
    hitos = obtener_hitos_auditados(auditoria_engine)
    actualizados = 0
    sentencia = text(
        """
        UPDATE apelaciones
           SET fechacambioresuelto = :fecha_cambio_resuelto
         WHERE id = :registro_id
           AND fechacambioresuelto IS NULL
        """
    )
    with apelaciones_engine.begin() as connection:
        for registro_id, fecha in hitos.items():
            resultado = connection.execute(
                sentencia,
                {
                    "registro_id": registro_id,
                    "fecha_cambio_resuelto": fecha,
                },
            )
            actualizados += resultado.rowcount
    auditoria_engine.dispose()
    print(
        f"Reconstrucción auditada completada: {actualizados} actualizados "
        f"de {len(hitos)} hitos verificables."
    )
    return actualizados, len(hitos)


if __name__ == "__main__":
    aplicar_migracion()
