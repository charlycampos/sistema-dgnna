"""Agrega de forma idempotente el hito automático de primera resolución."""

from sqlalchemy import text

from infrastructure.db.database import engine


def aplicar_migracion() -> None:
    with engine.begin() as connection:
        columnas = {
            fila[0]
            for fila in connection.execute(
                text(
                    "SELECT column_name FROM user_tab_columns "
                    "WHERE table_name = 'APELACIONES'"
                )
            )
        }
        if "FECHACAMBIORESUELTO" not in columnas:
            connection.execute(
                text("ALTER TABLE apelaciones ADD fechacambioresuelto TIMESTAMP")
            )

    print("Migración de fechaCambioResuelto aplicada correctamente.")


if __name__ == "__main__":
    aplicar_migracion()
