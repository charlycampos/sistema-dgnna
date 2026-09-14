"""Conexión Oracle del backend.

SQLite no es un motor de ejecución del Sistema DGNNA. Solo se admite cuando
``TESTING=true`` para pruebas unitarias efímeras y aisladas.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TESTING = os.getenv("TESTING", "").strip().lower() == "true"

if not DATABASE_URL:
    raise ValueError("DATABASE_URL no encontrada en el archivo .env. Por favor, configura la conexión a Oracle.")

DATABASE_DIALECT = make_url(DATABASE_URL).get_backend_name()

if DATABASE_DIALECT == "sqlite" and not TESTING:
    raise ValueError(
        "SQLite no está permitido en ejecución normal. Configure DATABASE_URL "
        "con oracle+oracledb:// o use TESTING=true únicamente en pruebas aisladas."
    )

if DATABASE_DIALECT not in ({"oracle", "sqlite"} if TESTING else {"oracle"}):
    raise ValueError("Solo se admite Oracle; SQLite está reservado para TESTING=true.")

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
