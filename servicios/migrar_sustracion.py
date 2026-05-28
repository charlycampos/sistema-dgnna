"""
Migración específica: SYSTEM.casos_sustracion → SUSTRACION_DB
─────────────────────────────────────────────────────────────
Diagnóstica, corrige typos de columnas y migra los datos.
Ejecutar: python migrar_sustracion.py
"""
import oracledb

SRC  = dict(user="system",        password="123456",       dsn="localhost:1521/XEPDB1")
SUST = dict(user="sustracion_db", password="Sustracion2026", dsn="localhost:1521/XEPDB1")


def main():
    src_con  = oracledb.connect(**SRC)
    sust_con = oracledb.connect(**SUST)
    src  = src_con.cursor()
    sust = sust_con.cursor()

    # ── 1. Mostrar columnas reales en destino ─────────────────────────────────
    print("=" * 60)
    print("  Columnas actuales en SUSTRACION_DB.casos_sustracion")
    print("=" * 60)
    sust.execute("""
        SELECT column_name FROM user_tab_columns
        WHERE table_name = 'CASOS_SUSTRACION'
        ORDER BY column_id
    """)
    dest_cols_actual = [r[0] for r in sust.fetchall()]
    for c in dest_cols_actual:
        print(f"  {c}")

    # ── 2. Corregir typos conocidos en destino ────────────────────────────────
    print("\n[Corrigiendo columnas en destino...]")

    typos = {
        "REQUERIDONOMRE": "requeridombre",   # typo en SQL original
    }
    for viejo, nuevo in typos.items():
        if viejo in dest_cols_actual:
            sust.execute(f"ALTER TABLE casos_sustracion RENAME COLUMN {viejo} TO {nuevo}")
            sust_con.commit()
            print(f"  ✓ {viejo} → {nuevo}")
            dest_cols_actual = [nuevo if c == viejo else c for c in dest_cols_actual]
        else:
            print(f"  · {viejo} no encontrada (ya renombrada o no existe)")

    # Volver a leer columnas destino actualizadas (en minúsculas para mapeo)
    sust.execute("""
        SELECT LOWER(column_name) FROM user_tab_columns
        WHERE table_name = 'CASOS_SUSTRACION'
        ORDER BY column_id
    """)
    dest_cols_lower = {r[0] for r in sust.fetchall()}
    print(f"\n  Columnas destino disponibles: {sorted(dest_cols_lower)}")

    # ── 3. Verificar tabla origen ─────────────────────────────────────────────
    print("\n[Leyendo SYSTEM.casos_sustracion...]")
    src.execute("""
        SELECT COUNT(*) FROM user_tables
        WHERE table_name = 'CASOS_SUSTRACION'
    """)
    if src.fetchone()[0] == 0:
        print("  ✗ tabla no encontrada en SYSTEM.")
        return

    src.execute("SELECT * FROM casos_sustracion")
    src_cols_raw  = [d[0] for d in src.description]
    all_rows      = src.fetchall()
    print(f"  Columnas origen: {src_cols_raw}")
    print(f"  Filas encontradas: {len(all_rows)}")

    if not all_rows:
        print("  No hay datos en SYSTEM.casos_sustracion.")
        return

    # ── 4. Mapeo origen → destino (deduplicado, primer match gana) ────────────
    # Clave = nombre tal como viene del cursor (puede ser camelCase o UPPER)
    # Valor = nombre en destino (siempre minúsculas)
    MAPA = {
        # identidades simples
        "ID":"id","CODIGO":"codigo","PAIS":"pais","ETAPA":"etapa",
        "TIPOLOGIA":"tiposolicitud","TIPOSOLICITUD":"tiposolicitud",
        "ACPERU":"acperu","PROFESIONAL":"profesional","ESTADO":"estado",
        "OBSERVACIONES":"observaciones","JUZGADO":"juzgado",
        "SENTENCIA1RA":"sentencia1ra","SENTENCIA2DA":"sentencia2da",
        "CASACION":"casacion","RETORNO":"retorno",
        "NNASEXO":"nnasexo","NNAEDAD":"nnaedad","NNATIPOEDAD":"nnatipoedad",
        "SOLICITANTESEXO":"solicitantesexo","SOLICITANTECORREO":"solicitantecorreo",
        "REQUERIDOSEXO":"requeridosexo","REQUERIDOTELEFONO":"requeridotelefono",
        "REQUERIDOCORREO":"requeridocorreo",
        "FECHAENTREVISTA":"fechaentrevista","RESULTADOENTREVISTA":"resultadoentrevista",
        "FECHADEMANDA":"fechademanda","NUMEXPEDIENTEJUDICIAL":"numexpedientejudicial",
        "MOTIVOCIERRE":"motivocierre","CREADOPOR":"creadopor",
        "ESTADOJUDICIAL":"estadojudicial",
        "NNAFECHANAC":"nnafechanac","SOLICITANTENOMBRE":"solicitantenombre",
        "SOLICITANTETELEFONO":"solicitantetelefono","SOLICITANTEDOMICILIO":"solicitantedomicilio",
        "REQUERIDONOMBRE":"requeridombre","REQUERIDODOMICILIO":"requeridodomicilio",
        # camelCase (columnas con comillas en SYSTEM)
        "nnaNombre":"nnanombre","nnaSexo":"nnasexo","nnaEdad":"nnaedad",
        "nnaTipoEdad":"nnatipoedad","nnaFechaNac":"nnafechanac",
        "tipoSolicitud":"tiposolicitud","acPeru":"acperu",
        "fechaIngreso":"fechaingreso","fechaSalida":"fechasalida",
        "solicitanteNombre":"solicitantenombre","solicitanteSexo":"solicitantesexo",
        "solicitanteTelefono":"solicitantetelefono","solicitanteCorreo":"solicitantecorreo",
        "solicitanteDomicilio":"solicitantedomicilio",
        "requeridoNombre":"requeridombre","requeridoSexo":"requeridosexo",
        "requeridoTelefono":"requeridotelefono","requeridoCorreo":"requeridocorreo",
        "requeridoDomicilio":"requeridodomicilio",
        "estadoJudicial":"estadojudicial","motivoCierre":"motivocierre",
        "creadoPor":"creadopor","createdAt":"createdat","updatedAt":"updatedat",
        "CREATEDAT":"createdat","UPDATEDAT":"updatedat",
        "fechaEntrevista":"fechaentrevista","resultadoEntrevista":"resultadoentrevista",
        "fechaDemanda":"fechademanda","numExpedienteJudicial":"numexpedientejudicial",
        "sentencia1ra":"sentencia1ra","sentencia2da":"sentencia2da",
        "sentencia2Da":"sentencia2da",
    }

    # Deduplicar: primer match por columna destino gana
    col_map = {}   # dest_col -> src_idx
    for i, c in enumerate(src_cols_raw):
        mapped = MAPA.get(c) or MAPA.get(c.upper()) or MAPA.get(c.lower())
        if mapped and mapped in dest_cols_lower and mapped not in col_map:
            col_map[mapped] = i

    dest_cols = list(col_map.keys())
    src_idxs  = list(col_map.values())
    print(f"\n  Columnas que se migrarán ({len(dest_cols)}): {dest_cols}")

    # ── 5. Limpiar e insertar ─────────────────────────────────────────────────
    print("\n[Limpiando SUSTRACION_DB...]")
    sust.execute("DELETE FROM historial_judicial")
    sust.execute("DELETE FROM bitacora_sustracion")
    sust.execute("DELETE FROM casos_sustracion")
    sust_con.commit()

    ph  = ", ".join([f":{i+1}" for i in range(len(dest_cols))])
    sql = f"INSERT INTO casos_sustracion ({', '.join(dest_cols)}) VALUES ({ph})"

    ok = err = 0
    for row in all_rows:
        try:
            sust.execute(sql, [row[i] for i in src_idxs])
            ok += 1
        except Exception as e:
            err += 1
            if err <= 5:
                print(f"  SKIP: {e}")
    sust_con.commit()
    print(f"\n  casos_sustracion: {ok} migrados, {err} omitidos")

    # ── 6. Bitácora ───────────────────────────────────────────────────────────
    src.execute("""
        SELECT COUNT(*) FROM user_tables WHERE table_name='BITACORA_SUSTRACION'
    """)
    if src.fetchone()[0] > 0:
        src.execute("SELECT * FROM bitacora_sustracion")
        s_cols = [d[0] for d in src.description]
        b_rows = src.fetchall()
        BIT_MAP = {
            "ID":"id","CASOID":"casoid","casoId":"casoid",
            "FECHA":"fecha","TEXTO":"texto",
            "CREADOPOR":"creadopor","creadoPor":"creadopor",
            "CREATEDAT":"createdat","createdAt":"createdat",
        }
        col_map2 = {}
        for i, c in enumerate(s_cols):
            mapped = BIT_MAP.get(c) or BIT_MAP.get(c.upper())
            if mapped and mapped not in col_map2:
                col_map2[mapped] = i
        d2 = list(col_map2.keys())
        i2 = list(col_map2.values())
        ph2 = ", ".join([f":{i+1}" for i in range(len(d2))])
        sql2 = f"INSERT INTO bitacora_sustracion ({', '.join(d2)}) VALUES ({ph2})"
        ok2 = err2 = 0
        for row in b_rows:
            try:
                sust.execute(sql2, [row[i] for i in i2])
                ok2 += 1
            except Exception as e:
                err2 += 1
                if err2 <= 3: print(f"  SKIP bitacora: {e}")
        sust_con.commit()
        print(f"  bitacora_sustracion: {ok2} migrados, {err2} omitidos")

    # ── 7. Historial judicial ─────────────────────────────────────────────────
    src.execute("""
        SELECT COUNT(*) FROM user_tables WHERE table_name='HISTORIAL_JUDICIAL'
    """)
    if src.fetchone()[0] > 0:
        src.execute("SELECT * FROM historial_judicial")
        s_cols = [d[0] for d in src.description]
        h_rows = src.fetchall()
        HIS_MAP = {
            "ID":"id","CASOID":"casoid","casoId":"casoid",
            "ETAPA":"etapa","FECHA":"fecha","DESCRIPCION":"descripcion",
            "CREADOPOR":"creadopor","creadoPor":"creadopor",
            "CREATEDAT":"createdat","createdAt":"createdat",
        }
        col_map3 = {}
        for i, c in enumerate(s_cols):
            mapped = HIS_MAP.get(c) or HIS_MAP.get(c.upper())
            if mapped and mapped not in col_map3:
                col_map3[mapped] = i
        d3 = list(col_map3.keys())
        i3 = list(col_map3.values())
        ph3 = ", ".join([f":{i+1}" for i in range(len(d3))])
        sql3 = f"INSERT INTO historial_judicial ({', '.join(d3)}) VALUES ({ph3})"
        ok3 = err3 = 0
        for row in h_rows:
            try:
                sust.execute(sql3, [row[i] for i in i3])
                ok3 += 1
            except Exception as e:
                err3 += 1
                if err3 <= 3: print(f"  SKIP historial: {e}")
        sust_con.commit()
        print(f"  historial_judicial:  {ok3} migrados, {err3} omitidos")

    # ── 8. Conteos finales ────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  Conteos finales en SUSTRACION_DB")
    print("=" * 60)
    for t in ["casos_sustracion", "bitacora_sustracion", "historial_judicial"]:
        sust.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t}: {sust.fetchone()[0]}")

    src_con.close()
    sust_con.close()
    print("\n✓ Migración de sustracción completada.")


if __name__ == "__main__":
    main()
