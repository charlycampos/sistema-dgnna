"""
Router API: Suite Analítica Situación DSLD
Endpoints de métricas, filtros de padrones, orígenes de datos y sincronización masiva con limpieza automática en Python.
Soporta lectura nativa de bases de datos Microsoft Access (.accdb / .mdb) y hojas Excel (.xlsx / .xls).
"""

import os
import glob
import tempfile
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db import dsld_demuna_repo as demuna_repo
from infrastructure.db import dsld_modo_ninez_repo as modo_ninez_repo
from infrastructure.db import dsld_pias_repo as pias_repo
from infrastructure.db import dsld_capacitacion_repo as capacitacion_repo
from infrastructure.db import dsld_cconna_repo as cconna_repo
from infrastructure.db.dsld_demuna_repo import CargaError

router = APIRouter(prefix="/api/gestion-datos/dsld", tags=["gestion-datos-dsld"])


# ─── DEFINICIÓN DE ORÍGENES DE DATOS PREDETERMINADOS ─────────────────────────

ORIGENES_CONFIG = [
    {
        "id": "access_dsld",
        "nombre": "Base de Datos Principal DSLD (Microsoft Access)",
        "tablas": "dna, supervisadas, ubigeo, estadodna, modelodna, supervisores, población INEI",
        "tipo": "Microsoft Access (.mdb / .accdb)",
        "rutaDefault": os.getenv("DSLD_RUTA_DNA_MDB", r"Z:\Base de Datos\DNA.mdb"),
        "ejesImpactados": ["Situación DEMUNA", "Supervisión DEMUNA", "Directorio"],
        "ultimaSincronizacion": None,
        "estado": "ACTIVO",
    },
    {
        "id": "capacitacion",
        "nombre": "Capacitación a Defensores y Operadores",
        "tablas": "TB_CAPA_DEMUNA (CAPACITACION_20214-2026 NOMINAL.xlsx)",
        "tipo": "Excel (.xlsx)",
        "rutaDefault": os.getenv("DSLD_RUTA_CAPACITACION", r"W:\DEMUNA\CAPACITACION_20214-2026 NOMINAL.xlsx"),
        "ejesImpactados": ["Capacitación DEMUNA"],
        "ultimaSincronizacion": None,
        "estado": "ACTIVO",
    },
    {
        "id": "cconna",
        "nombre": "Consejos Consultivos NNA (CCONNA)",
        "tablas": "BD ORGANIZACIONAL (Tabla1) y BD NOMINAL (Tabla5) del Excel 'CCONNA nominal'",
        "tipo": "Excel (.xlsx)",
        "rutaDefault": os.getenv("DSLD_RUTA_CCONNA", r"X:\CCONNA"),
        "ejesImpactados": ["CCONNA"],
        "ultimaSincronizacion": None,
        "estado": "ACTIVO",
    },
    {
        "id": "modo_ninez",
        "nombre": "Ponte en Modo Niñez (Adhesión)",
        "tablas": "TB_MODO_NINEZ_2026 (MATRIZ DE REPORTE PBI 2026.xlsx)",
        "tipo": "Excel (.xlsx)",
        "rutaDefault": os.getenv("DSLD_RUTA_MODO_NINEZ", r"X:\MODO_NIÑEZ\MATRIZ DE REPORTE PBI 2026.xlsx"),
        "ejesImpactados": ["Ponte en Modo Niñez"],
        "ultimaSincronizacion": None,
        "estado": "ACTIVO",
    },
    {
        "id": "pias",
        "nombre": "PIAS (Atenciones en Cuencas Fluviales)",
        "tablas": "TB_PIAS_AUTORIDADES, TB_PIAS_PADRES, TB_PIAS_NNA (PIAS_PBI_AUTORIDADES_PADRES.xlsx)",
        "tipo": "Excel (.xlsx)",
        "rutaDefault": os.getenv("DSLD_RUTA_PIAS", r"X:\PIAS\PIAS_PBI_AUTORIDADES_PADRES.xlsx"),
        "ejesImpactados": ["PIAS"],
        "ultimaSincronizacion": None,
        "estado": "ACTIVO",
    },
]


# ─── HELPERS COMUNES ────────────────────────────────────────────────────────

ORIGENES_ACCESS = {"access_dsld", "demuna", "supervision"}
EXT_ACCESS = (".mdb", ".accdb")
EXT_EXCEL = (".xlsx", ".xlsm")

# origen del gestor → código en DSLD_CARGAS (ejes ya migrados al esquema v2)
ORIGEN_CARGA = {
    "access_dsld": demuna_repo.ORIGEN_ACCESS,
    "modo_ninez": modo_ninez_repo.ORIGEN_MODO_NINEZ,
    "pias": pias_repo.ORIGEN_PIAS,
    "capacitacion": capacitacion_repo.ORIGEN_CAPACITACION,
    "cconna": cconna_repo.ORIGEN_CCONNA,
}


def _usuario_desde_request(request: Request) -> Optional[str]:
    """Obtiene el usuario del JWT reenviado por el API Gateway (ya validado allí)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    secreto = os.getenv("SESSION_SECRET")
    if not secreto:
        return None
    try:
        import jwt as pyjwt
        datos = pyjwt.decode(auth[7:], secreto, algorithms=["HS256"])
    except Exception:
        return None
    for clave in ("email", "correo", "username", "usuario", "sub"):
        if datos.get(clave):
            return str(datos[clave])
    return None


def _resolver_archivo(ruta: str, extensiones: tuple) -> Optional[str]:
    """Si la ruta es carpeta, devuelve el archivo más reciente con esas extensiones (ignora temporales ~$)."""
    if os.path.isfile(ruta):
        return ruta
    if os.path.isdir(ruta):
        candidatos = [
            f for f in glob.glob(os.path.join(ruta, "*.*"))
            if f.lower().endswith(extensiones) and not os.path.basename(f).startswith("~$")
        ]
        if candidatos:
            return max(candidatos, key=os.path.getmtime)
    return None


def _resolver_archivo_access(ruta: str) -> Optional[str]:
    return _resolver_archivo(ruta, EXT_ACCESS)


async def _guardar_temporal(archivo: UploadFile, ext: str) -> str:
    """Copia el archivo subido a un temporal por bloques (el llamador debe borrarlo)."""
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        while True:
            bloque = await archivo.read(1024 * 1024)
            if not bloque:
                break
            tmp.write(bloque)
        return tmp.name


def _con_carga(funcion, db: Session, ruta: str, nombre: str, usuario: Optional[str]) -> dict:
    try:
        return funcion(db, ruta, nombre, usuario)
    except CargaError as exc:
        raise HTTPException(status_code=exc.status, detail={"mensaje": str(exc), "cargaId": exc.carga_id})


def _mensaje_pias(nombre: str, r: dict) -> str:
    n = lambda v: f"{v:,}".replace(",", " ")  # noqa: E731
    msg = (
        f"'{nombre}' importado: {n(r['atenciones'])} atenciones PIAS ({n(r['nna'])} NNA, "
        f"{n(r['padres'])} madres/padres, {n(r['autoridades'])} autoridades); "
        f"última atención {r['ultimaFecha']}."
    )
    if r.get("advertencias"):
        msg += " Observaciones: " + " ".join(r["advertencias"])
    return msg


def _mensaje_modo_ninez(nombre: str, r: dict) -> str:
    msg = (
        f"'{nombre}' importado: {r['adheridos']} gobiernos en Modo Niñez "
        f"({r['regionales']} regionales, {r['provinciales']} provinciales, {r['distritales']} distritales); "
        f"{r['presentaronReporte']} presentaron reporte."
    )
    if r.get("advertencias"):
        msg += " Observaciones: " + " ".join(r["advertencias"])
    return msg


def _mensaje_capacitacion(nombre: str, r: dict) -> str:
    n = lambda v: f"{v:,}".replace(",", " ")  # noqa: E731
    msg = (
        f"'{nombre}' importado: {n(r['registros'])} registros; {n(r['aprobados'])} participaciones aprobadas "
        f"({n(r['virtual'])} virtuales, {n(r['presencial'])} presenciales) de {n(r['personasDistintas'])} personas "
        f"distintas; último curso iniciado el {r['ultimaFecha']}. El DNI no se guardó."
    )
    if r.get("advertencias"):
        msg += " Observaciones: " + " ".join(r["advertencias"])
    return msg


def _mensaje_cconna(nombre: str, r: dict) -> str:
    n = lambda v: f"{v:,}".replace(",", " ")  # noqa: E731
    msg = (
        f"'{nombre}' importado: {n(r['organizaciones'])} CCONNA ({r['distritales']} distritales, "
        f"{r['provinciales']} provinciales, {r['regionales']} regionales) y {n(r['integrantes'])} "
        f"integrantes NNA ({n(r['mujeres'])} mujeres, {n(r['hombres'])} hombres). "
        f"Los integrantes se guardaron solo como conteos."
    )
    if r.get("advertencias"):
        msg += " Observaciones: " + " ".join(r["advertencias"])
    return msg


# Ejes cargados desde Excel: origen → configuración
EJES_EXCEL = {
    "modo_ninez": {
        "importar": modo_ninez_repo.importar_modo_ninez,
        "mensaje": _mensaje_modo_ninez,
        "registros": "gobiernos",
        "descripcion": "el Excel 'MATRIZ DE REPORTE PBI' (.xlsx) con la tabla TB_MODO_NINEZ_2026",
    },
    "capacitacion": {
        "importar": capacitacion_repo.importar_capacitacion,
        "mensaje": _mensaje_capacitacion,
        "registros": "registros",
        "descripcion": "el Excel 'CAPACITACION ... NOMINAL' (.xlsx) con la tabla TB_CAPA_DEMUNA",
    },
    "cconna": {
        "importar": cconna_repo.importar_cconna,
        "mensaje": _mensaje_cconna,
        "registros": "organizaciones",
        "descripcion": "el Excel 'CCONNA nominal' (.xlsx) con las hojas 'BD ORGANIZACIONAL' (Tabla1) y 'BD NOMINAL' (Tabla5)",
    },
    "pias": {
        "importar": pias_repo.importar_pias,
        "mensaje": _mensaje_pias,
        "registros": "atenciones",
        "descripcion": "el Excel 'PIAS_PBI_AUTORIDADES_PADRES' (.xlsx) con las tablas TB_PIAS_AUTORIDADES, TB_PIAS_PADRES y TB_PIAS_NNA",
    },
}
ALIAS_EJE = {"modo_niñez": "modo_ninez", "capacitacion_demuna": "capacitacion"}


def _importar_access(db: Session, ruta: str, nombre: str, usuario: Optional[str]) -> dict:
    try:
        return demuna_repo.importar_dna(db, ruta, nombre, usuario)
    except CargaError as exc:
        raise HTTPException(status_code=exc.status, detail={"mensaje": str(exc), "cargaId": exc.carga_id})


# ─── 1. RESUMEN EJECUTIVO & KPIS CONSOLIDADOS ────────────────────────────────

@router.get("/resumen")
def obtener_resumen_dsld(
    departamento: Optional[str] = Query(None, description="Departamento analítico (LIMA METROPOLITANA, GORE LIMA, ...)"),
    provincia: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """KPIs de la DSLD. DEMUNA y Supervisión salen de DNA.mdb (esquema v2) con las reglas del Power BI."""
    demuna = demuna_repo.resumen_demuna(db, departamento, provincia)

    return {
        **demuna,
        "rankingDepartamental": demuna_repo.ranking_departamentos(db),
        "capacitacion": capacitacion_repo.resumen_capacitacion(db, departamento, provincia),
        "cconna": cconna_repo.resumen_cconna(db, departamento, provincia),
        "modoNinez": modo_ninez_repo.resumen_modo_ninez(db, departamento, provincia),
        "pias": pias_repo.resumen_pias(db, departamento, provincia),
    }


@router.get("/supervision/departamentos")
def supervision_por_departamento(
    anios: Optional[str] = Query(None, description="Años separados por coma; por defecto los 3 últimos"),
    db: Session = Depends(get_db)
):
    """Supervisiones por departamento analítico y año (gráfico comparativo)."""
    if anios:
        try:
            lista = sorted({int(a) for a in anios.split(",") if a.strip()})
        except ValueError:
            raise HTTPException(400, "El parámetro 'anios' debe ser una lista de años, por ejemplo 2024,2025,2026.")
    else:
        hist = demuna_repo.resumen_demuna(db)["supervision"]["historico"]
        ultimo = max(hist) if hist else datetime.now().year
        lista = [ultimo - 2, ultimo - 1, ultimo]
    return {"anios": lista, "departamentos": demuna_repo.supervisiones_por_departamento(db, lista)}


@router.get("/catalogo-geografico")
def catalogo_geografico(db: Session = Depends(get_db)):
    """Departamentos analíticos y sus provincias (solo donde hay DEMUNA) para los filtros."""
    return demuna_repo.catalogo_geografico(db)


@router.get("/cargas")
def historial_cargas(
    origen: Optional[str] = Query(None),
    limite: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Historial de importaciones (DSLD_CARGAS)."""
    return {"cargas": demuna_repo.listar_cargas(db, origen, limite)}


# ─── 2. LISTADO DE ORÍGENES DE DATOS & RUTAS ─────────────────────────────────

@router.get("/origenes")
def listar_origenes_datos(db: Session = Depends(get_db)):
    """Retorna los orígenes de datos con su ruta y la última carga exitosa registrada."""
    salida = []
    for o in ORIGENES_CONFIG:
        item = dict(o)
        if o["id"] in ORIGEN_CARGA:
            carga = demuna_repo.ultima_carga_exitosa(db, ORIGEN_CARGA[o["id"]])
            item["ultimaSincronizacion"] = carga["fechaFin"] if carga else None
            item["registros"] = carga["registrosCargados"] if carga else None
            item["ultimaCarga"] = carga
        salida.append(item)
    return {"origenes": salida}


# ─── 3. SINCRONIZACIÓN Y LIMPIEZA POR RUTA / ARCHIVO ──────────────────────────

class SincronizarRutaRequest(BaseModel):
    origenId: str
    ruta: Optional[str] = None


@router.post("/sincronizar-ruta")
def sincronizar_desde_ruta(
    req: SincronizarRutaRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Lee el archivo o carpeta de red indicado en la ruta,
    valida la información y reemplaza los datos del eje correspondiente.
    """
    origen_id = req.origenId
    ruta = req.ruta or ""
    
    cfg = next((o for o in ORIGENES_CONFIG if o["id"] == origen_id), None)
    if not cfg:
        raise HTTPException(404, f"Origen de datos no encontrado: {origen_id}")

    target_path = ruta.strip() if ruta and ruta.strip() else cfg["rutaDefault"]

    if origen_id in ORIGENES_ACCESS:
        archivo = _resolver_archivo_access(target_path)
        if not archivo:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró la base Access en '{target_path}' dentro del servidor. "
                       f"Verifique que la unidad de red esté montada en el contenedor.",
            )
        resumen = _importar_access(db, archivo, archivo, _usuario_desde_request(request))
        return {
            "ok": True,
            "estado": "sincronizado",
            "origenId": origen_id,
            "ruta": target_path,
            "archivo": archivo,
            "registrosProcesados": resumen["demunas"] + resumen["supervisiones"],
            "ultimaSincronizacion": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "resumen": resumen,
            "mensaje": (
                f"Sincronizado desde '{archivo}': {resumen['demunas']} DEMUNA "
                f"({resumen['acreditadas']} acreditadas) y {resumen['supervisiones']} supervisiones."
            ),
        }
    
    eje = ALIAS_EJE.get(origen_id, origen_id)
    if eje in EJES_EXCEL:
        cfg_eje = EJES_EXCEL[eje]
        archivo = _resolver_archivo(target_path, EXT_EXCEL)
        if not archivo:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró {cfg_eje['descripcion']} en '{target_path}' dentro del servidor. "
                       f"Verifique que la unidad de red esté montada en el contenedor.",
            )
        resumen = _con_carga(cfg_eje["importar"], db, archivo, archivo, _usuario_desde_request(request))
        return {
            "ok": True,
            "estado": "sincronizado",
            "origenId": eje,
            "ruta": target_path,
            "archivo": archivo,
            "registrosProcesados": resumen[cfg_eje["registros"]],
            "ultimaSincronizacion": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "resumen": resumen,
            "mensaje": cfg_eje["mensaje"](archivo, resumen),
        }

    raise HTTPException(400, f"Origen de datos no soportado para sincronización: {origen_id}")


@router.post("/importar", status_code=201)
async def importar_dataset_dsld(
    request: Request,
    tipoEje: str = Form(..., description="access_dsld | capacitacion | cconna | modo_ninez | pias"),
    archivo: UploadFile = File(...),
    reemplazar: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Recibe la base Access DNA.mdb o el Excel del eje indicado, valida su contenido
    y reemplaza los datos de ese eje (sin guardar datos personales).
    """
    filename = (archivo.filename or "").lower()

    if tipoEje in ORIGENES_ACCESS:
        if not filename.endswith(EXT_ACCESS):
            raise HTTPException(400, "Para DEMUNA y Supervisión suba la base Access DNA.mdb (.mdb o .accdb).")
        tmp_path = await _guardar_temporal(archivo, os.path.splitext(filename)[1])
        try:
            resumen = _importar_access(db, tmp_path, archivo.filename, _usuario_desde_request(request))
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return {
            "ok": True,
            "tipoEje": "access_dsld",
            "registrosProcesados": resumen["demunas"] + resumen["supervisiones"],
            "resumen": resumen,
            "mensaje": (
                f"'{archivo.filename}' importado: {resumen['demunas']} DEMUNA "
                f"({resumen['acreditadas']} acreditadas, {resumen['noAcreditadas']} no acreditadas, "
                f"{resumen['noOperativas']} no operativas) y {resumen['supervisiones']} supervisiones."
            ),
        }

    eje = ALIAS_EJE.get(tipoEje, tipoEje)
    if eje in EJES_EXCEL:
        cfg_eje = EJES_EXCEL[eje]
        if not filename.endswith(EXT_EXCEL):
            raise HTTPException(400, f"Para este origen suba {cfg_eje['descripcion']}.")
        tmp_path = await _guardar_temporal(archivo, os.path.splitext(filename)[1])
        try:
            resumen = _con_carga(cfg_eje["importar"], db, tmp_path, archivo.filename, _usuario_desde_request(request))
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return {
            "ok": True,
            "tipoEje": eje,
            "registrosProcesados": resumen[cfg_eje["registros"]],
            "resumen": resumen,
            "mensaje": cfg_eje["mensaje"](archivo.filename, resumen),
        }

    raise HTTPException(400, f"Tipo de eje no soportado: {tipoEje}")


# ─── 4. PADRÓN OFICIAL DE DEMUNAS ───────────────────────────────────────────

@router.get("/demunas")
def listar_demunas(
    departamento: Optional[str] = Query(None, description="Departamento analítico"),
    provincia: Optional[str] = Query(None),
    estadoAcreditacion: Optional[str] = Query(None, description="ACREDITADA | NO ACREDITADA | NO OPERATIVA | OPERATIVA"),
    tipoGobierno: Optional[str] = Query(None, description="PROVINCIAL | DISTRITAL"),
    busqueda: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Padrón de DEMUNA municipales (esquema v2) filtrable, para el directorio y la exportación."""
    return demuna_repo.listar_demunas(
        db, departamento, provincia, estadoAcreditacion, tipoGobierno, busqueda, limit, offset
    )


# ─── 5. PONTE EN MODO NIÑEZ ─────────────────────────────────────────────────

@router.get("/modo-ninez/departamentos")
def modo_ninez_departamentos(db: Session = Depends(get_db)):
    """Gobiernos adheridos por departamento analítico y nivel (gráfico y exportación)."""
    return {"departamentos": modo_ninez_repo.modo_ninez_por_departamento(db)}


@router.get("/modo-ninez/gobiernos")
def modo_ninez_gobiernos(
    departamento: Optional[str] = Query(None, description="Departamento analítico"),
    provincia: Optional[str] = Query(None),
    nivel: Optional[str] = Query(None, description="REGIONAL | PROVINCIAL | DISTRITAL"),
    presento: Optional[bool] = Query(None, description="true: presentaron reporte; false: aún no"),
    busqueda: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Gobiernos adheridos a la estrategia (sin datos personales de autoridades)."""
    return modo_ninez_repo.listar_gobiernos(db, departamento, provincia, nivel, presento, busqueda, limit, offset)


# ─── 6. PIAS ────────────────────────────────────────────────────────────────

@router.get("/pias/resumen")
def pias_resumen(
    departamento: Optional[str] = Query(None, description="Departamento analítico"),
    provincia: Optional[str] = Query(None),
    anio: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Indicadores PIAS con filtro de año (el bloque 'pias' de /resumen usa todos los años)."""
    return pias_repo.resumen_pias(db, departamento, provincia, anio)


@router.get("/pias/distritos")
def pias_distritos(
    departamento: Optional[str] = Query(None, description="Departamento analítico"),
    provincia: Optional[str] = Query(None),
    anio: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Atenciones PIAS por distrito y cuenca (conteos, sin datos personales)."""
    return {"distritos": pias_repo.pias_por_distrito(db, departamento, provincia, anio)}


# ─── 7. CAPACITACIÓN ────────────────────────────────────────────────────────

@router.get("/capacitacion/resumen")
def capacitacion_resumen(
    departamento: Optional[str] = Query(None, description="Departamento analítico"),
    provincia: Optional[str] = Query(None),
    anio: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Indicadores de capacitación (solo aprobados) con filtro de año."""
    return capacitacion_repo.resumen_capacitacion(db, departamento, provincia, anio)


@router.get("/capacitacion/departamentos")
def capacitacion_departamentos(
    anio: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Participaciones, personas y DEMUNA capacitadas por departamento analítico."""
    return {"departamentos": capacitacion_repo.capacitacion_por_departamento(db, anio)}


# ─── 8. CCONNA ─────────────────────────────────────────────────────────────

@router.get("/cconna/departamentos")
def cconna_departamentos(db: Session = Depends(get_db)):
    """CCONNA conformados por departamento analítico y nivel."""
    return {"departamentos": cconna_repo.cconna_por_departamento(db)}


@router.get("/cconna/consejos")
def cconna_consejos(
    departamento: Optional[str] = Query(None, description="Departamento analítico"),
    provincia: Optional[str] = Query(None),
    nivel: Optional[str] = Query(None, description="DISTRITAL | PROVINCIAL | REGIONAL"),
    registroMimp: Optional[str] = Query(None, description="SI | NO | OBSERVADO"),
    busqueda: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Listado de CCONNA conformados (sin datos del especialista encargado)."""
    return cconna_repo.listar_cconna(db, departamento, provincia, nivel, registroMimp, busqueda, limit, offset)
