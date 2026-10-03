"""Router de abogados — adaptador HTTP."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.abogado_repository_impl import AbogadoRepositoryImpl
from infrastructure.api.schemas import AbogadoCreate, AbogadoUpdate, AbogadoOut, AbogadoUsuarioLink
from infrastructure.api.auth_context import current_identity, require_admin, require_catalog_manager, validate_abogado_user, validate_current_abogado
from domain.services.abogado_service import AbogadoService
from infrastructure.api.audit_client import registrar_auditoria

router = APIRouter(prefix="/api/abogados", tags=["abogados"])


def abogado_out(abogado) -> dict:
    return {
        "id": abogado.id,
        "nombre": abogado.nombre,
        "activo": abogado.activo,
        "usuarioId": abogado.usuarioId,
        "estadoVinculacion": "vinculado" if abogado.usuarioId else "sin_usuario",
        "createdAt": abogado.createdAt,
        "updatedAt": abogado.updatedAt,
    }


def get_service(db: Session = Depends(get_db)) -> AbogadoService:
    return AbogadoService(repo=AbogadoRepositoryImpl(db))


@router.get("", response_model=List[AbogadoOut])
def listar(
    soloActivos: bool = Query(False),
    service: AbogadoService = Depends(get_service),
    identity=Depends(current_identity),
):
    if any(p.get("modulo") == "apelaciones" and p.get("rolModulo") == "abogado" for p in identity.get("modulos", [])):
        validate_current_abogado(identity)
        try:
            return [abogado_out(service.obtener_por_usuario(identity["userId"]))]
        except ValueError as e:
            raise HTTPException(status_code=403, detail=str(e))
    return [abogado_out(a) for a in service.listar(solo_activos=soloActivos)]


@router.get("/me", response_model=AbogadoOut)
def obtener_actual(identity=Depends(current_identity), service: AbogadoService = Depends(get_service)):
    validate_current_abogado(identity)
    try:
        return abogado_out(service.obtener_por_usuario(identity["userId"]))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{id}", response_model=AbogadoOut)
def obtener(id: str, service: AbogadoService = Depends(get_service), identity=Depends(current_identity)):
    try:
        abogado = service.obtener(id)
        if any(p.get("modulo") == "apelaciones" and p.get("rolModulo") == "abogado" for p in identity.get("modulos", [])) and abogado.usuarioId != identity["userId"]:
            raise HTTPException(status_code=403, detail="No tiene acceso a este abogado")
        return abogado_out(abogado)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", response_model=AbogadoOut, status_code=201)
def crear(body: AbogadoCreate, service: AbogadoService = Depends(get_service), _=Depends(require_catalog_manager)):
    try:
        return abogado_out(service.crear(body.model_dump()))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=AbogadoOut)
def actualizar(id: str, body: AbogadoUpdate, service: AbogadoService = Depends(get_service), _=Depends(require_catalog_manager)):
    try:
        return abogado_out(service.actualizar(id, body.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: AbogadoService = Depends(get_service), _=Depends(require_catalog_manager)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{id}/usuario", response_model=AbogadoOut)
def vincular_usuario(id: str, body: AbogadoUsuarioLink, identity=Depends(require_admin), service: AbogadoService = Depends(get_service)):
    validate_abogado_user(body.usuarioId, identity["_token"])
    try:
        anterior = service.obtener(id).usuarioId
        actualizado = service.vincular_usuario(id, body.usuarioId)
        registrar_auditoria(
            modulo="apelaciones", tabla="abogados", registro_id=id,
            codigo_referencia=actualizado.nombre, accion="VINCULAR_USUARIO",
            campos_cambiados="usuarioId", valores_previos={"usuarioId": anterior},
            valores_nuevos={"usuarioId": body.usuarioId},
            usuario_id=identity.get("userId"), usuario_nombre=identity.get("nombre", "Administrador"),
            usuario_rol=identity.get("rol"),
        )
        return abogado_out(actualizado)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{id}/usuario", response_model=AbogadoOut)
def desvincular_usuario(id: str, _=Depends(require_admin), service: AbogadoService = Depends(get_service)):
    try:
        anterior = service.obtener(id)
        actualizado = service.desvincular_usuario(id)
        registrar_auditoria(
            modulo="apelaciones", tabla="abogados", registro_id=id,
            codigo_referencia=actualizado.nombre, accion="DESVINCULAR_USUARIO",
            campos_cambiados="usuarioId", valores_previos={"usuarioId": anterior.usuarioId},
            valores_nuevos={"usuarioId": None},
            usuario_id=_.get("userId"), usuario_nombre=_.get("nombre", "Administrador"),
            usuario_rol=_.get("rol"),
        )
        return abogado_out(actualizado)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
