import sys, os
sys.path.insert(0, r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\servicios\servicio-gestion-datos")

from sqlalchemy import create_engine
from infrastructure.db.models import Base

# Nos conectamos como SYSTEM pero apuntando al esquema GESTION_DATOS_DB para crear las tablas si faltan
# o usando las credenciales directas de Oracle
ORACLE_URL = "oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1"
engine = create_engine(ORACLE_URL)

with engine.connect() as conn:
    from sqlalchemy import text
    conn.execute(text("ALTER SESSION SET CURRENT_SCHEMA = GESTION_DATOS_DB"))
    conn.commit()
    print("Schema set to GESTION_DATOS_DB")

# Crear tablas faltantes dentro de GESTION_DATOS_DB
from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_schema(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("ALTER SESSION SET CURRENT_SCHEMA = GESTION_DATOS_DB")
    cursor.close()

Base.metadata.create_all(bind=engine)
print("Tablas creadas exitosamente en GESTION_DATOS_DB!")

with engine.connect() as conn:
    res = conn.execute(text("SELECT table_name FROM all_tables WHERE owner = 'GESTION_DATOS_DB' AND table_name LIKE 'CAR_%'")).fetchall()
    print("Tablas CAR creadas en Oracle:")
    for r in res:
        print(" ->", r[0])
