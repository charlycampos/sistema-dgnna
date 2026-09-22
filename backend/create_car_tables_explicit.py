import sys, os
sys.path.insert(0, r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\servicios\servicio-gestion-datos")

from sqlalchemy import create_engine, text
from infrastructure.db.models import CarCentroModel, CarCargaModel, CarCargaFilaRawModel, CarNnaCorteModel, Base

ORACLE_URL = "oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1"
engine = create_engine(ORACLE_URL)

car_tables = [
    CarCentroModel.__table__,
    CarCargaModel.__table__,
    CarCargaFilaRawModel.__table__,
    CarNnaCorteModel.__table__
]

with engine.connect() as conn:
    conn.execute(text("ALTER SESSION SET CURRENT_SCHEMA = GESTION_DATOS_DB"))
    for t in car_tables:
        # Check if exists
        check = conn.execute(text(f"SELECT count(*) FROM all_tables WHERE owner = 'GESTION_DATOS_DB' AND table_name = '{t.name.upper()}'")).scalar()
        if check == 0:
            print(f"Creating table {t.name} in GESTION_DATOS_DB...")
            t.create(bind=conn)
            print(f"Table {t.name} created successfully!")
        else:
            print(f"Table {t.name} already exists.")
    conn.commit()

with engine.connect() as conn:
    res = conn.execute(text("SELECT table_name FROM all_tables WHERE owner = 'GESTION_DATOS_DB' AND table_name LIKE 'CAR_%'")).fetchall()
    print("\nVerified CAR tables in GESTION_DATOS_DB:")
    for r in res:
        print(" ->", r[0])
