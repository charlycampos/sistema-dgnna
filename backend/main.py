"""
Backend FastAPI — Sistema de Apelaciones DGNNA
Corre en http://localhost:8000
Documentación automática en http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

from database import engine, Base
from routers import auth, abogados, complejidad, extension, apelaciones, usuarios, dashboard, reportes, sala_reuniones, sustracion, revisores, proyectos_ley, transparencia, apelantes

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# ── Migraciones incrementales ─────────────────────────────────────
# create_all no modifica columnas en tablas ya existentes.
# Este bloque agrega columnas nuevas sin afectar datos existentes.
def run_migrations():
    """
    Intenta agregar columnas nuevas directamente para Oracle.
    Si la columna ya existe (ORA-01430), se ignora silenciosamente.
    """
    import traceback
    
    migraciones = [
        "ALTER TABLE reservas_sala ADD (estado VARCHAR2(20) DEFAULT 'Programado' NOT NULL)",
        # casos_sustracion — campos nuevos
        "ALTER TABLE casos_sustracion ADD (nnaSexo VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (nnaEdad VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (nnaTipoEdad VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (nnaFechaNac VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (etapa VARCHAR2(20))",
        "ALTER TABLE casos_sustracion ADD (tipoSolicitud VARCHAR2(50))",
        "ALTER TABLE casos_sustracion ADD (acPeru VARCHAR2(20))",
        "ALTER TABLE casos_sustracion ADD (solicitanteSexo VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (solicitanteCorreo VARCHAR2(200))",
        "ALTER TABLE casos_sustracion ADD (requeridoSexo VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (requeridoTelefono VARCHAR2(50))",
        "ALTER TABLE casos_sustracion ADD (requeridoCorreo VARCHAR2(200))",
        "ALTER TABLE casos_sustracion ADD (fechaEntrevista VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (resultadoEntrevista VARCHAR2(20))",
        "ALTER TABLE casos_sustracion ADD (fechaDemanda VARCHAR2(10))",
        "ALTER TABLE casos_sustracion ADD (numExpedienteJudicial VARCHAR2(100))",
        "ALTER TABLE casos_sustracion ADD (juzgado VARCHAR2(300))",
        "ALTER TABLE casos_sustracion ADD (sentencia1ra VARCHAR2(300))",
        "ALTER TABLE casos_sustracion ADD (sentencia2da VARCHAR2(300))",
        "ALTER TABLE casos_sustracion ADD (casacion VARCHAR2(300))",
        "ALTER TABLE casos_sustracion ADD (solicitanteNombre VARCHAR2(300))",
        "ALTER TABLE casos_sustracion ADD (solicitanteTelefono VARCHAR2(50))",
        "ALTER TABLE casos_sustracion ADD (solicitanteDomicilio VARCHAR2(500))",
        "ALTER TABLE casos_sustracion ADD (requeridoNombre VARCHAR2(300))",
        "ALTER TABLE casos_sustracion ADD (requeridoDomicilio VARCHAR2(500))",
        "ALTER TABLE casos_sustracion ADD (motivoCierre VARCHAR2(200))",
        "ALTER TABLE casos_sustracion ADD (observaciones VARCHAR2(1000))",
        "ALTER TABLE casos_sustracion ADD (creadoPor VARCHAR2(200))",
        "ALTER TABLE casos_sustracion ADD (retorno VARCHAR2(20))",
        "ALTER TABLE casos_sustracion ADD (estadoJudicial VARCHAR2(100))",
        "ALTER TABLE bitacora_sustracion ADD (creadoPor VARCHAR2(200))",
        "ALTER TABLE historial_judicial ADD (creadoPor VARCHAR2(200))",
        # revisores — tabla nueva
        """CREATE TABLE revisores (
            id        VARCHAR2(36)  PRIMARY KEY,
            nombre    VARCHAR2(200) NOT NULL,
            activo    NUMBER(1)     DEFAULT 1 NOT NULL,
            createdat TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        )""",
        "INSERT INTO revisores (id, nombre, activo) VALUES (sys_guid(), 'Luis Monteaguado', 1)",
        "INSERT INTO revisores (id, nombre, activo) VALUES (sys_guid(), 'Norma Sánchez', 1)",
    ]

    with engine.connect() as conn:
        for sql in migraciones:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"[migration] OK: {sql[:60]}...")
            except Exception as e:
                err = str(e)
                # ORA-01430 = column already exists
                if "01430" in err or "already exists" in err.lower() or "ORA-00955" in err or "00955" in err:
                    print(f"[migration] ya existe, omitido.")
                else:
                    print(f"[migration] ERROR inesperado: {e}")
                    traceback.print_exc()

run_migrations()

app = FastAPI(
    title="Sistema de Apelaciones DGNNA",
    description="API REST para gestión de apelaciones - DGNNA / MIMP",
    version="1.0.0",
)

# ─── CORS: permite que el frontend Next.js se conecte ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(abogados.router)
app.include_router(complejidad.router)
app.include_router(extension.router)
app.include_router(apelaciones.router)
app.include_router(usuarios.router)
app.include_router(dashboard.router)
app.include_router(reportes.router)
app.include_router(sala_reuniones.router)
app.include_router(sustracion.router)
app.include_router(revisores.router)
app.include_router(proyectos_ley.router)
app.include_router(transparencia.router)
app.include_router(apelantes.router)


@app.get("/")
def root():
    return {
        "sistema": "Apelaciones DGNNA",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
