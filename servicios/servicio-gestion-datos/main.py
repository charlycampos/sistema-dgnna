import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # registra modelos en metadata
from infrastructure.api.router import router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Servicio Gestión de Datos — DGNNA",
    description="Microservicio de catálogo de datasets y diccionario de variables",
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
    return {"servicio": "gestion-datos", "version": "1.0.0", "estado": "activo"}


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "gestion-datos"}
