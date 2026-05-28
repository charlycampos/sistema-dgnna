"""
Debug del UPDATE fallido en Oracle para campo NNASEXO
"""
import os, sys
sys.path.insert(0, '.')
os.environ.setdefault('DATABASE_URL', 'oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1')

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Ver todos los registros y sus NNASEXO
    print("=== Estado actual de NNASEXO en todos los registros ===")
    result = conn.execute(text('SELECT ID, "nnaNombre", NNASEXO FROM CASOS_SUSTRACION'))
    rows = result.fetchall()
    for row in rows:
        print(f"  {row[0][:8]}... | {str(row[1])[:30]:30s} | NNASEXO={row[2]!r}")
    
    # Tomar el primer ID
    if rows:
        first_id = rows[0][0]
        print(f"\n=== Intentando UPDATE en ID={first_id[:8]}... ===")
        
        # UPDATE y ver cuántas filas afectadas
        r = conn.execute(
            text("UPDATE CASOS_SUSTRACION SET NNASEXO = 'Mujer' WHERE ID = :id"),
            {'id': first_id}
        )
        print(f"Filas afectadas por UPDATE: {r.rowcount}")
        conn.commit()
        print("Commit ejecutado.")
        
        # Verificar
        r2 = conn.execute(
            text("SELECT NNASEXO FROM CASOS_SUSTRACION WHERE ID = :id"),
            {'id': first_id}
        )
        nuevo = r2.fetchone()
        print(f"Valor después del commit: {nuevo[0]!r}")

print("\n=== Probando con SQLAlchemy ORM ===")
from models import CasoSustracion
from sqlalchemy.orm import Session

with Session(engine) as session:
    caso = session.query(CasoSustracion).first()
    print(f"ORM nnaSexo antes: {caso.nnaSexo!r}")
    caso.nnaSexo = 'Mujer'
    session.commit()
    session.refresh(caso)
    print(f"ORM nnaSexo después de commit+refresh: {caso.nnaSexo!r}")
