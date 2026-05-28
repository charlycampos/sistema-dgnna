import sqlite3, sys
from pathlib import Path
from datetime import datetime, timezone

BD_ANTIGUA = Path(__file__).parent.parent / "prisma" / "apelaciones.db"
BD_NUEVA = Path(__file__).parent / "apelaciones.db"

if not BD_ANTIGUA.exists():
    print("ERROR: No se encontro la BD antigua en:", BD_ANTIGUA)
    sys.exit(1)

def ts(v):
    if v is None: return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    return str(v)

src = sqlite3.connect(str(BD_ANTIGUA))
dst = sqlite3.connect(str(BD_NUEVA))
src.row_factory = sqlite3.Row

for t in ["apelaciones","usuario_modulos","usuarios","abogados","complejidades_juridicas","extension_rangos"]:
    dst.execute("DELETE FROM " + t)
dst.commit()
print("Tablas limpiadas")

rows = src.execute('SELECT id,nombre,activo,createdAt,updatedAt FROM "Abogado"').fetchall()
for r in rows:
    dst.execute("INSERT OR IGNORE INTO abogados VALUES (?,?,?,?,?)", (r["id"],r["nombre"],r["activo"],ts(r["createdAt"]),ts(r["updatedAt"])))
dst.commit()
print(len(rows), "abogados migrados")

rows = src.execute('SELECT id,nombre,puntos,activo FROM "ComplejidadJuridica"').fetchall()
for r in rows:
    dst.execute("INSERT OR IGNORE INTO complejidades_juridicas VALUES (?,?,?,?)", (r["id"],r["nombre"],r["puntos"],r["activo"]))
dst.commit()
print(len(rows), "complejidades migradas")

rows = src.execute('SELECT id,descripcion,minFolios,maxFolios,puntos,activo FROM "ExtensionRango"').fetchall()
for r in rows:
    dst.execute("INSERT OR IGNORE INTO extension_rangos VALUES (?,?,?,?,?,?)", (r["id"],r["descripcion"],r["minFolios"],r["maxFolios"],r["puntos"],r["activo"]))
dst.commit()
print(len(rows), "rangos migrados")

cols = "id,numeroExpediente,fechaIngreso,fechaIngresoMIMP,plazoVencimiento,apelante,nnaCar,procedencia,documento,asunto,folios,puntosExtension,complejidadId,puntosComplejidad,puntosTotal,abogadoId,fechaAsignacion,estado,numeroResolucion,documentoAtencion,cargos,observaciones,createdAt,updatedAt"
rows = src.execute('SELECT ' + cols + ' FROM "Apelacion"').fetchall()
ph = ",".join(["?"]*24)
for r in rows:
    dst.execute("INSERT OR IGNORE INTO apelaciones VALUES (" + ph + ")", (
        r["id"],r["numeroExpediente"],ts(r["fechaIngreso"]),ts(r["fechaIngresoMIMP"]),
        ts(r["plazoVencimiento"]),r["apelante"],r["nnaCar"],r["procedencia"],
        r["documento"],r["asunto"],r["folios"],r["puntosExtension"],
        r["complejidadId"],r["puntosComplejidad"],r["puntosTotal"],r["abogadoId"],
        ts(r["fechaAsignacion"]),r["estado"],r["numeroResolucion"],
        r["documentoAtencion"],r["cargos"],r["observaciones"],
        ts(r["createdAt"]),ts(r["updatedAt"])))
dst.commit()
print(len(rows), "apelaciones migradas")

rows = src.execute('SELECT id,nombre,email,passwordHash,rol,activo,createdAt,updatedAt FROM "Usuario"').fetchall()
for r in rows:
    dst.execute("INSERT OR IGNORE INTO usuarios VALUES (?,?,?,?,?,?,?,?)", (r["id"],r["nombre"],r["email"],r["passwordHash"],r["rol"],r["activo"],ts(r["createdAt"]),ts(r["updatedAt"])))
dst.commit()
print(len(rows), "usuarios migrados")

rows = src.execute('SELECT id,usuarioId,modulo,rolModulo FROM "UsuarioModulo"').fetchall()
for r in rows:
    dst.execute("INSERT OR IGNORE INTO usuario_modulos VALUES (?,?,?,?)", (r["id"],r["usuarioId"],r["modulo"],r["rolModulo"]))
dst.commit()
print(len(rows), "modulos migrados")

src.close()
dst.close()

con = sqlite3.connect(str(BD_NUEVA))
print()
for t in ["abogados","complejidades_juridicas","extension_rangos","apelaciones","usuarios"]:
    n = con.execute("SELECT COUNT(*) FROM " + t).fetchone()[0]
    print(t + ":", n)
s = con.execute("SELECT fechaIngreso FROM apelaciones LIMIT 1").fetchone()
if s: print("fecha muestra:", s[0])
con.close()
print("Migracion OK - reinicia uvicorn")
