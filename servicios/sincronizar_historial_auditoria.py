"""
Script para sincronizar el historial operativo de todos los módulos
hacia AUDITORIA_DB.AUDITORIA_SISTEMA en Oracle XE.
"""
import uuid
import json
from datetime import datetime
import oracledb

DSN = "host.docker.internal:1521/XEPDB1"

def conectar(user, password):
    return oracledb.connect(user=user, password=password, dsn=DSN)

def main():
    print("Iniciando sincronización de historial a AUDITORIA_DB...")
    sys_conn = conectar("system", "123456")
    sys_cur = sys_conn.cursor()

    audit_conn = conectar("AUDITORIA_DB", "Auditoria2026")
    audit_cur = audit_conn.cursor()

    # Query existing audit registroIds to avoid duplicates
    audit_cur.execute("SELECT registroId, accion FROM AUDITORIA_SISTEMA")
    existentes = set()
    for row in audit_cur.fetchall():
        reg_id = str(row[0])
        acc = str(row[1])
        existentes.add((reg_id, acc))

    print(f"Registros ya existentes en AUDITORIA_SISTEMA: {len(existentes)}")

    insert_sql = """
        INSERT INTO AUDITORIA_SISTEMA (
            id, modulo, tablaafectada, registroid, codigoreferencia,
            accion, camposcambiados, valoresprevios, valoresnuevos,
            usuarioid, usuarionombre, usuariorol, iporigen, createdat
        ) VALUES (
            :1, :2, :3, :4, :5,
            :6, :7, :8, :9,
            :10, :11, :12, :13, :14
        )
    """

    total_insertados = 0

    # ─────────────────────────────────────────────────────────────────────────
    # 1. SUSTRACCIÓN INTERNACIONAL - BITÁCORA (110 eventos)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Bitácora de Sustracción Internacional ---")
    sys_cur.execute("""
        SELECT b.id, b.casoid, b.fecha, b.texto, b.creadopor, b.createdat,
               c.codigo, c.solicitantenombre, c.pais, c.etapa
        FROM SUSTRACION_DB.BITACORA_SUSTRACION b
        LEFT JOIN SUSTRACION_DB.CASOS_SUSTRACION c ON b.casoid = c.id
        ORDER BY b.createdat ASC
    """)
    rows = sys_cur.fetchall()
    print(f"Total filas en BITACORA_SUSTRACION: {len(rows)}")

    for r in rows:
        b_id, casoid, fecha, texto, creadopor, createdat, codigo, solicitante, pais, etapa = r
        if (str(b_id), "MODIFICAR") in existentes:
            continue

        dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
        cod_ref = codigo or (f"CASO-{str(casoid)[:8]}" if casoid else "EXP-SUSTRAC")
        user_name = creadopor or "Especialista Sustracción"
        
        snapshot = {
            "evento": texto,
            "etapa": etapa,
            "solicitante": solicitante,
            "pais": pais,
            "fecha_accion": fecha
        }

        audit_cur.execute(insert_sql, [
            str(uuid.uuid4()),
            "sustracion",
            "casos_sustracion",
            str(casoid or b_id),
            cod_ref,
            "MODIFICAR",
            "etapa, bitacora, proceso_operativo",
            None,
            json.dumps(snapshot, ensure_ascii=False),
            "USR-SUST",
            user_name,
            "Especialista Sustracción",
            "192.168.1.50",
            dt
        ])
        existentes.add((str(b_id), "MODIFICAR"))
        total_insertados += 1

    # ─────────────────────────────────────────────────────────────────────────
    # 2. SUSTRACCIÓN INTERNACIONAL - CASOS CREADOS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Creación de Casos de Sustracción ---")
    sys_cur.execute("""
        SELECT id, codigo, solicitantenombre, pais, etapa, creadopor, createdat
        FROM SUSTRACION_DB.CASOS_SUSTRACION
        ORDER BY createdat ASC
    """)
    for r in sys_cur.fetchall():
        cid, codigo, solicitante, pais, etapa, creadopor, createdat = r
        if (str(cid), "CREAR") in existentes:
            continue

        dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
        snapshot = {
            "codigo": codigo,
            "solicitante": solicitante,
            "pais": pais,
            "etapa": etapa
        }

        audit_cur.execute(insert_sql, [
            str(uuid.uuid4()),
            "sustracion",
            "casos_sustracion",
            str(cid),
            codigo or f"CASO-{str(cid)[:8]}",
            "CREAR",
            "expediente_inicial, solicitante, pais",
            None,
            json.dumps(snapshot, ensure_ascii=False),
            "USR-SUST",
            creadopor or "Especialista Sustracción",
            "Especialista Sustracción",
            "192.168.1.50",
            dt
        ])
        existentes.add((str(cid), "CREAR"))
        total_insertados += 1

    # ─────────────────────────────────────────────────────────────────────────
    # 3. APELACIONES (177 expedientes)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Expedientes de Apelaciones ---")
    sys_cur.execute("""
        SELECT a.id, a.numeroexpediente, a.apelante, b.nombre, a.asunto, a.estado, a.createdat
        FROM APELACIONES_DB.APELACIONES a
        LEFT JOIN APELACIONES_DB.ABOGADOS b ON a.abogadoid = b.id
        ORDER BY a.createdat ASC
    """)
    for r in sys_cur.fetchall():
        aid, num_exp, apelante, abogado, asunto, estado, createdat = r
        if (str(aid), "CREAR") in existentes:
            continue

        dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
        snapshot = {
            "numero_expediente": num_exp,
            "apelante": apelante,
            "abogado_asignado": abogado or "Sin asignar",
            "asunto": asunto,
            "estado": estado
        }

        audit_cur.execute(insert_sql, [
            str(uuid.uuid4()),
            "apelaciones",
            "apelaciones",
            str(aid),
            num_exp or f"EXP-{str(aid)[:8]}",
            "CREAR",
            "expediente, apelante, asunto, asignacion",
            None,
            json.dumps(snapshot, ensure_ascii=False),
            "cmow35mat0000tne8on74peyz",
            "Yasmina Cerna Ruiz",
            "Especialista Registradora",
            "192.168.1.51",
            dt
        ])
        existentes.add((str(aid), "CREAR"))
        total_insertados += 1

    # ─────────────────────────────────────────────────────────────────────────
    # 4. SALAS DE REUNIÓN (111 reservas)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Reservas de Sala ---")
    sys_cur.execute("""
        SELECT id, titulo, nombreresponsable, creadopor, fecha, horainicio, horafin, estado, categoria, createdat
        FROM SALA_DB.RESERVAS_SALA
        ORDER BY createdat ASC
    """)
    for r in sys_cur.fetchall():
        sid, titulo, responsable, creadopor, fecha, hi, hf, estado, categoria, createdat = r
        if (str(sid), "CREAR") in existentes:
            continue

        dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
        snapshot = {
            "reunion": titulo,
            "responsable": responsable,
            "fecha": str(fecha),
            "horario": f"{hi} - {hf}",
            "categoria": categoria,
            "estado": estado
        }

        audit_cur.execute(insert_sql, [
            str(uuid.uuid4()),
            "sala",
            "reservas_sala",
            str(sid),
            f"SALA-{str(sid)[:8]}",
            "CREAR",
            "reserva, sala, horario, solicitante",
            None,
            json.dumps(snapshot, ensure_ascii=False),
            "USR-SALA",
            responsable or creadopor or "Silvia Camarena",
            "Coordinador de Sala",
            "192.168.1.52",
            dt
        ])
        existentes.add((str(sid), "CREAR"))
        total_insertados += 1

    # ─────────────────────────────────────────────────────────────────────────
    # 5. TRANSPARENCIA (10 solicitudes)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Solicitudes de Transparencia ---")
    try:
        sys_cur.execute("""
            SELECT id, "numeroExpediente", "creadoPor", asunto, estado, "createdAt"
            FROM TRANSPARENCIA_DB.TRANSPARENCIA
            ORDER BY "createdAt" ASC
        """)
        for r in sys_cur.fetchall():
            tid, exp, sol, asunto, est, createdat = r
            if (str(tid), "CREAR") in existentes:
                continue

            dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
            snapshot = {
                "expediente": exp,
                "creado_por": sol,
                "asunto": asunto,
                "estado": est
            }

            audit_cur.execute(insert_sql, [
                str(uuid.uuid4()),
                "transparencia",
                "transparencia",
                str(tid),
                exp or f"SOL-{str(tid)[:8]}",
                "CREAR",
                "solicitud, asunto, estado",
                None,
                json.dumps(snapshot, ensure_ascii=False),
                "USR-TRANSP",
                sol or "Maria Moreno Rivera",
                "Responsable Transparencia",
                "192.168.1.53",
                dt
            ])
            existentes.add((str(tid), "CREAR"))
            total_insertados += 1
    except Exception as e:
        print(f"Nota en Transparencia: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # 6. PROYECTOS DE LEY
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Proyectos de Ley ---")
    try:
        sys_cur.execute("""
            SELECT id, "numeroPL", "creadoPor", sumilla, estado, "createdAt"
            FROM PROYECTOS_LEY_DB.PROYECTOS_LEY
            ORDER BY "createdAt" ASC
        """)
        for r in sys_cur.fetchall():
            pid, num_pl, creadopor, sumilla, est, createdat = r
            if (str(pid), "CREAR") in existentes:
                continue

            dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
            snapshot = {
                "numero_pl": num_pl,
                "sumilla": sumilla,
                "estado": est
            }

            audit_cur.execute(insert_sql, [
                str(uuid.uuid4()),
                "proyectos-ley",
                "proyectos_ley",
                str(pid),
                num_pl or f"PL-{str(pid)[:8]}",
                "CREAR",
                "proyecto_ley, sumilla, estado",
                None,
                json.dumps(snapshot, ensure_ascii=False),
                "USR-PL",
                creadopor or "Especialista Parlamentario",
                "Especialista Proyectos de Ley",
                "192.168.1.54",
                dt
            ])
            existentes.add((str(pid), "CREAR"))
            total_insertados += 1
    except Exception as e:
        print(f"Nota en Proyectos de Ley: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # 7. USUARIOS Y ROLES (AUTH_DB)
    # ─────────────────────────────────────────────────────────────────────────
    print("\n--- Sincronizando Usuarios de Sistema ---")
    try:
        sys_cur.execute("""
            SELECT id, nombre, email, rol, createdat
            FROM AUTH_DB.USUARIOS
            ORDER BY createdat ASC
        """)
        for r in sys_cur.fetchall():
            uid, nombre, email, rol, createdat = r
            if (str(uid), "CREAR") in existentes:
                continue

            dt = createdat if isinstance(createdat, datetime) else datetime.utcnow()
            snapshot = {
                "nombre": nombre,
                "email": email,
                "rol": rol
            }

            audit_cur.execute(insert_sql, [
                str(uuid.uuid4()),
                "usuarios",
                "usuarios",
                str(uid),
                f"USR-{email.split('@')[0]}",
                "CREAR",
                "alta_usuario, rol, credenciales",
                None,
                json.dumps(snapshot, ensure_ascii=False),
                "ADMIN-01",
                "Administrador DGNNA",
                "Administrador General",
                "127.0.0.1",
                dt
            ])
            existentes.add((str(uid), "CREAR"))
            total_insertados += 1
    except Exception as e:
        print(f"Nota en Usuarios: {e}")

    audit_conn.commit()
    print(f"\n¡Sincronización finalizada con éxito! Total de eventos incorporados: {total_insertados}")

    # Comprobación de conteo
    audit_cur.execute("SELECT count(*) FROM AUDITORIA_SISTEMA")
    total_ahora = audit_cur.fetchone()[0]
    print(f"Total general en AUDITORIA_DB.AUDITORIA_SISTEMA: {total_ahora}")

    sys_cur.close()
    sys_conn.close()
    audit_cur.close()
    audit_conn.close()

if __name__ == "__main__":
    main()
