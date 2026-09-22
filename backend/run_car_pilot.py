"""
Script de carga piloto en Oracle GESTION_DATOS_DB de los 4 archivos reales de docs:
1. BASE_RENE_CENTROS_2026_CAR (1).xlsx -> CAR_CENTROS (54 centros)
2. RENE CAR NNA BÁSICO JUN 2026.xlsx -> CAR_NNA_CORTES + CAR_CARGA_FILAS_RAW (1342 NNA)
3. RENE CAR NNA ESPECIALIZADO ok.xlsx -> CAR_NNA_CORTES + CAR_CARGA_FILAS_RAW (289 NNA)
4. RENE CAR NNA URGENCIA ok.xlsx -> CAR_NNA_CORTES + CAR_CARGA_FILAS_RAW (194 NNA)
"""

import sys, os
sys.path.insert(0, r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\servicios\servicio-gestion-datos")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from domain.services.car_etl import importar_car_centros, importar_nna_car

ORACLE_URL = "oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1"
engine = create_engine(ORACLE_URL)

from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_schema(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("ALTER SESSION SET CURRENT_SCHEMA = GESTION_DATOS_DB")
    cursor.close()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
db = SessionLocal()

DOCS_DIR = r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\docs"

print("--- 1. IMPORTANDO CATÁLOGO DE CENTROS CAR ---")
res_centros = importar_car_centros(os.path.join(DOCS_DIR, "BASE_RENE_CENTROS_2026_CAR (1).xlsx"), db)
print("Resultado Centros:", res_centros)

print("\n--- 2. IMPORTANDO NNA CAR ESPECIALIZADO ---")
res_esp = importar_nna_car(os.path.join(DOCS_DIR, "RENE CAR NNA ESPECIALIZADO ok.xlsx"), "ESPECIALIZADO", "2026-06", db)
print("Resultado Especializado:", res_esp)

print("\n--- 3. IMPORTANDO NNA CAR URGENCIA ---")
res_urg = importar_nna_car(os.path.join(DOCS_DIR, "RENE CAR NNA URGENCIA ok.xlsx"), "URGENCIA", "2026-06", db)
print("Resultado Urgencia:", res_urg)

print("\n--- 4. IMPORTANDO NNA CAR BÁSICO ---")
res_bas = importar_nna_car(os.path.join(DOCS_DIR, "RENE CAR NNA BÁSICO JUN 2026.xlsx"), "BASICO", "2026-06", db)
print("Resultado Básico:", res_bas)

print("\n=== VERIFICACIÓN EN ORACLE GESTION_DATOS_DB ===")
with engine.connect() as conn:
    total_centros = conn.execute(text("SELECT count(*) FROM car_centros")).scalar()
    total_nna = conn.execute(text("SELECT count(*) FROM car_nna_cortes")).scalar()
    total_raw = conn.execute(text("SELECT count(*) FROM car_carga_filas_raw")).scalar()
    print(f"Total Centros en BD: {total_centros}")
    print(f"Total NNA en BD: {total_nna}")
    print(f"Total Filas RAW JSON en BD: {total_raw}")
    
    # Muestra de encriptación
    sample = conn.execute(text("SELECT cod_usu, nro_doc_enc, nombres_enc, nro_doc_hash, nom_completo_hash FROM car_nna_cortes WHERE rownum <= 2")).fetchall()
    print("\nMuestra de registros cifrados en Oracle:")
    for s in sample:
        print(" - COD_USU:", s[0])
        print("   DOC_ENC (AES-256):", s[1])
        print("   NOM_ENC (AES-256):", s[2])
        print("   DOC_HASH (Blind Index):", s[3])
        print("   NOM_HASH (Blind Index):", s[4])

db.close()
print("\n¡Prueba de importación y encriptación finalizada con éxito!")
