import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # noqa
from infrastructure.api.router import router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Servicio Tableros de Direcciones de Línea — DGNNA",
    description="Microservicio de métricas y tableros analíticos (DSLD, DPNNA, DPE, DA) — Arquitectura Hexagonal",
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
    return {"servicio": "tableros-direcciones", "version": "1.0.0", "estado": "activo"}

@app.get("/health")
def health():
    return {"status": "ok", "servicio": "tableros-direcciones"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8012, reload=True)
