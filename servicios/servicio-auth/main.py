"""
Microservicio: servicio-auth
Puerto: 8001
Schema Oracle: AUTH_DB
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # noqa
from infrastructure.api.router_auth import router as auth_router
from infrastructure.api.router_usuarios import router as usuarios_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Servicio Auth — DGNNA",
    description="Microservicio de autenticación y usuarios (Arquitectura Hexagonal)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(usuarios_router)


@app.get("/")
def root():
    return {"servicio": "auth", "version": "2.0.0", "estado": "activo"}

@app.get("/health")
def health():
    return {"status": "ok", "servicio": "auth"}
