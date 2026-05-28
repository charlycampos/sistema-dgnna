"""
Resetea la contrasena del usuario admin y muestra todos los usuarios en la BD.
Ejecutar: python reset_admin.py
"""
import sqlite3
from pathlib import Path
import bcrypt

BD = Path(__file__).parent / "apelaciones.db"

if not BD.exists():
    print("ERROR: No se encontro apelaciones.db en:", BD)
    exit(1)

con = sqlite3.connect(str(BD))
con.row_factory = sqlite3.Row

# Mostrar usuarios existentes
print("=== Usuarios en la BD ===")
rows = con.execute("SELECT id, nombre, email, rol, activo FROM usuarios").fetchall()
if not rows:
    print("  (ninguno)")
else:
    for r in rows:
        print(f"  [{r['rol']}] {r['email']} — {r['nombre']} — activo={r['activo']}")

print()

# Resetear contrasena del admin
NUEVA_CONTRASENA = "123456"
nuevo_hash = bcrypt.hashpw(NUEVA_CONTRASENA.encode(), bcrypt.gensalt()).decode()

# Buscar admin por rol
admin = con.execute("SELECT id, email FROM usuarios WHERE rol='admin' LIMIT 1").fetchone()

if admin:
    con.execute(
        "UPDATE usuarios SET passwordHash=? WHERE id=?",
        (nuevo_hash, admin["id"])
    )
    con.commit()
    print(f"OK  Contrasena reseteada para: {admin['email']}")
    print(f"    Nueva contrasena: {NUEVA_CONTRASENA}")
else:
    # Insertar admin si no existe
    import uuid
    from datetime import datetime
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    nuevo_id = str(uuid.uuid4())
    con.execute(
        "INSERT INTO usuarios (id,nombre,email,passwordHash,rol,activo,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)",
        (nuevo_id, "Administrador", "admin@dgnna.gob.pe", nuevo_hash, "admin", 1, now, now)
    )
    con.commit()
    print("OK  Usuario admin creado:")
    print("    Email:      admin@dgnna.gob.pe")
    print(f"    Contrasena: {NUEVA_CONTRASENA}")

con.close()
print()
print("Ahora inicia sesion con la contrasena mostrada arriba.")
