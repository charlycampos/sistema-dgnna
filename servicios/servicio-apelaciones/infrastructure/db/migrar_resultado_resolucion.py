"""Aplica de forma idempotente los campos finales de resolución en Oracle."""

from sqlalchemy import text

from infrastructure.db.database import engine


RESULTADOS_VALIDOS = (
    "FUNDADO",
    "FUNDADO_EN_PARTE",
    "INFUNDADO",
    "IMPROCEDENTE",
    "CARECE_DE_OBJETO",
    "NULIDAD",
    "REMISION_ORGANO_COMPETENTE",
)


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

        if "RESULTADORESOLUCION" not in columnas:
            connection.execute(
                text("ALTER TABLE apelaciones ADD resultadoresolucion VARCHAR2(40)")
            )
        if "FECHARESOLUCION" not in columnas:
            connection.execute(
                text("ALTER TABLE apelaciones ADD fecharesolucion TIMESTAMP")
            )

        restricciones = {
            fila[0]
            for fila in connection.execute(
                text(
                    "SELECT constraint_name FROM user_constraints "
                    "WHERE table_name = 'APELACIONES'"
                )
            )
        }
        if "CK_AP_RESULTADO_RESOLUCION" not in restricciones:
            valores = ", ".join(f"'{resultado}'" for resultado in RESULTADOS_VALIDOS)
            connection.execute(
                text(
                    "ALTER TABLE apelaciones ADD CONSTRAINT "
                    "ck_ap_resultado_resolucion CHECK "
                    f"(resultadoresolucion IS NULL OR resultadoresolucion IN ({valores}))"
                )
            )

    print("Migración de resultado de resolución aplicada correctamente.")


if __name__ == "__main__":
    aplicar_migracion()
