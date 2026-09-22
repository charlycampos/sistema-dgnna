import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("gestion_datos_db")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "oracle+oracledb://gestion_datos_db:GestionDatos2026@host.docker.internal:1521/?service_name=XEPDB1"
)

class Base(DeclarativeBase):
    pass

def _init_engine():
    global DATABASE_URL
    logger.info(f"Iniciando conexión a Oracle Database...")
    try:
        # pool_pre_ping=True verifica la salud de la conexión Oracle antes de cada consulta
        eng = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        return eng
    except Exception as e:
        logger.error(f"ERROR CRÍTICO: No se pudo conectar a Oracle Database: {e}")
        raise RuntimeError(
            f"Fallo de conexión a Oracle ({e}). Verifica que el usuario 'gestion_datos_db' "
            f"esté creado en XEPDB1 y el listener 1521 esté activo."
        )

engine = _init_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
