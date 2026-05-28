"""
Seed inicial — servicio-auth
Crea el usuario administrador por defecto en AUTH_DB.
Ejecutar una sola vez: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from infrastructure.db.database import SessionLocal, engine, Base
from infrastructure.db.models import UsuarioModel
import uuid
import bcrypt

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# ── Usuario admin ─────────────────────────────────────────────────
admin_email = "admin@dgnna.gob.pe"
existe = db.query(UsuarioModel).filter_by(email=admin_email).first()

if not existe:
    db.add(UsuarioModel(
        id           = str(uuid.uuid4()),
        nombre       = "Administrador",
        email        = admin_email,
        passwordHash = hash_password("Admin2026!"),
        rol          = "admin",
        activo       = True,
    ))
    db.commit()
    print("✓ Usuario admin creado.")
else:
    print("ℹ  El usuario admin ya existe, omitido.")

db.close()
print()
print("  Email:      admin@dgnna.gob.pe")
print("  Contraseña: Admin2026!")
print("  ⚠  Cambia la contraseña después del primer login.")
