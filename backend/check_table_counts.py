import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_counts():
    with engine.connect() as conn:
        # Imprimir esquema actual
        schema = conn.execute(text("SELECT sys_context('userenv', 'current_schema') FROM dual")).scalar()
        print(f"Esquema actual de la sesión: {schema}")
        
        for table in ["REVISORES", "APELACIONES", "ABOGADOS", "COMPLEJIDADES_JURIDICAS"]:
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                print(f"Tabla {table} (sin prefijo): {count} registros")
            except Exception as e:
                print(f"Error en {table} (sin prefijo): {e}")
                
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM APELACIONES_DB.{table}")).scalar()
                print(f"Tabla APELACIONES_DB.{table}: {count} registros")
            except Exception as e:
                print(f"Error en APELACIONES_DB.{table}: {e}")

if __name__ == "__main__":
    check_counts()
