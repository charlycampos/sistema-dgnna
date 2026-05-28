"""
Debug ORM - ver exactamente qué devuelve Oracle por columna
"""
import os, sys
sys.path.insert(0, '.')

from models import CasoSustracion
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine

print("=== Valores ORM para todos los casos ===")
with Session(engine) as session:
    casos = session.query(CasoSustracion).all()
    for c in casos:
        print(f"  {c.id[:8]}... {c.nnaNombre[:20]:20s} | nnaSexo={c.nnaSexo!r} | nnaEdad={c.nnaEdad!r}")

print("\n=== Raw SQL de Isabella ===")
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT ID, "nnaNombre", NNASEXO, NNAEDAD, NNATIPOEDAD
        FROM CASOS_SUSTRACION
        WHERE "nnaNombre" LIKE '%Isabella%'
    """))
    for row in result:
        print(f"  NNASEXO={row[2]!r}  NNAEDAD={row[3]!r}  NNATIPOEDAD={row[4]!r}")

print("\n=== Raw SQL completo fila Isabella ===")
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT * FROM CASOS_SUSTRACION WHERE "nnaNombre" LIKE '%Isabella%'
    """))
    cols = result.keys()
    row = result.fetchone()
    if row:
        for col, val in zip(cols, row):
            if val is not None:
                print(f"  {col}: {val!r}")
