import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # registra modelos en metadata
from infrastructure.api.router import router
from infrastructure.api.router_dsld import router as router_dsld
from infrastructure.api.router_car import router as router_car
from infrastructure.api.router_adopciones import router as router_adopciones
from infrastructure.api.router_upe import router as router_upe

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Servicio Gestión de Datos — DGNNA",
    description="Microservicio de catálogo de datasets y suite analítica DSLD/CAR/DA/DPE",
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
app.include_router(router_dsld)
app.include_router(router_car)
app.include_router(router_adopciones)
app.include_router(router_upe)


@app.get("/")
def root():
    return {"servicio": "gestion-datos", "version": "1.0.0", "estado": "activo"}


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "gestion-datos"}
