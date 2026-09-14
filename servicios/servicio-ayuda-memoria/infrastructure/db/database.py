import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

logger = logging.getLogger("ayuda_memoria_db")
DATABASE_URL = os.getenv("DATABASE_URL", "")
TESTING = os.getenv("TESTING", "").strip().lower() == "true"
if not DATABASE_URL:
    if TESTING or os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() == "true":
        DATABASE_URL = "sqlite:///./data/ayuda_memoria.db"
    else:
        raise RuntimeError("DATABASE_URL es obligatoria para AYUDA_MEMORIA_DB")

dialect = make_url(DATABASE_URL).get_backend_name()
if dialect != "oracle" and not ((TESTING or os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() == "true") and dialect == "sqlite"):
    raise RuntimeError("El servicio exige Oracle; SQLite solo se permite con TESTING=true")
if dialect == "oracle" and (make_url(DATABASE_URL).username or "").upper() != "AYUDA_MEMORIA_DB":
    raise RuntimeError("DATABASE_URL debe autenticarse como AYUDA_MEMORIA_DB")

def _init_engine():
    global DATABASE_URL
    if dialect == "oracle":
        try:
            eng = create_engine(DATABASE_URL, pool_pre_ping=True)
            with eng.connect() as conn:
                pass
            return eng
        except Exception as e:
            if os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() == "true":
                logger.warning(f"No se pudo conectar a Oracle ({e}). Usando SQLite de desarrollo persistente.")
                DATABASE_URL = "sqlite:///./data/ayuda_memoria.db"
                os.makedirs("./data", exist_ok=True)
                return create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True)
            raise

    if DATABASE_URL.startswith("sqlite"):
        os.makedirs("./data", exist_ok=True)
    return create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}, pool_pre_ping=True)

engine = _init_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
