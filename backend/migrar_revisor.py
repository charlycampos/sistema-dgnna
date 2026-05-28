"""
Migración: agrega la columna REVISORID a la tabla APELACIONES en Oracle.

Las tablas están en el esquema APELACIONES_DB (usuario SYSTEM conectado).

Ejecutar UNA sola vez:
    cd backend
    python migrar_revisor.py
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL no encontrada en .env")

engine = create_engine(DATABASE_URL)

SCHEMA = "APELACIONES_DB"

with engine.connect() as conn:
    # Verificar si la columna ya existe en el esquema correcto
    col_exists = conn.execute(
        text("""
            SELECT column_name FROM all_tab_columns
            WHERE owner = :schema
              AND table_name = 'APELACIONES'
              AND UPPER(column_name) = 'REVISORID'
        """),
        {"schema": SCHEMA}
    ).fetchone()

    if col_exists:
        print("ℹ️  La columna REVISORID ya existe. No se realizaron cambios.")
    else:
        # Intentar con FK al esquema
        alter_con_fk = f"""
            ALTER TABLE {SCHEMA}.APELACIONES
            ADD (revisorid VARCHAR2(36) NULL
                 CONSTRAINT fk_apelaciones_revisor
                 REFERENCES {SCHEMA}.REVISORES(id))
        """
        alter_sin_fk = f"""
            ALTER TABLE {SCHEMA}.APELACIONES
            ADD (revisorid VARCHAR2(36) NULL)
        """
        try:
            conn.execute(text(alter_con_fk))
            conn.commit()
            print("✅  Columna REVISORID agregada con FK correctamente.")
        except Exception as e1:
            conn.rollback()
            print(f"⚠️  No se pudo agregar con FK ({e1}). Intentando sin FK...")
            try:
                conn.execute(text(alter_sin_fk))
                conn.commit()
                print("✅  Columna REVISORID agregada (sin FK).")
            except Exception as e2:
                conn.rollback()
                print(f"❌  Error al agregar columna: {e2}")
                raise
