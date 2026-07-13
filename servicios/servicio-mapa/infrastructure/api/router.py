"""
Router: Módulo Mapa Interactivo
Cobertura territorial de instituciones (UPE, CAR, DEMUNA, etc.)
sobre el catálogo UBIGEO del INEI.
"""
import os
from typing import List, Optional

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.models import MapaUbigeo, MapaInstitucion, MapaCobertura

router = APIRouter(prefix="/api/mapa", tags=["mapa"])

SECRET_KEY = os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026")


def _usuario_actual(request: Request) -> Optional[str]:
    """Extrae el nombre de usuario del token Bearer (si existe)."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    try:
        payload = pyjwt.decode(auth[7:], SECRET_KEY, algorithms=["HS256"])
        return payload.get("nombre") or payload.get("sub")
    except Exception:
        return None


# ── Schemas ───────────────────────────────────────────────────────

class InstitucionIn(BaseModel):
    nombre:       str
    tipo:         str = "UPE"
    direccion:    Optional[str] = None
    departamento: Optional[str] = None
    telefono:     Optional[str] = None
    horario:      Optional[str] = None
    lat:          Optional[float] = None
    lng:          Optional[float] = None
    estado:       str = "activo"
    acreditacion: Optional[str] = None
    cobertura:    List[str] = Field(default_factory=list)  # códigos ubigeo distrito


# ── Catálogo UBIGEO ──────────────────────────────────────────────

@router.get("/ubigeo/departamentos")
def departamentos(db: Session = Depends(get_db)):
    filas = (db.query(MapaUbigeo)
               .filter(MapaUbigeo.provincia == "00")
               .order_by(MapaUbigeo.nombre).all())
    return [{"codigo": f.departamento, "nombre": f.nombre} for f in filas]


@router.get("/ubigeo/provincias")
def provincias(dep: str = Query(..., min_length=2, max_length=2),
               db: Session = Depends(get_db)):
    filas = (db.query(MapaUbigeo)
               .filter(MapaUbigeo.departamento == dep,
                       MapaUbigeo.provincia != "00",
                       MapaUbigeo.distrito == "00")
               .order_by(MapaUbigeo.nombre).all())
    return [{"codigo": f.provincia, "nombre": f.nombre} for f in filas]


@router.get("/ubigeo/distritos")
def distritos(dep: str = Query(..., min_length=2, max_length=2),
              prov: Optional[str] = Query(None, min_length=2, max_length=2),
              db: Session = Depends(get_db)):
    q = (db.query(MapaUbigeo)
           .filter(MapaUbigeo.departamento == dep, MapaUbigeo.distrito != "00"))
    if prov:
        q = q.filter(MapaUbigeo.provincia == prov)
    return [{"codigo": f.codigo, "provincia": f.provincia, "nombre": f.nombre}
            for f in q.order_by(MapaUbigeo.codigo).all()]


@router.get("/ubigeo/buscar")
def buscar_distrito(q: str = Query(..., min_length=2),
                    db: Session = Depends(get_db)):
    """Autocompletado: busca distritos por nombre (máx. 12 resultados)."""
    like = f"%{q.strip().lower()}%"
    filas = (db.query(MapaUbigeo)
               .filter(MapaUbigeo.distrito != "00",
                       func.lower(MapaUbigeo.nombre).like(like))
               .order_by(MapaUbigeo.nombre).limit(12).all())
    out = []
    for f in filas:
        dep = (db.query(MapaUbigeo)
                 .filter_by(departamento=f.departamento, provincia="00", distrito="00").first())
        prov = (db.query(MapaUbigeo)
                  .filter_by(departamento=f.departamento, provincia=f.provincia, distrito="00").first())
        out.append({
            "codigo": f.codigo, "nombre": f.nombre,
            "dep": f.departamento, "prov": f.provincia,
            "depNombre": dep.nombre if dep else "",
            "provNombre": prov.nombre if prov else "",
        })
    return out


# ── Tipos de institución ─────────────────────────────────────────

@router.get("/tipos")
def tipos(db: Session = Depends(get_db)):
    filas = (db.query(MapaInstitucion.tipo)
               .distinct().order_by(MapaInstitucion.tipo).all())
    return [f[0] for f in filas]


# ── Instituciones (mantenedor) ───────────────────────────────────

@router.get("/instituciones")
def listar_instituciones(tipo: Optional[str] = None,
                         db: Session = Depends(get_db)):
    q = db.query(
            MapaInstitucion,
            func.count(MapaCobertura.id).label("nDistritos"),
        ).outerjoin(MapaCobertura).group_by(MapaInstitucion)
    if tipo:
        q = q.filter(MapaInstitucion.tipo == tipo)
    out = []
    for inst, n in q.order_by(MapaInstitucion.tipo, MapaInstitucion.nombre).all():
        out.append({
            "id": inst.id, "nombre": inst.nombre, "tipo": inst.tipo,
            "direccion": inst.direccion, "departamento": inst.departamento,
            "telefono": inst.telefono, "horario": inst.horario,
            "lat": inst.lat, "lng": inst.lng, "estado": inst.estado,
            "acreditacion": inst.acreditacion, "nDistritos": n,
        })
    return out


@router.get("/instituciones/{inst_id}")
def obtener_institucion(inst_id: str, db: Session = Depends(get_db)):
    inst = db.get(MapaInstitucion, inst_id)
    if not inst:
        raise HTTPException(404, "Institución no encontrada")
    return {
        "id": inst.id, "nombre": inst.nombre, "tipo": inst.tipo,
        "direccion": inst.direccion, "departamento": inst.departamento,
        "telefono": inst.telefono, "horario": inst.horario,
        "lat": inst.lat, "lng": inst.lng, "estado": inst.estado,
        "acreditacion": inst.acreditacion,
        "cobertura": [c.ubigeo for c in inst.cobertura],
    }


def _validar_cobertura(db: Session, ubigeos: List[str]) -> List[str]:
    """Valida que todos los códigos existan como distritos; devuelve la lista sin duplicados."""
    unicos = sorted(set(ubigeos))
    if not unicos:
        return []
    validos = {c[0] for c in
               db.query(MapaUbigeo.codigo)
                 .filter(MapaUbigeo.codigo.in_(unicos),
                         MapaUbigeo.distrito != "00").all()}
    malos = [u for u in unicos if u not in validos]
    if malos:
        raise HTTPException(400, f"Códigos ubigeo inválidos: {', '.join(malos[:10])}")
    return unicos


@router.post("/instituciones", status_code=201)
def crear_institucion(datos: InstitucionIn, request: Request,
                      db: Session = Depends(get_db)):
    cobertura = _validar_cobertura(db, datos.cobertura)
    inst = MapaInstitucion(
        nombre=datos.nombre.strip(), tipo=datos.tipo.strip(),
        direccion=datos.direccion, departamento=datos.departamento,
        telefono=datos.telefono, horario=datos.horario,
        lat=datos.lat, lng=datos.lng, estado=datos.estado,
        acreditacion=datos.acreditacion,
        creadoPor=_usuario_actual(request),
    )
    db.add(inst)
    db.flush()
    for u in cobertura:
        db.add(MapaCobertura(institucionId=inst.id, ubigeo=u))
    db.commit()
    return {"id": inst.id, "mensaje": "Institución creada"}


@router.put("/instituciones/{inst_id}")
def actualizar_institucion(inst_id: str, datos: InstitucionIn,
                           db: Session = Depends(get_db)):
    inst = db.get(MapaInstitucion, inst_id)
    if not inst:
        raise HTTPException(404, "Institución no encontrada")
    cobertura = _validar_cobertura(db, datos.cobertura)

    inst.nombre       = datos.nombre.strip()
    inst.tipo         = datos.tipo.strip()
    inst.direccion    = datos.direccion
    inst.departamento = datos.departamento
    inst.telefono     = datos.telefono
    inst.horario      = datos.horario
    inst.lat          = datos.lat
    inst.lng          = datos.lng
    inst.estado       = datos.estado
    inst.acreditacion = datos.acreditacion

    db.query(MapaCobertura).filter(MapaCobertura.institucionId == inst_id).delete()
    for u in cobertura:
        db.add(MapaCobertura(institucionId=inst_id, ubigeo=u))
    db.commit()
    return {"id": inst_id, "mensaje": "Institución actualizada"}


@router.delete("/instituciones/{inst_id}")
def eliminar_institucion(inst_id: str, db: Session = Depends(get_db)):
    inst = db.get(MapaInstitucion, inst_id)
    if not inst:
        raise HTTPException(404, "Institución no encontrada")
    db.delete(inst)
    db.commit()
    return {"mensaje": "Institución eliminada"}


# ── Cobertura consolidada (para pintar el mapa) ──────────────────

@router.get("/cobertura")
def cobertura(tipo: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Devuelve todo lo necesario para el mapa en una sola llamada:
    - instituciones activas (con sede lat/lng)
    - distritos: { ubigeo: [índices de institución que lo cubren] }
    - totalesDep / totalesProv: nº total de distritos por departamento (DD)
      y por provincia (DDPP), para calcular porcentajes de cobertura
    """
    q = db.query(MapaInstitucion).filter(MapaInstitucion.estado == "activo")
    if tipo:
        q = q.filter(MapaInstitucion.tipo == tipo)
    insts = q.order_by(MapaInstitucion.nombre).all()
    idx = {inst.id: i for i, inst in enumerate(insts)}

    distritos: dict = {}
    if insts:
        # JOIN en lugar de IN(...) — Oracle limita IN a 1000 elementos
        qc = (db.query(MapaCobertura.ubigeo, MapaCobertura.institucionId)
                .join(MapaInstitucion, MapaCobertura.institucionId == MapaInstitucion.id)
                .filter(MapaInstitucion.estado == "activo"))
        if tipo:
            qc = qc.filter(MapaInstitucion.tipo == tipo)
        for ubi, iid in qc.all():
            if iid in idx:
                distritos.setdefault(ubi, []).append(idx[iid])

    totales_dep: dict = {}
    totales_prov: dict = {}
    for dep_c, prov_c, n in (db.query(MapaUbigeo.departamento, MapaUbigeo.provincia,
                                      func.count(MapaUbigeo.codigo))
                               .filter(MapaUbigeo.distrito != "00")
                               .group_by(MapaUbigeo.departamento, MapaUbigeo.provincia).all()):
        totales_dep[dep_c] = totales_dep.get(dep_c, 0) + n
        totales_prov[dep_c + prov_c] = n

    return {
        "totalesDep": totales_dep,
        "totalesProv": totales_prov,
        "instituciones": [{
            "id": i.id, "nombre": i.nombre, "tipo": i.tipo,
            "direccion": i.direccion, "telefono": i.telefono,
            "horario": i.horario, "lat": i.lat, "lng": i.lng,
            "acreditacion": i.acreditacion,
        } for i in insts],
        "distritos": distritos,
    }
