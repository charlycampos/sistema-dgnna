"""
Migración: agrega la columna FECHAREVISOR a la tabla APELACIONES en Oracle.

Ejecutar:
    cd backend
    python migrar_fecha_revisor.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no encontrada en .env")

engine = create_engine(DATABASE_URL)

SCHEMA = "APELACIONES_DB"

def main():
    print("Iniciando migración para columna FECHAREVISOR...")
    with engine.connect() as conn:
        # Verificar si la columna ya existe en el esquema correcto
        col_exists = conn.execute(
            text("""
                SELECT column_name FROM all_tab_columns
                WHERE owner = :schema
                  AND table_name = 'APELACIONES'
                  AND UPPER(column_name) = 'FECHAREVISOR'
            """),
            {"schema": SCHEMA}
        ).fetchone()

        if col_exists:
            print("La columna FECHAREVISOR ya existe en la base de datos. No se realizaron cambios.")
        else:
            alter_sql = f"""
                ALTER TABLE {SCHEMA}.APELACIONES
                ADD (fecharevisor TIMESTAMP(6) NULL)
            """
            try:
                conn.execute(text(alter_sql))
                conn.commit()
                print("Columna FECHAREVISOR agregada a la tabla APELACIONES con éxito.")
            except Exception as e:
                conn.rollback()
                print(f"Error al agregar la columna FECHAREVISOR: {e}")
                sys.exit(1)

if __name__ == "__main__":
    main()
