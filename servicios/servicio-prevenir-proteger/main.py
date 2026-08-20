import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from infrastructure.api.router import router
from infrastructure.db import models  # noqa: F401
from infrastructure.db.database import Base, engine


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Servicio Prevenir para Proteger - DGNNA",
    description="Registro y seguimiento de actividades preventivas y su cobertura.",
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
    return {"servicio": "prevenir-proteger", "version": "1.0.0", "estado": "activo"}


@app.get("/health")
def health():
    return {"status": "ok", "servicio": "prevenir-proteger"}
