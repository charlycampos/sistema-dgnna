import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # noqa
from infrastructure.api.router import router

Base.metadata.create_all(bind=engine)

# Migraciones incrementales: agrega columnas nuevas si no existen
_MIGRACIONES = [
    'ALTER TABLE poi_datos ADD (CATEGORIA VARCHAR2(500))',
    'ALTER TABLE poi_datos ADD ("actPresup" VARCHAR2(500))',
    'ALTER TABLE poi_datos ADD ("fnReTotal" NUMBER)',
]
with engine.begin() as conn:
    for sql in _MIGRACIONES:
        try:
            conn.execute(text(sql))
        except Exception:
            pass  # columna ya existe

app = FastAPI(
    title="Servicio POI - PP117 — DGNNA",
    description="Microservicio de carga y seguimiento del POI y Programa Presupuestal 0117",
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
    return {"servicio": "poi-pp117", "version": "1.0.0", "estado": "activo"}


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "poi-pp117"}
