"""
Migración: agrega tabla UsuarioModulo y migra usuarios existentes.
Ejecutar con el servidor DETENIDO:
  python migrar_modulos.py
"""
import sqlite3, os, shutil, random, string

DB_PATH = os.path.join(os.path.dirname(__file__), "prisma", "apelaciones.db")
DB_BAK  = DB_PATH + ".bak_pre_modulos"

def cuid_simple():
    chars = string.ascii_lowercase + string.digits
    return 'c' + ''.join(random.choices(chars, k=24))

print(f"BD: {DB_PATH}")
shutil.copy2(DB_PATH, DB_BAK)
print(f"Backup en: {DB_BAK}")

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

# 1. Crear tabla UsuarioModulo si no existe
cur.execute("""
CREATE TABLE IF NOT EXISTS "UsuarioModulo" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "usuarioId" TEXT NOT NULL,
  "modulo"    TEXT NOT NULL,
  "rolModulo" TEXT NOT NULL,
  CONSTRAINT "UsuarioModulo_usuarioId_modulo_key" UNIQUE ("usuarioId", "modulo"),
  CONSTRAINT "UsuarioModulo_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
)
""")
print("Tabla UsuarioModulo creada (o ya existía).")

# 2. Migrar usuarios con rol registrador/directora
cur.execute("SELECT id, rol FROM Usuario WHERE rol IN ('registrador','directora')")
usuarios = cur.fetchall()
print(f"Usuarios a migrar: {len(usuarios)}")

for uid, rol in usuarios:
    cur.execute(
        "SELECT id FROM UsuarioModulo WHERE usuarioId=? AND modulo='apelaciones'",
        (uid,)
    )
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO UsuarioModulo (id, usuarioId, modulo, rolModulo) VALUES (?,?,?,?)",
            (cuid_simple(), uid, 'apelaciones', rol)
        )
        print(f"  → Asignado módulo 'apelaciones' con rol '{rol}' al usuario {uid}")

# 3. Cambiar rol de registrador/directora → 'usuario'
cur.execute("UPDATE Usuario SET rol='usuario' WHERE rol IN ('registrador','directora')")
print(f"Usuarios actualizados a rol='usuario': {cur.rowcount}")

conn.commit()
conn.close()

# Verificar
conn2 = sqlite3.connect(DB_PATH)
c2 = conn2.cursor()
c2.execute("""
  SELECT u.nombre, u.rol, um.modulo, um.rolModulo
  FROM Usuario u
  LEFT JOIN UsuarioModulo um ON u.id = um.usuarioId
""")
print("\nEstado final:")
for row in c2.fetchall():
    print(f"  {row[0]:25s}  rol={row[1]:8s}  módulo={row[2] or '-':15s}  rolMódulo={row[3] or '-'}")
conn2.close()
print("\nMigración completada. Puedes reiniciar el servidor.")
