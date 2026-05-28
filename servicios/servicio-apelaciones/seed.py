"""
Seed inicial — servicio-apelaciones
Crea complejidades jurídicas y rangos de extensión base en APELACIONES_DB.
Ejecutar una sola vez: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from infrastructure.db.database import SessionLocal, engine, Base
from infrastructure.db.models import ComplejidadModel, ExtensionRangoModel
import uuid

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def _id():
    return str(uuid.uuid4())


# ── Complejidades jurídicas ───────────────────────────────────────────────────
complejidades = [
    {"nombre": "Baja",     "puntos": 1},
    {"nombre": "Media",    "puntos": 2},
    {"nombre": "Alta",     "puntos": 3},
    {"nombre": "Muy Alta", "puntos": 4},
]
for c in complejidades:
    if not db.query(ComplejidadModel).filter_by(nombre=c["nombre"]).first():
        db.add(ComplejidadModel(id=_id(), nombre=c["nombre"], puntos=c["puntos"]))
        print(f"  ✓ Complejidad '{c['nombre']}' creada.")
    else:
        print(f"  · Complejidad '{c['nombre']}' ya existe.")

# ── Rangos de extensión ───────────────────────────────────────────────────────
rangos = [
    {"descripcion": "1 - 500",     "minFolios": 1,    "maxFolios": 500,  "puntos": 1},
    {"descripcion": "501 - 1000",  "minFolios": 501,  "maxFolios": 1000, "puntos": 2},
    {"descripcion": "1001 - 2000", "minFolios": 1001, "maxFolios": 2000, "puntos": 3},
    {"descripcion": "Más de 2000", "minFolios": 2001, "maxFolios": None, "puntos": 4},
]
for r in rangos:
    if not db.query(ExtensionRangoModel).filter_by(descripcion=r["descripcion"]).first():
        db.add(ExtensionRangoModel(
            id=_id(),
            descripcion=r["descripcion"],
            minFolios=r["minFolios"],
            maxFolios=r["maxFolios"],
            puntos=r["puntos"],
        ))
        print(f"  ✓ Rango '{r['descripcion']}' creado.")
    else:
        print(f"  · Rango '{r['descripcion']}' ya existe.")

db.commit()
db.close()
print()
print("✓ Seed completado — APELACIONES_DB lista.")
