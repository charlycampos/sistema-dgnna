"""
Microservicio: servicio-apelaciones
Puerto: 8002
Schema Oracle: APELACIONES_DB
"""
import sys
import os

# Permite imports absolutos desde la raíz del servicio
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # noqa: registra los modelos en Base

# Routers
from infrastructure.api.router            import router as router_apelaciones
from infrastructure.api.router_abogados   import router as router_abogados
from infrastructure.api.router_complejidad import router as router_complejidad
from infrastructure.api.router_extension  import router as router_extension
from infrastructure.api.router_dashboard  import router as router_dashboard
from infrastructure.api.router_reportes    import router as router_reportes
from infrastructure.api.router_procedencia import router as router_procedencia
from infrastructure.api.router_revisores   import router as router_revisores

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# ── Seed de revisores iniciales ───────────────────────────────────
def run_migrations():
    """Agrega columnas nuevas a tablas existentes (Oracle no las crea con create_all)."""
    from sqlalchemy import text
    import traceback
    migraciones = [
        "ALTER TABLE apelaciones ADD (revisorid VARCHAR2(36))",
    ]
    with engine.connect() as conn:
        for sql in migraciones:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"[migration] OK: {sql}")
            except Exception as e:
                err = str(e)
                if "01430" in err or "already exists" in err.lower() or "00955" in err:
                    print(f"[migration] ya existe, omitido.")
                else:
                    print(f"[migration] ERROR: {e}")

run_migrations()


def seed_revisores():
    """Inserta revisores iniciales si la tabla está vacía."""
    import traceback
    from sqlalchemy import text
    revisores_iniciales = ["Luis Monteaguado", "Norma Sánchez"]
    try:
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM revisores")).scalar()
            if count == 0:
                for nombre in revisores_iniciales:
                    conn.execute(
                        text("INSERT INTO revisores (id, nombre, activo) VALUES (sys_guid(), :nombre, 1)"),
                        {"nombre": nombre}
                    )
                conn.commit()
                print(f"[seed] Revisores iniciales insertados: {revisores_iniciales}")
    except Exception as e:
        print(f"[seed] No se pudo insertar revisores iniciales: {e}")

seed_revisores()

app = FastAPI(
    title="Servicio Apelaciones — DGNNA",
    description="Microservicio de gestión de apelaciones (Arquitectura Hexagonal)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_apelaciones)
app.include_router(router_abogados)
app.include_router(router_complejidad)
app.include_router(router_extension)
app.include_router(router_dashboard)
app.include_router(router_reportes)
app.include_router(router_procedencia)
app.include_router(router_revisores)


@app.get("/")
def root():
    return {"servicio": "apelaciones", "version": "2.0.0", "estado": "activo"}


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "apelaciones"}
