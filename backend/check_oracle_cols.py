"""
Verifica las columnas reales de la tabla casos_sustracion en Oracle
y hace un UPDATE directo para comprobar si el campo NNASEXO funciona.
"""
import os, sys
sys.path.insert(0, '.')
os.environ.setdefault('DATABASE_URL', 'oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1')

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Ver columnas reales de la tabla
    result = conn.execute(text("""
        SELECT column_name, data_type, nullable
        FROM user_tab_columns
        WHERE table_name = 'CASOS_SUSTRACION'
        ORDER BY column_id
    """))
    print("=== Columnas de CASOS_SUSTRACION ===")
    for row in result:
        print(f"  {row[0]:30s} {row[1]:15s} {row[2]}")

    # Ver valor actual del campo NNASEXO en el primer registro
    result2 = conn.execute(text('SELECT ID, "nnaNombre", NNASEXO FROM CASOS_SUSTRACION WHERE ROWNUM = 1'))
    print("\n=== Primer registro ===")
    for row in result2:
        print(f"  ID: {row[0]}")
        print(f"  nnaNombre: {row[1]}")
        print(f"  NNASEXO: {row[2]}")

    # Intentar UPDATE directo
    result3 = conn.execute(text("SELECT ID FROM CASOS_SUSTRACION WHERE ROWNUM = 1"))
    first_id = result3.fetchone()[0]
    
    conn.execute(text(f"UPDATE CASOS_SUSTRACION SET NNASEXO = 'Mujer' WHERE ID = :id"), {'id': first_id})
    conn.commit()
    print("\n=== Después del UPDATE directo ===")
    
    result4 = conn.execute(text('SELECT ID, "nnaNombre", NNASEXO FROM CASOS_SUSTRACION WHERE ROWNUM = 1'))
    for row in result4:
        print(f"  NNASEXO: {row[2]}")
