"""
Crea el schema (usuario Oracle) PROYECTOS_LEY_DB y sus tablas.
Ejecutar una sola vez:  python crear_tablas_pl.py
Requiere conectarse como SYSTEM (o usuario con privilegios DBA).
No toca tablas ni schemas existentes.
"""

import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("✗ No se encontró DATABASE_URL en .env")
    input("\nPresiona Enter para cerrar...")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

PL_SCHEMA   = "PROYECTOS_LEY_DB"
PL_PASSWORD = "proyectos_ley_2026"   # contraseña para el nuevo usuario Oracle

print(f"Conectando a Oracle como SYSTEM...")
try:
    with engine.connect() as conn:
        banner = conn.execute(text("SELECT BANNER FROM V$VERSION WHERE ROWNUM=1")).fetchone()
        print(f"✓ Conectado: {banner[0]}\n")
except Exception as e:
    print(f"✗ Error de conexión: {e}")
    input("\nPresiona Enter para cerrar...")
    sys.exit(1)

# ── Paso 1: Crear el usuario/schema PROYECTOS_LEY_DB ─────────────────────────
print(f"Paso 1: Crear usuario Oracle '{PL_SCHEMA}'...")
with engine.connect() as conn:
    # Verificar si ya existe
    existe = conn.execute(
        text("SELECT COUNT(*) FROM dba_users WHERE username = :u"),
        {"u": PL_SCHEMA}
    ).scalar()

    if existe:
        print(f"  ℹ  El usuario '{PL_SCHEMA}' ya existe — se omite la creación.")
    else:
        conn.execute(text(
            f"CREATE USER {PL_SCHEMA} IDENTIFIED BY \"{PL_PASSWORD}\" "
            f"DEFAULT TABLESPACE USERS TEMPORARY TABLESPACE TEMP"
        ))
        conn.execute(text(f"GRANT CONNECT, RESOURCE TO {PL_SCHEMA}"))
        conn.execute(text(f"GRANT UNLIMITED TABLESPACE TO {PL_SCHEMA}"))
        conn.commit()
        print(f"  ✓  Usuario '{PL_SCHEMA}' creado y con permisos.")

# ── Paso 2: Crear las tablas en ese schema ────────────────────────────────────
print(f"\nPaso 2: Crear tablas en '{PL_SCHEMA}'...")

# Importar modelos DESPUÉS de que el schema existe
import models   # registra ProyectoLey, PlEvento, etc. con schema=PL_SCHEMA
from database import Base

try:
    Base.metadata.create_all(bind=engine)
    print("  ✓  Tablas creadas (o ya existían).")
except Exception as e:
    print(f"  ✗  Error al crear tablas: {e}")
    input("\nPresiona Enter para cerrar...")
    sys.exit(1)

# ── Paso 3: Verificar ─────────────────────────────────────────────────────────
print(f"\nPaso 3: Verificando tablas en '{PL_SCHEMA}'...")
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT table_name FROM all_tables "
        "WHERE owner = :schema "
        "ORDER BY table_name"
    ), {"schema": PL_SCHEMA}).fetchall()

if rows:
    print(f"\n  Tablas en {PL_SCHEMA} ({len(rows)}):")
    for row in rows:
        print(f"    ✓ {row[0]}")
else:
    print(f"  ⚠ No se encontraron tablas en '{PL_SCHEMA}'.")

print(f"\n✓ Listo. Schema '{PL_SCHEMA}' configurado correctamente.")
print(f"  Usuario Oracle: {PL_SCHEMA}")
print(f"  Contraseña:     {PL_PASSWORD}")
input("\nPresiona Enter para cerrar...")
