"""
Adaptador de entrada HTTP — FastAPI router de apelaciones.
Devuelve los modelos SQLAlchemy con relaciones cargadas (abogado, complejidad).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from infrastructure.db.database import get_db
from infrastructure.db.models import ApelacionModel
from infrastructure.db.apelacion_repository_impl import ApelacionRepositoryImpl
from infrastructure.db.complejidad_repository_impl import ComplejidadRepositoryImpl
from infrastructure.api.schemas import ApelacionCreate, ApelacionUpdate, ApelacionOut
from domain.services.apelacion_service import ApelacionService
from infrastructure.api.audit_client import registrar_auditoria
from infrastructure.services.asignacion_nueva_service import AsignacionNuevaService
from infrastructure.api.auth_context import current_identity, validate_current_abogado
from infrastructure.db.abogado_repository_impl import AbogadoRepositoryImpl

router = APIRouter(prefix="/api/apelaciones", tags=["apelaciones"])


def get_service(db: Session = Depends(get_db)) -> ApelacionService:
    return ApelacionService(
        apelacion_repo=ApelacionRepositoryImpl(db),
        complejidad_repo=ComplejidadRepositoryImpl(db),
    )


def _query_con_relaciones(db: Session):
    """Query base que carga abogado, complejidad, revisor, apelantes y nnas en el mismo SELECT."""
    return db.query(ApelacionModel).options(
        selectinload(ApelacionModel.abogado),
        selectinload(ApelacionModel.complejidad),
        selectinload(ApelacionModel.revisor),
        selectinload(ApelacionModel.apelantes),
        selectinload(ApelacionModel.nnas),
    )


def _es_abogado(identity: dict) -> bool:
    return any(
        permiso.get("modulo") == "apelaciones" and permiso.get("rolModulo") == "abogado"
        for permiso in identity.get("modulos", [])
    )


def _abogado_actual(identity: dict, db: Session):
    if not _es_abogado(identity):
        return None
    validate_current_abogado(identity)
    abogado = AbogadoRepositoryImpl(db).obtener_por_usuario_id(identity["userId"])
    if not abogado:
        raise HTTPException(status_code=403, detail="La cuenta no está vinculada a un abogado")
    if not abogado.activo:
        raise HTTPException(status_code=403, detail="El abogado vinculado está inactivo")
    return abogado


def _verificar_propiedad(modelo: ApelacionModel, identity: dict, db: Session):
    abogado = _abogado_actual(identity, db)
    if abogado and modelo.abogadoId != abogado.id:
        raise HTTPException(status_code=403, detail="No tiene acceso a esta apelación")
    return abogado


@router.get("", response_model=List[ApelacionOut])
def listar(
    estado:    Optional[str] = Query(None),
    abogadoId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    identity=Depends(current_identity),
):
    q = _query_con_relaciones(db)
    abogado_actual = _abogado_actual(identity, db)
    if estado:
        q = q.filter(ApelacionModel.estado == estado)
    if abogado_actual:
        q = q.filter(ApelacionModel.abogadoId == abogado_actual.id)
    elif abogadoId:
        q = q.filter(ApelacionModel.abogadoId == abogadoId)
    return q.order_by(ApelacionModel.fechaIngreso.desc()).all()


@router.get("/{id}", response_model=ApelacionOut)
def obtener(id: str, db: Session = Depends(get_db), identity=Depends(current_identity)):
    m = _query_con_relaciones(db).filter(ApelacionModel.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Apelación no encontrada")
    _verificar_propiedad(m, identity, db)
    return m


@router.post("", response_model=ApelacionOut, status_code=201)
def crear(body: ApelacionCreate, db: Session = Depends(get_db), identity=Depends(current_identity)):
    try:
        if _es_abogado(identity):
            raise HTTPException(status_code=403, detail="El rol Abogado no puede registrar nuevas apelaciones")
        # El abogado enviado por el navegador es solo una propuesta visual.
        # La decisión definitiva se recalcula bajo bloqueo en Oracle.
        entidad = AsignacionNuevaService(db).registrar(body.model_dump())
        res = _query_con_relaciones(db).filter(ApelacionModel.id == entidad.id).first()
        registrar_auditoria(
            modulo="apelaciones",
            tabla="apelaciones",
            registro_id=entidad.id,
            codigo_referencia=body.numeroExpediente,
            accion="CREAR",
            campos_cambiados=", ".join(body.model_dump().keys()),
            valores_nuevos={
                **body.model_dump(exclude={"fechaCambioResuelto"}),
                "fechaCambioResuelto": entidad.fechaCambioResuelto,
            },
            usuario_id=identity.get("userId"),
            usuario_nombre=identity.get("nombre", "Usuario"),
            usuario_rol=identity.get("rol", "usuario"),
        )
        db.commit()
        return res
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al registrar apelación")


@router.put("/{id}", response_model=ApelacionOut)
def actualizar(id: str, body: ApelacionUpdate, db: Session = Depends(get_db), identity=Depends(current_identity)):
    service = get_service(db)
    try:
        ap_anterior = db.query(ApelacionModel).filter(ApelacionModel.id == id).first()
        if not ap_anterior:
            raise HTTPException(status_code=404, detail="Apelación no encontrada")
        abogado_actual = _verificar_propiedad(ap_anterior, identity, db)
        if abogado_actual and body.abogadoId != abogado_actual.id:
            raise HTTPException(status_code=403, detail="El abogado no puede reasignar la apelación")
        previos = {k: getattr(ap_anterior, k, None) for k in body.model_dump().keys()} if ap_anterior else None
        
        entidad = service.actualizar(id, body.model_dump())
        # Reasignación: la cuenta de la nueva modalidad sigue al abogado actual.
        AsignacionNuevaService(db).sincronizar(id, body.abogadoId, body.complejidadId, body.folios)
        db.commit()
        res = _query_con_relaciones(db).filter(ApelacionModel.id == entidad.id).first()
        
        registrar_auditoria(
            modulo="apelaciones",
            tabla="apelaciones",
            registro_id=entidad.id,
            codigo_referencia=body.numeroExpediente or (ap_anterior.numeroExpediente if ap_anterior else id),
            accion="MODIFICAR",
            campos_cambiados=", ".join(body.model_dump().keys()),
            valores_previos=previos,
            valores_nuevos={
                **body.model_dump(exclude={"fechaCambioResuelto"}),
                "fechaCambioResuelto": entidad.fechaCambioResuelto,
            },
            usuario_id=identity.get("userId"),
            usuario_nombre=identity.get("nombre", "Usuario"),
            usuario_rol=identity.get("rol", "usuario"),
        )
        return res
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(status_code=400, detail="El número de expediente ya existe")
        raise HTTPException(status_code=500, detail="Error al actualizar apelación")


@router.delete("/{id}")
def eliminar(id: str, db: Session = Depends(get_db), identity=Depends(current_identity)):
    service = get_service(db)
    try:
        if _es_abogado(identity):
            raise HTTPException(status_code=403, detail="El rol Abogado no puede eliminar apelaciones")
        # Primero se quita su evento de asignación (FK); el commit lo hace el repositorio.
        AsignacionNuevaService(db).quitar(id)
        service.eliminar(id)
        registrar_auditoria(
            modulo="apelaciones",
            tabla="apelaciones",
            registro_id=id,
            accion="ELIMINAR",
            usuario_id=identity.get("userId"),
            usuario_nombre=identity.get("nombre", "Usuario"),
            usuario_rol=identity.get("rol", "usuario"),
        )
        return {"success": True}
    except HTTPException:
        raise
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
