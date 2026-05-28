"""
Migración: extrae los valores únicos de procedencia de APELACIONES_DB.apelaciones
e inserta cada uno como entrada en la nueva tabla APELACIONES_DB.procedencias.
Ejecutar: python migrar_procedencias.py
"""
import oracledb
import uuid

APEL = dict(user="apelaciones_db", password="Apelaciones2026", dsn="localhost:1521/XEPDB1")


def main():
    con = oracledb.connect(**APEL)
    cur = con.cursor()

    # 1. Extraer valores únicos existentes en apelaciones.procedencia
    cur.execute("""
        SELECT DISTINCT procedencia FROM apelaciones
        WHERE procedencia IS NOT NULL
        ORDER BY procedencia
    """)
    valores = [row[0] for row in cur.fetchall()]
    print(f"Procedencias únicas encontradas: {len(valores)}")
    for v in valores:
        print(f"  · {v}")

    if not valores:
        print("Nada que migrar.")
        con.close()
        return

    # 2. Crear tabla si no existe
    cur.execute("""
        SELECT COUNT(*) FROM user_tables WHERE table_name = 'PROCEDENCIAS'
    """)
    if cur.fetchone()[0] == 0:
        print("\n[Creando tabla procedencias...]")
        cur.execute("""
            CREATE TABLE procedencias (
                id      VARCHAR2(36)  PRIMARY KEY,
                nombre  VARCHAR2(200) NOT NULL UNIQUE,
                activo  NUMBER(1)     DEFAULT 1 NOT NULL
            )
        """)
        con.commit()
        print("  ✓ Tabla procedencias creada")
    else:
        print("\n[Tabla procedencias ya existe]")

    # 3. Obtener las que ya existen en el catálogo (para no duplicar)
    cur.execute("SELECT UPPER(nombre) FROM procedencias")
    existentes = {r[0] for r in cur.fetchall()}

    # 3. Insertar las que faltan
    ok = skip = 0
    for nombre in valores:
        if nombre.upper() in existentes:
            print(f"  (ya existe) {nombre}")
            skip += 1
            continue
        try:
            cur.execute(
                "INSERT INTO procedencias (id, nombre, activo) VALUES (:1, :2, 1)",
                [str(uuid.uuid4()), nombre]
            )
            ok += 1
        except Exception as e:
            print(f"  ERROR insertando '{nombre}': {e}")

    con.commit()
    print(f"\n✓ Insertadas: {ok}  |  Ya existían: {skip}")

    # 4. Conteo final
    cur.execute("SELECT COUNT(*) FROM procedencias")
    print(f"  Total en catálogo: {cur.fetchone()[0]}")
    con.close()


if __name__ == "__main__":
    main()
