"""
API Gateway — Sistema de Apelaciones DGNNA
Puerto: 8000

Punto de entrada único para el frontend.
Redirige cada request al microservicio correcto y valida JWT.
"""
import os
import httpx
import jwt as pyjwt

from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

load_dotenv()

# ── Configuración de microservicios ───────────────────────────────
SERVICES = {
    "auth":            os.getenv("AUTH_SERVICE_URL",            "http://localhost:8001"),
    "apelaciones":     os.getenv("APELACIONES_SERVICE_URL",     "http://localhost:8002"),
    "sustracion":      os.getenv("SUSTRACION_SERVICE_URL",      "http://localhost:8003"),
    "sala":            os.getenv("SALA_SERVICE_URL",            "http://localhost:8004"),
    "proyectos-ley":   os.getenv("PROYECTOS_LEY_SERVICE_URL",   "http://localhost:8005"),
    "transparencia":   os.getenv("TRANSPARENCIA_SERVICE_URL",   "http://localhost:8006"),
}

SECRET_KEY = os.getenv("SESSION_SECRET", "auth-service-secret-2026")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ── Rutas públicas (sin autenticación) ───────────────────────────
PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/api/auth/login", "/api/auth/logout"}

# ── Mapeo prefijo → servicio ──────────────────────────────────────
ROUTE_MAP = [
    ("/api/auth",           "auth"),
    ("/api/usuarios",       "auth"),
    ("/api/apelaciones",    "apelaciones"),
    ("/api/apelantes",      "apelaciones"),
    ("/api/nna",            "apelaciones"),
    ("/api/abogados",       "apelaciones"),
    ("/api/complejidad",    "apelaciones"),
    ("/api/extension",      "apelaciones"),
    ("/api/dashboard",      "apelaciones"),
    ("/api/reportes",       "apelaciones"),
    ("/api/procedencia",    "apelaciones"),
    ("/api/revisores",      "apelaciones"),
    ("/api/sustracion",     "sustracion"),
    ("/api/sala-reuniones", "sala"),
    ("/api/proyectos-ley",  "proyectos-ley"),
    ("/api/transparencia",  "transparencia"),
]

app = FastAPI(
    title="API Gateway — DGNNA",
    description="Punto de entrada único. Redirige al microservicio correspondiente.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health y raíz ─────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "sistema":  "API Gateway — DGNNA",
        "version":  "2.0.0",
        "servicios": {k: f"{v}/health" for k, v in SERVICES.items()},
    }


@app.get("/health")
async def health():
    """Verifica el estado de todos los microservicios."""
    estados = {}
    async with httpx.AsyncClient(timeout=3) as client:
        for nombre, url in SERVICES.items():
            try:
                r = await client.get(f"{url}/health")
                estados[nombre] = "ok" if r.status_code == 200 else "error"
            except Exception:
                estados[nombre] = "caído"
    return {"gateway": "ok", "servicios": estados}


# ── Proxy principal ───────────────────────────────────────────────

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy(request: Request, path: str):
    full_path = f"/{path}"

    # Validar JWT en rutas protegidas
    if full_path not in PUBLIC_PATHS:
        token = _extraer_token(request)
        if not token or not _verificar_token(token):
            raise HTTPException(status_code=401, detail="Sesión inválida o expirada")

    # Determinar microservicio destino
    servicio_url = _resolver_servicio(full_path)
    if not servicio_url:
        raise HTTPException(status_code=404, detail=f"Ruta no encontrada: {full_path}")

    # Reenviar request al microservicio
    return await _forward(request, servicio_url, full_path)


# ── Helpers ───────────────────────────────────────────────────────

def _resolver_servicio(path: str) -> str | None:
    for prefijo, nombre in ROUTE_MAP:
        if path.startswith(prefijo):
            return SERVICES[nombre]
    return None


def _extraer_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def _verificar_token(token: str) -> bool:
    try:
        pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return True
    except pyjwt.PyJWTError:
        return False


async def _forward(request: Request, base_url: str, path: str) -> Response:
    url = f"{base_url}{path}"
    if request.query_params:
        url += f"?{request.query_params}"

    headers = dict(request.headers)
    headers.pop("host", None)  # evitar conflictos de host

    body = await request.body()

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.request(
                method  = request.method,
                url     = url,
                headers = headers,
                content = body,
            )
            return Response(
                content     = resp.content,
                status_code = resp.status_code,
                headers     = dict(resp.headers),
                media_type  = resp.headers.get("content-type"),
            )
        except httpx.ConnectError:
            servicio = _resolver_servicio(path)
            raise HTTPException(
                status_code=503,
                detail=f"Servicio no disponible. Verifica que esté corriendo en {base_url}"
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="El servicio tardó demasiado en responder")
