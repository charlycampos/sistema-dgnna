"""
Microservicio: auditoria-service (servicio-auditoria)
Puerto: 8009
Schema Oracle: AUDITORIA_DB
"""
import sys
import os
import json
from datetime import datetime, timedelta

# Permite imports absolutos desde la raíz del servicio
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base, SessionLocal
from infrastructure.db.models import AuditoriaLogModel
from infrastructure.api.router import router as router_auditoria

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Servicio de Auditoría y Trazabilidad — DGNNA",
    description="Microservicio dedicado para registrar y auditar cambios en los módulos del sistema.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_auditoria)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "auditoria-service",
        "port": int(os.getenv("PORT", 8009)),
        "timestamp": datetime.utcnow().isoformat()
    }


def limpiar_datos_demo():
    """Limpia cualquier dato de demostración para iniciar en blanco."""
    db = SessionLocal()
    try:
        db.query(AuditoriaLogModel).delete()
        db.commit()
        print("[auditoria-service] Tabla de auditoría limpia y lista para registros reales.")
    except Exception as e:
        db.rollback()
    finally:
        db.close()


limpiar_datos_demo()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8009))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

