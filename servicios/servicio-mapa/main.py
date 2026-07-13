import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base, SessionLocal
from infrastructure.db import models  # noqa
from infrastructure.api.router import router

Base.metadata.create_all(bind=engine)

# Migraciones incrementales: agrega columnas nuevas si no existen
from sqlalchemy import text
_MIGRACIONES = [
    'ALTER TABLE mapa_instituciones ADD (ACREDITACION VARCHAR2(50))',
]
with engine.begin() as conn:
    for _sql in _MIGRACIONES:
        try:
            conn.execute(text(_sql))
        except Exception:
            pass  # columna ya existe (u otro dialecto en tests)

# Seed inicial (solo si las tablas están vacías)
from infrastructure.db.seed import ejecutar_seed
_db = SessionLocal()
try:
    ejecutar_seed(_db)
finally:
    _db.close()

app = FastAPI(
    title="Servicio Mapa Interactivo — DGNNA",
    description="Microservicio de cobertura territorial de instituciones (UPE, CAR, DEMUNA, etc.)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"servicio": "mapa", "version": "1.0.0", "estado": "activo"}


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "mapa"}
