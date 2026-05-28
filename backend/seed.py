"""
Script de seed inicial — crea datos base equivalentes al seed.ts de Prisma.
Ejecutar una sola vez: python seed.py
"""

from database import SessionLocal, engine, Base
from models import Abogado, ComplejidadJuridica, ExtensionRango, Usuario
from auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Complejidades jurídicas ───────────────────────────────────────
complejidades = [
    {"nombre": "Baja",    "puntos": 1},
    {"nombre": "Media",   "puntos": 2},
    {"nombre": "Alta",    "puntos": 3},
    {"nombre": "Muy Alta","puntos": 4},
]
for c in complejidades:
    if not db.query(ComplejidadJuridica).filter_by(nombre=c["nombre"]).first():
        db.add(ComplejidadJuridica(**c))

# ── Rangos de extensión ───────────────────────────────────────────
rangos = [
    {"descripcion": "1 - 500",       "minFolios": 1,    "maxFolios": 500,  "puntos": 1},
    {"descripcion": "501 - 1000",    "minFolios": 501,  "maxFolios": 1000, "puntos": 2},
    {"descripcion": "1001 - 2000",   "minFolios": 1001, "maxFolios": 2000, "puntos": 3},
    {"descripcion": "Más de 2000",   "minFolios": 2001, "maxFolios": None, "puntos": 4},
]
for r in rangos:
    if not db.query(ExtensionRango).filter_by(descripcion=r["descripcion"]).first():
        db.add(ExtensionRango(**r))

# ── Usuario admin por defecto ─────────────────────────────────────
if not db.query(Usuario).filter_by(email="admin@dgnna.gob.pe").first():
    db.add(Usuario(
        nombre       = "Administrador",
        email        = "admin@dgnna.gob.pe",
        passwordHash = hash_password("Admin2026!"),
        rol          = "admin",
        activo       = True,
    ))

db.commit()
db.close()
print("✓ Seed completado.")
print("  Usuario admin: admin@dgnna.gob.pe / Admin2026!")
print("  ⚠  Cambia la contraseña después del primer login.")
