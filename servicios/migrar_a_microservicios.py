"""
Migración de datos: SYSTEM schema → schemas de microservicios
─────────────────────────────────────────────────────────────
Lee de:   Oracle SYSTEM (backend monolítico, columnas camelCase con comillas)
Escribe en:
  AUTH_DB        → usuarios, usuario_modulos
  APELACIONES_DB → abogados, complejidades_juridicas, extension_rangos, apelaciones
  SUSTRACION_DB  → casos_sustracion, bitacora_sustracion, historial_judicial
  SALA_DB        → reservas_sala

Nota: En SYSTEM las columnas camelCase fueron creadas SIN alias explícito
por SQLAlchemy, así que Oracle las almacenó entre comillas ("createdAt", etc.).
Las consultas SOURCE usan comillas dobles para respetar ese case.
En los schemas destino las columnas son todas minúsculas (sin comillas).

Ejecutar desde la carpeta 'servicios':
  python migrar_a_microservicios.py
"""

import oracledb

# ── Conexiones ────────────────────────────────────────────────────────────────

SRC  = dict(user="system",         password="123456",          dsn="localhost:1521/XEPDB1")
AUTH = dict(user="auth_db",        password="Auth2026",        dsn="localhost:1521/XEPDB1")
APEL = dict(user="apelaciones_db", password="Apelaciones2026", dsn="localhost:1521/XEPDB1")
SUST = dict(user="sustracion_db",  password="Sustracion2026",  dsn="localhost:1521/XEPDB1")
SALA = dict(user="sala_db",        password="Sala2026",        dsn="localhost:1521/XEPDB1")


def conectar(params):
    return oracledb.connect(**params)


def insertar(cur, tabla, cols, valores):
    ph = ", ".join([f":{i+1}" for i in range(len(cols))])
    sql = f"INSERT INTO {tabla} ({', '.join(cols)}) VALUES ({ph})"
    ok = err = 0
    for fila in valores:
        try:
            cur.execute(sql, fila)
            ok += 1
        except Exception as e:
            err += 1
            if err <= 3:
                print(f"    SKIP: {e}")
    return ok, err


def tabla_existe(cur, nombre):
    cur.execute(
        "SELECT COUNT(*) FROM user_tables WHERE table_name = :1",
        [nombre.upper()]
    )
    return cur.fetchone()[0] > 0


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Migración SYSTEM → Microservicios")
    print("=" * 60)

    src_con  = conectar(SRC)
    auth_con = conectar(AUTH)
    apel_con = conectar(APEL)
    sust_con = conectar(SUST)
    sala_con = conectar(SALA)

    src  = src_con.cursor()
    auth = auth_con.cursor()
    apel = apel_con.cursor()
    sust = sust_con.cursor()
    sala = sala_con.cursor()

    # ─── AUTH_DB ──────────────────────────────────────────────────────────────
    print("\n[AUTH_DB]")
    auth.execute("DELETE FROM usuario_modulos")
    auth.execute("DELETE FROM usuarios")
    auth_con.commit()

    # SYSTEM guarda "passwordHash","createdAt","updatedAt" con comillas (case-sensitive)
    src.execute("""
        SELECT id, nombre, email,
               "passwordHash"  AS ph,
               rol, activo,
               "createdAt"     AS cat,
               "updatedAt"     AS uat
        FROM usuarios
    """)
    rows = src.fetchall()
    ok, err = insertar(auth,
        "usuarios",
        ["id","nombre","email","passwordhash","rol","activo","createdat","updatedat"],
        [list(r) for r in rows]
    )
    auth_con.commit()
    print(f"  usuarios:        {ok} migrados, {err} omitidos")

    # "usuarioId","rolModulo" con comillas
    src.execute("""
        SELECT id,
               "usuarioId"  AS usr_id,
               modulo,
               "rolModulo"  AS rol_mod
        FROM usuario_modulos
    """)
    rows = src.fetchall()
    ok, err = insertar(auth,
        "usuario_modulos",
        ["id","usuarioid","modulo","rolmodulo"],
        [list(r) for r in rows]
    )
    auth_con.commit()
    print(f"  usuario_modulos: {ok} migrados, {err} omitidos")

    # ─── APELACIONES_DB ───────────────────────────────────────────────────────
    print("\n[APELACIONES_DB]")
    apel.execute("DELETE FROM apelaciones")
    apel.execute("DELETE FROM abogados")
    apel.execute("DELETE FROM complejidades_juridicas")
    apel.execute("DELETE FROM extension_rangos")
    apel_con.commit()

    # Abogados — "createdAt","updatedAt" con comillas
    src.execute("""
        SELECT id, nombre, activo,
               "createdAt" AS cat,
               "updatedAt" AS uat
        FROM abogados
    """)
    rows = src.fetchall()
    ok, err = insertar(apel,
        "abogados",
        ["id","nombre","activo","createdat","updatedat"],
        [list(r) for r in rows]
    )
    apel_con.commit()
    print(f"  abogados:                {ok} migrados, {err} omitidos")

    # Complejidades — sin camelCase
    src.execute("SELECT id, nombre, puntos, activo FROM complejidades_juridicas")
    rows = src.fetchall()
    ok, err = insertar(apel,
        "complejidades_juridicas",
        ["id","nombre","puntos","activo"],
        [list(r) for r in rows]
    )
    apel_con.commit()
    print(f"  complejidades_juridicas: {ok} migrados, {err} omitidos")

    # Extension rangos — "minFolios","maxFolios" con comillas
    src.execute("""
        SELECT id, descripcion,
               "minFolios" AS mnf,
               "maxFolios" AS mxf,
               puntos, activo
        FROM extension_rangos
    """)
    rows = src.fetchall()
    ok, err = insertar(apel,
        "extension_rangos",
        ["id","descripcion","minfolios","maxfolios","puntos","activo"],
        [list(r) for r in rows]
    )
    apel_con.commit()
    print(f"  extension_rangos:        {ok} migrados, {err} omitidos")

    # Apelaciones — muchos campos camelCase con comillas
    src.execute("""
        SELECT id,
               "numeroExpediente"  AS ne,
               "fechaIngreso"      AS fi,
               "fechaIngresoMIMP"  AS fim,
               "plazoVencimiento"  AS pv,
               apelante,
               "nnaCar"            AS nc,
               procedencia,
               documento,
               asunto,
               folios,
               "puntosExtension"   AS pe,
               "complejidadId"     AS cid,
               "puntosComplejidad" AS pc,
               "puntosTotal"       AS pt,
               "abogadoId"         AS aid,
               "fechaAsignacion"   AS fa,
               estado,
               "numeroResolucion"  AS nr,
               "documentoAtencion" AS da,
               cargos,
               observaciones,
               "createdAt"         AS cat,
               "updatedAt"         AS uat
        FROM apelaciones
    """)
    rows = src.fetchall()
    ok, err = insertar(apel,
        "apelaciones",
        ["id","numeroexpediente","fechaingreso","fechaingresomimp","plazovencimiento",
         "apelante","nnacar","procedencia","documento","asunto","folios",
         "puntosextension","complejidadid","puntoscomplejidad","puntostotal",
         "abogadoid","fechaasignacion","estado","numeroresolucion",
         "documentoatencion","cargos","observaciones","createdat","updatedat"],
        [list(r) for r in rows]
    )
    apel_con.commit()
    print(f"  apelaciones:             {ok} migrados, {err} omitidos")

    # ─── SUSTRACION_DB ────────────────────────────────────────────────────────
    print("\n[SUSTRACION_DB]")

    # Corregir typo en columna: requeridonomre → requeridombre (si aún no fue renombrada)
    sust.execute("""
        SELECT COUNT(*) FROM user_tab_columns
        WHERE table_name = 'CASOS_SUSTRACION' AND column_name = 'REQUERIDONOMRE'
    """)
    if sust.fetchone()[0] > 0:
        sust.execute("ALTER TABLE casos_sustracion RENAME COLUMN requeridonomre TO requeridombre")
        sust_con.commit()
        print("  ✓ Columna 'requeridonomre' renombrada a 'requeridombre'")

    sust.execute("DELETE FROM historial_judicial")
    sust.execute("DELETE FROM bitacora_sustracion")
    sust.execute("DELETE FROM casos_sustracion")
    sust_con.commit()

    if tabla_existe(src, "casos_sustracion"):
        # Mapeamos columnas dinámicamente: clave=nombre_real_en_system (lowercase), valor=nombre_destino
        MAP_CASO = {
            "id": "id", "codigo": "codigo",
            "nnanombre": "nnanombre", "nnaNombre": "nnanombre",
            "nnasexo": "nnasexo",    "nnaSexo": "nnasexo",
            "nnaedad": "nnaedad",    "nnaEdad": "nnaedad",
            "nnatipoedad": "nnatipoedad", "nnaTipoEdad": "nnatipoedad",
            "nnafechanac": "nnafechanac", "nnaFechaNac": "nnafechanac",
            "pais": "pais", "etapa": "etapa",
            "tiposolicitud": "tiposolicitud", "tipoSolicitud": "tiposolicitud",
            "tipologia": "tiposolicitud", "TIPOLOGIA": "tiposolicitud",
            "acperu": "acperu", "acPeru": "acperu",
            "fechaingreso": "fechaingreso",  "fechaIngreso": "fechaingreso",
            "fechasalida": "fechasalida",    "fechaSalida": "fechasalida",
            "solicitantenombre": "solicitantenombre",   "solicitanteNombre": "solicitantenombre",
            "solicitantesexo": "solicitantesexo",       "solicitanteSexo": "solicitantesexo",
            "solicitantetelefono": "solicitantetelefono","solicitanteTelefono": "solicitantetelefono",
            "solicitantecorreo": "solicitantecorreo",   "solicitanteCorreo": "solicitantecorreo",
            "solicitantedomicilio": "solicitantedomicilio","solicitanteDomicilio": "solicitantedomicilio",
            "requeridombre": "requeridombre",   "requeridoNombre": "requeridombre",
            "requeridosexo": "requeridosexo",   "requeridoSexo": "requeridosexo",
            "requeridotelefono": "requeridotelefono","requeridoTelefono": "requeridotelefono",
            "requeridocorreo": "requeridocorreo","requeridoCorreo": "requeridocorreo",
            "requeridodomicilio": "requeridodomicilio","requeridoDomicilio": "requeridodomicilio",
            "profesional": "profesional", "estado": "estado",
            "fechaentrevista": "fechaentrevista",   "fechaEntrevista": "fechaentrevista",
            "resultadoentrevista": "resultadoentrevista","resultadoEntrevista": "resultadoentrevista",
            "estadojudicial": "estadojudicial",    "estadoJudicial": "estadojudicial",
            "fechademanda": "fechademanda",        "fechaDemanda": "fechademanda",
            "numexpedientejudicial": "numexpedientejudicial","numExpedienteJudicial": "numexpedientejudicial",
            "juzgado": "juzgado",
            "sentencia1ra": "sentencia1ra",
            "sentencia2da": "sentencia2da", "sentencia2Da": "sentencia2da",
            "casacion": "casacion",
            "motivocierre": "motivocierre","motivoCierre": "motivocierre",
            "retorno": "retorno","observaciones": "observaciones",
            "creadopor": "creadopor","creadoPor": "creadopor",
            "createdat": "createdat","createdAt": "createdat",
            "updatedat": "updatedat","updatedAt": "updatedat",
        }

        src.execute("SELECT * FROM casos_sustracion")
        src_cols = [d[0] for d in src.description]   # nombres reales en SYSTEM
        all_rows = src.fetchall()

        # Deduplicar: si el mismo destino aparece dos veces (camelCase + UPPERCASE),
        # solo se toma la primera ocurrencia
        col_map = {}   # dest_col -> src_idx (primer match gana)
        for i, c in enumerate(src_cols):
            mapped = MAP_CASO.get(c) or MAP_CASO.get(c.lower())
            if mapped and mapped not in col_map:
                col_map[mapped] = i

        dest_cols = list(col_map.keys())
        src_idxs  = list(col_map.values())
        valores = [[r[i] for i in src_idxs] for r in all_rows]
        ok, err = insertar(sust, "casos_sustracion", dest_cols, valores)
        sust_con.commit()
        print(f"  casos_sustracion:    {ok} migrados, {err} omitidos")

        # Bitácora
        MAP_BIT = {
            "id":"id","casoid":"casoid","casoId":"casoid",
            "fecha":"fecha","texto":"texto",
            "creadopor":"creadopor","creadoPor":"creadopor",
            "createdat":"createdat","createdAt":"createdat",
        }
        src.execute("SELECT * FROM bitacora_sustracion")
        src_cols = [d[0] for d in src.description]
        all_rows = src.fetchall()
        col_map = {}
        for i, c in enumerate(src_cols):
            mapped = MAP_BIT.get(c) or MAP_BIT.get(c.lower())
            if mapped and mapped not in col_map:
                col_map[mapped] = i
        dest_cols = list(col_map.keys())
        src_idxs  = list(col_map.values())
        valores = [[r[i] for i in src_idxs] for r in all_rows]
        ok, err = insertar(sust, "bitacora_sustracion", dest_cols, valores)
        sust_con.commit()
        print(f"  bitacora_sustracion: {ok} migrados, {err} omitidos")

        # Historial judicial
        MAP_HIS = {
            "id":"id","casoid":"casoid","casoId":"casoid",
            "etapa":"etapa","fecha":"fecha","descripcion":"descripcion",
            "creadopor":"creadopor","creadoPor":"creadopor",
            "createdat":"createdat","createdAt":"createdat",
        }
        src.execute("SELECT * FROM historial_judicial")
        src_cols = [d[0] for d in src.description]
        all_rows = src.fetchall()
        col_map = {}
        for i, c in enumerate(src_cols):
            mapped = MAP_HIS.get(c) or MAP_HIS.get(c.lower())
            if mapped and mapped not in col_map:
                col_map[mapped] = i
        dest_cols = list(col_map.keys())
        src_idxs  = list(col_map.values())
        valores = [[r[i] for i in src_idxs] for r in all_rows]
        ok, err = insertar(sust, "historial_judicial", dest_cols, valores)
        sust_con.commit()
        print(f"  historial_judicial:  {ok} migrados, {err} omitidos")
    else:
        print("  (casos_sustracion no encontrada en SYSTEM — omitida)")

    # ─── SALA_DB ──────────────────────────────────────────────────────────────
    print("\n[SALA_DB]")
    sala.execute("DELETE FROM reservas_sala")
    sala_con.commit()

    if tabla_existe(src, "reservas_sala"):
        MAP_SALA = {
            "id":"id","fecha":"fecha","titulo":"titulo",
            "horainicio":"horainicio","horaInicio":"horainicio",
            "horafin":"horafin","horaFin":"horafin",
            "categoria":"categoria","estado":"estado","descripcion":"descripcion",
            "creadopor":"creadopor","creadoPor":"creadopor",
            "createdat":"createdat","createdAt":"createdat",
            "updatedat":"updatedat","updatedAt":"updatedat",
        }
        src.execute("SELECT * FROM reservas_sala")
        src_cols = [d[0] for d in src.description]
        all_rows = src.fetchall()
        dest_cols, src_idxs = [], []
        for i, c in enumerate(src_cols):
            mapped = MAP_SALA.get(c) or MAP_SALA.get(c.lower())
            if mapped:
                dest_cols.append(mapped)
                src_idxs.append(i)
        valores = [[r[i] for i in src_idxs] for r in all_rows]
        ok, err = insertar(sala, "reservas_sala", dest_cols, valores)
        sala_con.commit()
        print(f"  reservas_sala: {ok} migradas, {err} omitidas")
    else:
        print("  (reservas_sala no encontrada en SYSTEM — omitida)")

    # ─── Resumen ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  Conteos finales")
    print("=" * 60)

    for nombre, con, tablas in [
        ("AUTH_DB",        auth_con, ["usuarios","usuario_modulos"]),
        ("APELACIONES_DB", apel_con, ["abogados","complejidades_juridicas","extension_rangos","apelaciones"]),
        ("SUSTRACION_DB",  sust_con, ["casos_sustracion","bitacora_sustracion","historial_judicial"]),
        ("SALA_DB",        sala_con, ["reservas_sala"]),
    ]:
        print(f"\n  {nombre}:")
        c = con.cursor()
        for t in tablas:
            c.execute(f"SELECT COUNT(*) FROM {t}")
            print(f"    {t}: {c.fetchone()[0]}")

    for con in [src_con, auth_con, apel_con, sust_con, sala_con]:
        con.close()

    print("\n✓ Migración completada.")
    print("  Reinicia todos los servicios para aplicar los cambios.")


if __name__ == "__main__":
    main()
