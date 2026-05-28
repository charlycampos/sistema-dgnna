"""
Prueba de conexion a Oracle XE local.
Ejecutar: python test_oracle.py
"""
import sys

# 1. Verificar que oracledb esta instalado
try:
    import oracledb
    print("OK  oracledb version:", oracledb.__version__)
except ImportError:
    print("ERROR: oracledb no esta instalado.")
    print("       Instala con:  pip install oracledb")
    sys.exit(1)

# ── Datos de conexion ── edita si es necesario ──────────────────────
HOST     = "localhost"
PORT     = 1521
SERVICE  = "XEPDB1"   # prueba tambien con "XE" si falla
USUARIO  = "system"
CLAVE    = input("Contrasena de Oracle (usuario system): ").strip()
# ────────────────────────────────────────────────────────────────────

# 2. Intentar conexion
print(f"\nConectando a {USUARIO}@{HOST}:{PORT}/{SERVICE} ...")
try:
    con = oracledb.connect(
        user=USUARIO,
        password=CLAVE,
        dsn=f"{HOST}:{PORT}/{SERVICE}"
    )
    print("OK  Conexion exitosa!")

    cur = con.cursor()
    cur.execute("SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1")
    row = cur.fetchone()
    print("    Version Oracle:", row[0])

    cur.execute("SELECT SYS_CONTEXT('USERENV','SERVICE_NAME') FROM DUAL")
    svc = cur.fetchone()
    print("    Service name:  ", svc[0])

    cur.close()
    con.close()
    print("\nTodo listo. Puedes usar Oracle con el backend FastAPI.")
    print(f"DATABASE_URL=oracle+oracledb://{USUARIO}:<clave>@{HOST}:{PORT}/?service_name={SERVICE}")

except oracledb.DatabaseError as e:
    err, = e.args
    print(f"\nERROR al conectar: {err.message}")
    print()
    if "ORA-12541" in str(err.message):
        print("  -> Oracle no esta escuchando en el puerto 1521.")
        print("     Verifica que el servicio 'OracleServiceXE' este iniciado.")
        print("     Panel de control -> Servicios -> OracleServiceXE -> Iniciar")
    elif "ORA-12514" in str(err.message):
        print("  -> Service name incorrecto.")
        print("     Prueba cambiar SERVICE = 'XE' en este script.")
    elif "ORA-01017" in str(err.message):
        print("  -> Contrasena incorrecta para el usuario system.")
    else:
        print("  -> Revisa que Oracle XE este instalado y el servicio activo.")
