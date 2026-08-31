"""
Conexión a la base de datos para el microservicio de Consulta Normativa.
Compatible con Oracle XE 21c (producción) y SQLite (desarrollo/fallback).
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./normativa.db"
)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

def _init_engine(url: str):
    eng = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    if "oracle" in url.lower():
        from sqlalchemy import event
        @event.listens_for(eng, "connect")
        def set_default_schema(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("ALTER SESSION SET CURRENT_SCHEMA = NORMATIVA_DB")
            cursor.close()
    return eng

try:
    engine = _init_engine(DATABASE_URL)
    with engine.connect() as test_conn:
        test_conn.execute(text("SELECT 1 FROM DUAL" if "oracle" in DATABASE_URL.lower() else "SELECT 1"))
    print(f"[normativa-service] Conectado exitosamente a: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
except Exception as e:
    print(f"[normativa-service] No se pudo conectar a la BD configurada ({e}). Usando fallback SQLite...")
    DATABASE_URL = "sqlite:///./normativa.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
