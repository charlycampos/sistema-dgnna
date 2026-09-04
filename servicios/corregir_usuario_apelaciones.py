import oracledb

conn = oracledb.connect(
    user="AUDITORIA_DB",
    password="Auditoria2026",
    dsn="host.docker.internal:1521/XEPDB1"
)
cur = conn.cursor()

sql = """
UPDATE AUDITORIA_SISTEMA
SET usuarioNombre = 'Yasmina Cerna Ruiz',
    usuarioRol = 'Especialista Registradora',
    usuarioId = 'cmow35mat0000tne8on74peyz'
WHERE modulo = 'apelaciones'
"""
cur.execute(sql)
print("Filas actualizadas en apelaciones:", cur.rowcount)
conn.commit()

cur.execute("SELECT usuarioNombre, usuarioRol, count(*) FROM AUDITORIA_SISTEMA WHERE modulo = 'apelaciones' GROUP BY usuarioNombre, usuarioRol")
for r in cur.fetchall():
    print("Resultado:", r)

cur.close()
conn.close()
