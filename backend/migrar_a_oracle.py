"""
Migra todos los datos del SQLite antiguo (Prisma) a Oracle XE.
Ejecutar: python migrar_a_oracle.py

Lee de:   ../prisma/apelaciones.db  (SQLite con datos Prisma)
Escribe en: Oracle via DATABASE_URL del .env
"""
import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timezone

# ── Configurar entorno ──────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    print("ERROR: DATABASE_URL en .env debe apuntar a Oracle.")
    print("       Verifica que el .env tenga la URL de Oracle.")
    sys.exit(1)

print("Conectando a Oracle...")
engine = create_engine(DATABASE_URL)
try:
    with engine.connect() as con:
        row = con.execute(text("SELECT BANNER FROM V$VERSION WHERE ROWNUM=1")).fetchone()
        print("OK  Oracle:", row[0])
except Exception as e:
    print("ERROR al conectar a Oracle:", e)
    sys.exit(1)

Session = sessionmaker(bind=engine)

# ── BD antigua ─────────────────────────────────────────────────────
BD_ANTIGUA = Path(__file__).parent.parent / "prisma" / "apelaciones.db"
if not BD_ANTIGUA.exists():
    # Intentar tambien con apelaciones.db del mismo backend (SQLite nuevo)
    BD_ANTIGUA = Path(__file__).parent / "apelaciones.db"
    if not BD_ANTIGUA.exists():
        print("ERROR: No se encontro la BD SQLite en:", BD_ANTIGUA)
        sys.exit(1)

print("Leyendo desde:", BD_ANTIGUA)
src = sqlite3.connect(str(BD_ANTIGUA))
src.row_factory = sqlite3.Row


def ts(v):
    """Convierte timestamp de Prisma (milisegundos) o string a datetime."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v / 1000, tz=timezone.utc).replace(tzinfo=None)
    if isinstance(v, str):
        # Ya es string ISO o similar
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            return None
    return None


# ── Detectar si la BD fuente usa nombres Prisma o nuevos ────────────
tablas_src = [r[0] for r in src.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()]

usa_prisma = "Abogado" in tablas_src  # nombres Prisma con mayuscula
print("Formato fuente:", "Prisma (mayusculas)" if usa_prisma else "FastAPI (minusculas)")
print()

# ── Limpiar tablas Oracle en orden (respeta FK) ─────────────────────
print("Limpiando tablas Oracle...")
with engine.begin() as con:
    con.execute(text("DELETE FROM apelaciones"))
    con.execute(text("DELETE FROM usuario_modulos"))
    con.execute(text("DELETE FROM usuarios"))
    con.execute(text("DELETE FROM abogados"))
    con.execute(text("DELETE FROM complejidades_juridicas"))
    con.execute(text("DELETE FROM extension_rangos"))
print("OK  Tablas limpiadas")
print()

db = Session()

# ── 1. Abogados ─────────────────────────────────────────────────────
if usa_prisma:
    rows = src.execute('SELECT id,nombre,activo,createdAt,updatedAt FROM "Abogado"').fetchall()
else:
    rows = src.execute('SELECT id,nombre,activo,createdAt,updatedAt FROM abogados').fetchall()

from models import Abogado, ComplejidadJuridica, ExtensionRango, Apelacion, Usuario, UsuarioModulo
from auth import hash_password

for r in rows:
    db.merge(Abogado(
        id=r["id"],
        nombre=r["nombre"],
        activo=bool(r["activo"]),
        createdAt=ts(r["createdAt"]),
        updatedAt=ts(r["updatedAt"]),
    ))
db.commit()
print(f"OK  {len(rows)} abogados migrados")

# ── 2. Complejidades ────────────────────────────────────────────────
if usa_prisma:
    rows = src.execute('SELECT id,nombre,puntos,activo FROM "ComplejidadJuridica"').fetchall()
else:
    rows = src.execute('SELECT id,nombre,puntos,activo FROM complejidades_juridicas').fetchall()

for r in rows:
    db.merge(ComplejidadJuridica(
        id=r["id"],
        nombre=r["nombre"],
        puntos=r["puntos"],
        activo=bool(r["activo"]),
    ))
db.commit()
print(f"OK  {len(rows)} complejidades migradas")

# ── 3. Rangos de extension ──────────────────────────────────────────
if usa_prisma:
    rows = src.execute('SELECT id,descripcion,minFolios,maxFolios,puntos,activo FROM "ExtensionRango"').fetchall()
else:
    rows = src.execute('SELECT id,descripcion,minFolios,maxFolios,puntos,activo FROM extension_rangos').fetchall()

for r in rows:
    db.merge(ExtensionRango(
        id=r["id"],
        descripcion=r["descripcion"],
        minFolios=r["minFolios"],
        maxFolios=r["maxFolios"],
        puntos=r["puntos"],
        activo=bool(r["activo"]),
    ))
db.commit()
print(f"OK  {len(rows)} rangos migrados")

# ── 4. Apelaciones ──────────────────────────────────────────────────
if usa_prisma:
    cols = "id,numeroExpediente,fechaIngreso,fechaIngresoMIMP,plazoVencimiento,apelante,nnaCar,procedencia,documento,asunto,folios,puntosExtension,complejidadId,puntosComplejidad,puntosTotal,abogadoId,fechaAsignacion,estado,numeroResolucion,documentoAtencion,cargos,observaciones,createdAt,updatedAt"
    rows = src.execute(f'SELECT {cols} FROM "Apelacion"').fetchall()
else:
    cols = "id,numeroExpediente,fechaIngreso,fechaIngresoMIMP,plazoVencimiento,apelante,nnaCar,procedencia,documento,asunto,folios,puntosExtension,complejidadId,puntosComplejidad,puntosTotal,abogadoId,fechaAsignacion,estado,numeroResolucion,documentoAtencion,cargos,observaciones,createdAt,updatedAt"
    rows = src.execute(f'SELECT {cols} FROM apelaciones').fetchall()

errores = 0
for r in rows:
    try:
        db.merge(Apelacion(
            id=r["id"],
            numeroExpediente=r["numeroExpediente"],
            fechaIngreso=ts(r["fechaIngreso"]),
            fechaIngresoMIMP=ts(r["fechaIngresoMIMP"]),
            plazoVencimiento=ts(r["plazoVencimiento"]),
            apelante=r["apelante"],
            nnaCar=r["nnaCar"],
            procedencia=r["procedencia"],
            documento=r["documento"],
            asunto=r["asunto"],
            folios=r["folios"],
            puntosExtension=r["puntosExtension"],
            complejidadId=r["complejidadId"],
            puntosComplejidad=r["puntosComplejidad"],
            puntosTotal=r["puntosTotal"],
            abogadoId=r["abogadoId"],
            fechaAsignacion=ts(r["fechaAsignacion"]),
            estado=r["estado"],
            numeroResolucion=r["numeroResolucion"],
            documentoAtencion=r["documentoAtencion"],
            cargos=r["cargos"],
            observaciones=r["observaciones"],
            createdAt=ts(r["createdAt"]),
            updatedAt=ts(r["updatedAt"]),
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        errores += 1
        print(f"  SKIP apelacion {r['id']}: {e}")

print(f"OK  {len(rows) - errores} apelaciones migradas ({errores} omitidas por error)")

# ── 5. Usuarios ─────────────────────────────────────────────────────
if usa_prisma:
    rows = src.execute('SELECT id,nombre,email,passwordHash,rol,activo,createdAt,updatedAt FROM "Usuario"').fetchall()
else:
    rows = src.execute('SELECT id,nombre,email,passwordHash,rol,activo,createdAt,updatedAt FROM usuarios').fetchall()

for r in rows:
    db.merge(Usuario(
        id=r["id"],
        nombre=r["nombre"],
        email=r["email"],
        passwordHash=r["passwordHash"],
        rol=r["rol"],
        activo=bool(r["activo"]),
        createdAt=ts(r["createdAt"]),
        updatedAt=ts(r["updatedAt"]),
    ))
db.commit()
print(f"OK  {len(rows)} usuarios migrados")

# Resetear contrasena del admin con hash Python (por si venia de bcryptjs)
admin = db.query(Usuario).filter(Usuario.rol == "admin").first()
if admin:
    admin.passwordHash = hash_password("Admin2026!")
    db.commit()
    print(f"    Contrasena de {admin.email} reseteada a: Admin2026!")

# ── 6. Modulos de usuario ───────────────────────────────────────────
try:
    if usa_prisma:
        rows = src.execute('SELECT id,usuarioId,modulo,rolModulo FROM "UsuarioModulo"').fetchall()
    else:
        rows = src.execute('SELECT id,usuarioId,modulo,rolModulo FROM usuario_modulos').fetchall()

    for r in rows:
        db.merge(UsuarioModulo(
            id=r["id"],
            usuarioId=r["usuarioId"],
            modulo=r["modulo"],
            rolModulo=r["rolModulo"],
        ))
    db.commit()
    print(f"OK  {len(rows)} modulos de usuario migrados")
except Exception as e:
    db.rollback()
    print(f"    Modulos omitidos: {e}")

db.close()
src.close()

# ── Verificar conteos finales ────────────────────────────────────────
print()
print("=== Conteos finales en Oracle ===")
with engine.connect() as con:
    for tabla in ["abogados", "complejidades_juridicas", "extension_rangos", "apelaciones", "usuarios"]:
        n = con.execute(text(f"SELECT COUNT(*) FROM {tabla}")).scalar()
        print(f"  {tabla}: {n}")

print()
print("Migracion completada. Reinicia uvicorn.")
print("Login: admin@dgnna.gob.pe / Admin2026!")
