import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("tableros_db")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tableros.db")

def crear_engine_seguro():
    global DATABASE_URL
    if "oracle" in DATABASE_URL:
        try:
            eng = create_engine(DATABASE_URL)
            with eng.connect() as conn:
                pass
            return eng
        except Exception as e:
            logger.warning(f"No se pudo conectar a Oracle ({e}). Usando SQLite fallback.")
            DATABASE_URL = "sqlite:///./tableros.db"
    
    return create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

engine = crear_engine_seguro()

if engine.dialect.name == "oracle":
    @event.listens_for(engine, "connect")
    def set_default_schema(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("ALTER SESSION SET CURRENT_SCHEMA = TABLEROS_DB")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
