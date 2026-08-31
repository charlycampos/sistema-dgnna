"""
Microservicio: normativa-service (servicio-normativa)
Puerto: 8011
Schema Oracle: NORMATIVA_DB / SQLite fallback
"""
import sys
import os
from datetime import datetime

# Permite imports absolutos desde la raíz del servicio
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.db.database import engine, Base
from infrastructure.db.seed_normativa import seed_corpus_inicial
from infrastructure.api.router import router as router_normativa

# Crear tablas y sembrar corpus inicial (DL 1297 + Reglamento)
Base.metadata.create_all(bind=engine)
try:
    seed_corpus_inicial()
except Exception as e:
    print(f"[normativa-service] Aviso al sembrar corpus inicial: {e}")

app = FastAPI(
    title="Servicio de Consulta Normativa y RAG — DGNNA",
    description="Microservicio de búsqueda determinista y asistente Multi-LLM (ChatGPT, Gemini, Claude) anclado al marco normativo de protección de NNA.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_normativa, prefix="/api/normativa")
app.include_router(router_normativa)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "normativa-service",
        "port": int(os.getenv("PORT", 8011)),
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8011))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
