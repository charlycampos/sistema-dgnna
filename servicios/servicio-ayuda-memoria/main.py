from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from infrastructure.db.database import engine, Base
from infrastructure.db import models  # noqa: F401
from infrastructure.api.router import router

# Asegurar tablas
Base.metadata.create_all(bind=engine)

def _asegurar_columnas(conn, tabla: str, nuevas_cols: list[tuple[str, str]]):
    cols = [row[1].lower() for row in conn.execute(text(f"PRAGMA table_info({tabla})")).fetchall()]
    for col_name, col_type in nuevas_cols:
        if col_name not in cols:
            conn.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {col_name} {col_type}"))

def _asegurar_columnas_sqlite():
    """En Oracle las columnas nuevas se agregan con scripts/002_alter_oracle.sql,
    ejecutado a mano por quien administra el esquema. Aquí solo cubrimos el
    SQLite de pruebas/desarrollo, que se crea y migra automáticamente."""
    if engine.dialect.name != "sqlite":
        return
    try:
        with engine.begin() as conn:
            _asegurar_columnas(conn, "am_documentos", [
                ("publicadopor", "VARCHAR(200)"),
                ("publicadoat", "TIMESTAMP"),
                ("hashintegridad", "VARCHAR(64)"),
                ("versiondoc", "VARCHAR(20) DEFAULT '1.0'"),
                ("documentoorigenid", "VARCHAR(36)"),
                ("observacionesrevision", "TEXT"),
            ])
            _asegurar_columnas(conn, "am_plantillas", [
                ("version", "VARCHAR(20) DEFAULT '1.0'"),
                ("estadoplantilla", "VARCHAR(30) DEFAULT 'VIGENTE'"),
                ("plantillaorigenid", "VARCHAR(36)"),
            ])
    except Exception:
        pass

_asegurar_columnas_sqlite()

app=FastAPI(title="Servicio Ayuda Memoria — DGNNA",version="1.0.0")
app.include_router(router)
@app.get("/")
def root(): return {"servicio":"ayuda-memoria","version":"1.0.0","puerto":8013}
@app.get("/health")
def health():
    with engine.connect() as conn: conn.execute(text("SELECT 1 FROM DUAL" if engine.dialect.name=="oracle" else "SELECT 1"))
    return {"status":"ok","servicio":"ayuda-memoria","database":engine.dialect.name}

@app.get("/health/ready")
def ready():
    if engine.dialect.name != "oracle":
        return {"status":"testing","servicio":"ayuda-memoria","database":engine.dialect.name}
    with engine.connect() as conn:
        usuario = conn.execute(text("SELECT USER FROM DUAL")).scalar_one()
        cantidad = conn.execute(text(
            "SELECT COUNT(*) FROM user_tables WHERE table_name IN ("
            "'AM_PLANTILLAS','AM_SECCIONES','AM_DOCUMENTOS','AM_DOCUMENTO_VALORES',"
            "'AM_CASO_ACCIONES','AM_AUDITORIA_ACCESOS')"
        )).scalar_one()
    if usuario != "AYUDA_MEMORIA_DB" or cantidad != 6:
        raise HTTPException(503,"Esquema AYUDA_MEMORIA_DB no aprovisionado completamente")
    return {"status":"ready","servicio":"ayuda-memoria","database":"oracle","schema":usuario,"tables":cantidad}
