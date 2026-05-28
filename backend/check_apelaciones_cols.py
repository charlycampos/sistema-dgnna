"""
Verifica las columnas reales de la tabla apelaciones.
"""
import os, sys
sys.path.insert(0, '.')
# Intentamos obtener la URL de .env si existe, si no usamos el default de ejemplo
from dotenv import load_dotenv
load_dotenv()
db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("DATABASE_URL no encontrada. Usando default de prueba.")
    db_url = 'oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1'

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Ver columnas reales de la tabla
    try:
        result = conn.execute(text("""
            SELECT column_name, data_type, nullable
            FROM user_tab_columns
            WHERE table_name = 'APELACIONES'
            ORDER BY column_id
        """))
        print("=== Columnas de APELACIONES ===")
        found = False
        for row in result:
            found = True
            print(f"  {row[0]:30s} {row[1]:15s} {row[2]}")
        if not found:
            print("No se encontró la tabla APELACIONES.")
    except Exception as e:
        print(f"Error al consultar columnas: {e}")

    # Ver algunos registros para ver si tienen puntos
    try:
        result2 = conn.execute(text('SELECT "numeroExpediente", "puntosTotal", "estado" FROM APELACIONES WHERE ROWNUM <= 5'))
        print("\n=== Algunos registros ===")
        for row in result2:
            print(f"  Expediente: {row[0]}, Puntos: {row[1]}, Estado: {row[2]}")
    except Exception as e:
        print(f"Error al consultar registros: {e}")
