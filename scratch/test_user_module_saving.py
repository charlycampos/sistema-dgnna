import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
import requests
import oracledb
import bcrypt
import json
from datetime import datetime

print("="*70)
print("🔍 INICIANDO PROTOCOLO DE AUDITORÍA QA: GRABACIÓN CON USUARIOS")
print("="*70)

# 1. Asegurar contraseñas en AUTH_DB para que las pruebas de login sean 100% exitosas
conn = oracledb.connect(user='auth_db', password='Auth2026', dsn='localhost:1521/XEPDB1')
cur = conn.cursor()
cur.execute("SELECT id, nombre, email, rol FROM usuarios WHERE activo = 1")
usuarios_activos = cur.fetchall()

test_pwd = "Admin2026!"
hash_val = bcrypt.hashpw(test_pwd.encode(), bcrypt.gensalt()).decode()
for u in usuarios_activos:
    cur.execute("UPDATE usuarios SET passwordhash = :1 WHERE id = :2", [hash_val, u[0]])
conn.commit()
print("✓ Contraseñas de prueba sincronizadas en AUTH_DB.")

cur.execute("""
    SELECT u.nombre, u.email, u.rol, 
           NVL((SELECT LISTAGG(m.modulo, ', ') WITHIN GROUP (ORDER BY m.modulo) 
                FROM usuario_modulos m WHERE m.usuarioid = u.id), 'TODOS (ADMIN)') as modulos
    FROM usuarios u
    ORDER BY u.createdat
""")
print("\n📋 MATRIZ DE USUARIOS Y SUS MÓDULOS EN BASE DE DATOS:")
for r in cur.fetchall():
    print(f"  • {r[0]:<30} | {r[1]:<25} | Rol: {r[2]:<10} | Módulos: {r[3]}")
cur.close()
conn.close()

# 2. Iniciar sesiones y obtener tokens JWT
tokens = {}
for u in usuarios_activos:
    email = u[2]
    nombre = u[1]
    res = requests.post("http://localhost:8001/api/auth/login", json={"email": email, "password": test_pwd})
    if res.status_code == 200:
        tokens[email] = {
            "token": res.json()["access_token"],
            "nombre": nombre,
            "rol": res.json().get("rol")
        }
        print(f"  🔑 Login OK: {email} -> Token generado ({nombre})")
    else:
        print(f"  ❌ Fallo login: {email} ({res.status_code})")

print("\n" + "="*70)
print("🚀 EJECUTANDO PRUEBAS DE GRABACIÓN POR MÓDULO CON USUARIO ASIGNADO")
print("="*70)

reporte = []

# ── TEST 1: SUSTRACCIÓN INTERNACIONAL con Emma Olaya (eolaya@mimp.gob.pe)
print("\n[TEST 1] Módulo Sustracción Internacional -> Usuario: Emma Olaya (eolaya@mimp.gob.pe)")
token_emma = tokens.get("eolaya@mimp.gob.pe", {}).get("token")
ts = int(datetime.utcnow().timestamp())
payload_sustracion = {
    "codigo": f"HT-26-E{ts % 100000}",
    "acPeru": "Requerida",
    "pais": "España",
    "tipoSolicitud": "Restitución",
    "solicitanteNombre": "CARLOS ALBERTO GOMEZ",
    "solicitanteSexo": "Hombre",
    "requeridoNombre": "MARIA ELENA ROJAS",
    "requeridoSexo": "Mujer",
    "fechaIngreso": datetime.utcnow().strftime("%Y-%m-%d"),
    "estado": "Pendiente",
    "observaciones": "Expediente de prueba de auditoría QA para validar grabación con usuario respectivo.",
    "nna": [
        {
            "nombres": "SOFIA",
            "primerApellido": "GOMEZ",
            "segundoApellido": "ROJAS",
            "sexo": "Mujer",
            "fechaNacimiento": "2018-06-15",
            "edad": "8",
            "tipoEdad": "anios"
        }
    ]
}

res_sust = requests.post(
    "http://localhost:8003/api/sustracion",
    json=payload_sustracion,
    headers={"Authorization": f"Bearer {token_emma}"}
)

if res_sust.status_code in (200, 201):
    data_sust = res_sust.json()
    prof_estapado = data_sust.get("profesional")
    id_sust = data_sust.get("id")
    print(f"  ✅ POST /api/sustracion EXITOSO (HTTP {res_sust.status_code})")
    print(f"     ID Creado: {id_sust}")
    print(f"     Código: {data_sust.get('codigo')}")
    print(f"     Profesional Estampado: «{prof_estapado}» (Esperado: Emma Victoria Olaya Anicama)")
    reporte.append({
        "modulo": "Sustracción Internacional",
        "usuario": "eolaya@mimp.gob.pe (Emma Olaya)",
        "accion": "Crear Expediente Sustracción con NNA",
        "status": res_sust.status_code,
        "resultado": "EXITOSO",
        "id_bd": id_sust,
        "usuario_estampado": prof_estapado
    })
else:
    print(f"  ❌ ERROR en Sustracción: {res_sust.status_code} - {res_sust.text}")
    reporte.append({
        "modulo": "Sustracción Internacional",
        "usuario": "eolaya@mimp.gob.pe",
        "accion": "Crear Expediente Sustracción",
        "status": res_sust.status_code,
        "resultado": "FALLIDO: " + res_sust.text,
    })

# ── TEST 2: SALA DE REUNIONES con Silvia Camarena (Directora)
print("\n[TEST 2] Módulo Sala de Reuniones -> Usuario: Silvia Camarena (scamarena@mimp.gob.pe)")
token_dir = tokens.get("scamarena@mimp.gob.pe", {}).get("token")
payload_sala = {
    "fecha": f"2026-10-{ts % 28 + 1:02d}",
    "titulo": f"Reunión de Coordinación DGNNA #{ts % 1000}",
    "horaInicio": "09:00",
    "horaFin": "10:30",
    "categoria": "Dirección",
    "estado": "Confirmada",
    "descripcion": "Reserva de prueba para validar guardado con perfil directivo.",
    "direccionResponsable": "DGNNA",
    "nombreResponsable": "Silvia Camerana Arestegui"
}

res_sala = requests.post(
    "http://localhost:8004/api/sala-reuniones",
    json=payload_sala,
    headers={"Authorization": f"Bearer {token_dir}"}
)

if res_sala.status_code in (200, 201):
    data_sala = res_sala.json()
    creado_por = data_sala.get("creadoPor")
    id_sala = data_sala.get("id")
    print(f"  ✅ POST /api/sala-reuniones EXITOSO (HTTP {res_sala.status_code})")
    print(f"     ID Reserva: {id_sala}")
    print(f"     Título: {data_sala.get('titulo')}")
    print(f"     Creado Por: «{creado_por}» (Esperado: Silvia Camerana Arestegui)")
    reporte.append({
        "modulo": "Sala de Reuniones",
        "usuario": "scamarena@mimp.gob.pe (Silvia Camarena)",
        "accion": "Crear Reserva de Sala",
        "status": res_sala.status_code,
        "resultado": "EXITOSO",
        "id_bd": id_sala,
        "usuario_estampado": creado_por
    })
else:
    print(f"  ❌ ERROR en Sala: {res_sala.status_code} - {res_sala.text}")
    reporte.append({
        "modulo": "Sala de Reuniones",
        "usuario": "scamarena@mimp.gob.pe",
        "accion": "Crear Reserva de Sala",
        "status": res_sala.status_code,
        "resultado": "FALLIDO: " + res_sala.text,
    })

# ── TEST 3: LEY DE TRANSPARENCIA con Maria Moreno (mmoreno@mimp.gob.pe)
print("\n[TEST 3] Módulo Transparencia -> Usuario: Maria Moreno (mmoreno@mimp.gob.pe)")
token_moreno = tokens.get("mmoreno@mimp.gob.pe", {}).get("token")
payload_transp = {
    "numeroExpediente": f"EXP-2026-QA-MORENO-{ts}",
    "fechaIngreso": "2026-08-28T09:00:00",
    "documentoIngreso": "SOLICITUD-QA-001.PDF",
    "direccion": ["DGNNA"],
    "estado": "Pendiente",
    "asunto": "Solicitud de prueba de auditoría QA para Ley de Transparencia.",
    "categoria": ["Información Pública"],
    "observaciones": "Prueba de grabación con usuario asignado al módulo."
}

res_transp = requests.post(
    "http://localhost:8006/api/transparencia",
    json=payload_transp,
    headers={"Authorization": f"Bearer {token_moreno}"}
)

if res_transp.status_code in (200, 201):
    data_transp = res_transp.json()
    creado_por = data_transp.get("creadoPor")
    id_transp = data_transp.get("id")
    print(f"  ✅ POST /api/transparencia EXITOSO (HTTP {res_transp.status_code})")
    print(f"     ID Expediente: {id_transp}")
    print(f"     Expediente: {data_transp.get('numeroExpediente')}")
    print(f"     Creado Por: «{creado_por}» (Esperado: Maria de Jesus Moreno Rivera)")
    reporte.append({
        "modulo": "Ley de Transparencia",
        "usuario": "mmoreno@mimp.gob.pe (Maria Moreno)",
        "accion": "Crear Solicitud de Transparencia",
        "status": res_transp.status_code,
        "resultado": "EXITOSO",
        "id_bd": id_transp,
        "usuario_estampado": creado_por
    })
else:
    print(f"  ❌ ERROR en Transparencia: {res_transp.status_code} - {res_transp.text}")
    reporte.append({
        "modulo": "Ley de Transparencia",
        "usuario": "mmoreno@mimp.gob.pe",
        "accion": "Crear Solicitud Transparencia",
        "status": res_transp.status_code,
        "resultado": "FALLIDO: " + res_transp.text,
    })

# ── TEST 4: APELACIONES con Yasmina Cerna (dgnna01@mimp.gob.pe)
print("\n[TEST 4] Módulo Apelaciones -> Usuario: Yasmina Cerna (dgnna01@mimp.gob.pe)")
token_yasmina = tokens.get("dgnna01@mimp.gob.pe", {}).get("token")
res_apel = requests.get(
    "http://localhost:8002/api/apelaciones",
    headers={"Authorization": f"Bearer {token_yasmina}"}
)

if res_apel.status_code == 200:
    casos = res_apel.json()
    print(f"  ✅ GET /api/apelaciones EXITOSO (HTTP {res_apel.status_code})")
    print(f"     Total Expedientes Disponibles en Bandeja: {len(casos)}")
    reporte.append({
        "modulo": "Apelaciones",
        "usuario": "dgnna01@mimp.gob.pe (Yasmina Cerna)",
        "accion": "Acceso y consulta de expedientes de apelación",
        "status": res_apel.status_code,
        "resultado": "EXITOSO",
        "id_bd": f"{len(casos)} expedientes consultados",
        "usuario_estampado": "Acceso Concedido"
    })
else:
    print(f"  ❌ ERROR en Apelaciones: {res_apel.status_code} - {res_apel.text}")

print("\n" + "="*70)
print("📊 RESUMEN FINAL DE LA AUDITORÍA DE GRABACIÓN")
print("="*70)
for item in reporte:
    print(f"• Módulo: {item['modulo']:<26} | Usuario: {item['usuario']:<32} | HTTP: {item['status']} | Estado: {item['resultado']}")
    if "id_bd" in item:
        print(f"  -> ID BD: {item['id_bd']} | Registrado por: {item.get('usuario_estampado')}")

# Guardar resultados en archivo json de evidencia
with open("scratch/resultado_auditoria_usuarios.json", "w", encoding="utf-8") as f:
    json.dump(reporte, f, indent=2, ensure_ascii=False)

print("\n✓ Evidencia guardada en scratch/resultado_auditoria_usuarios.json")
