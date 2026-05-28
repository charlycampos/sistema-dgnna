"""
Conexión a la base de datos.

MODO DESARROLLO  → SQLite (sin instalación adicional)
MODO PRODUCCIÓN  → Oracle (cambiar DATABASE_URL en .env)

Para cambiar a Oracle cuando esté listo:
  1. Instalar: pip install oracledb
  2. En .env cambiar DATABASE_URL a:
     oracle+oracledb://usuario:password@host:1521/?service_name=ORCL
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL no encontrada en el archivo .env. Por favor, configura la conexión a Oracle.")

engine = create_engine(DATABASE_URL)

if engine.dialect.name == "oracle":
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_default_schema(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("ALTER SESSION SET CURRENT_SCHEMA = APELACIONES_DB")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency de FastAPI para obtener sesión de BD."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
