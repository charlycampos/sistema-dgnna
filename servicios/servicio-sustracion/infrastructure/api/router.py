from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.caso_repository_impl import CasoRepositoryImpl
from infrastructure.api.schemas import (
    CasoSustracionCreate, CasoSustracionUpdate, CasoSustracionOut,
    BitacoraEntradaCreate, BitacoraEntradaOut,
    HistorialJudicialCreate, HistorialJudicialOut,
)
from domain.services.sustracion_service import SustracionService

router = APIRouter(prefix="/api/sustracion", tags=["sustracion"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/auth/login")


def get_service(db: Session = Depends(get_db)) -> SustracionService:
    return SustracionService(caso_repo=CasoRepositoryImpl(db))

def get_usuario(token: str = Depends(oauth2_scheme)) -> str:
    import jwt, os
    try:
        payload = jwt.decode(token, os.getenv("SESSION_SECRET", ""), algorithms=["HS256"])
        return payload.get("nombre", "")
    except Exception:
        return ""


@router.get("", response_model=List[CasoSustracionOut])
def listar(
    estado: Optional[str] = Query(None),
    profesional: Optional[str] = Query(None),
    pais: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    service: SustracionService = Depends(get_service),
):
    try:
        return [_caso_out(c) for c in service.listar(estado=estado, profesional=profesional, pais=pais, q=q)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CasoSustracionOut, status_code=201)
def crear(body: CasoSustracionCreate, service: SustracionService = Depends(get_service), usuario: str = Depends(get_usuario)):
    try:
        return _caso_out(service.crear(body.model_dump(), usuario=usuario))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=CasoSustracionOut)
def obtener(id: str, service: SustracionService = Depends(get_service)):
    try:
        return _caso_out(service.obtener(id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{id}", response_model=CasoSustracionOut)
def actualizar(id: str, body: CasoSustracionUpdate, service: SustracionService = Depends(get_service)):
    try:
        return _caso_out(service.actualizar(id, body.model_dump(exclude_unset=True)))
    except ValueError as e:
        raise HTTPException(status_code=409 if "código" in str(e) else 404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
def eliminar(id: str, service: SustracionService = Depends(get_service)):
    try:
        service.eliminar(id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{id}/bitacora", response_model=BitacoraEntradaOut, status_code=201)
def agregar_bitacora(id: str, body: BitacoraEntradaCreate, service: SustracionService = Depends(get_service), usuario: str = Depends(get_usuario)):
    try:
        return service.agregar_bitacora(id, body.model_dump(), usuario=usuario)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}/bitacora/{entrada_id}")
def eliminar_bitacora(id: str, entrada_id: str, service: SustracionService = Depends(get_service)):
    service.eliminar_bitacora(id, entrada_id)
    return {"success": True}


@router.post("/{id}/historial-judicial", response_model=HistorialJudicialOut, status_code=201)
def agregar_historial(id: str, body: HistorialJudicialCreate, service: SustracionService = Depends(get_service), usuario: str = Depends(get_usuario)):
    try:
        return service.agregar_historial(id, body.model_dump(), usuario=usuario)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{id}/historial-judicial/{entrada_id}")
def eliminar_historial(id: str, entrada_id: str, service: SustracionService = Depends(get_service)):
    service.eliminar_historial(id, entrada_id)
    return {"success": True}


def _caso_out(c) -> dict:
    return {
        "id": c.id, "codigo": c.codigo, "nnaNombre": c.nnaNombre, "nnaSexo": c.nnaSexo,
        "nnaEdad": c.nnaEdad, "nnaTipoEdad": c.nnaTipoEdad, "nnaFechaNac": c.nnaFechaNac,
        "pais": c.pais, "etapa": c.etapa, "tipoSolicitud": c.tipoSolicitud, "acPeru": c.acPeru,
        "fechaIngreso": c.fechaIngreso, "fechaSalida": c.fechaSalida,
        "solicitanteNombre": c.solicitanteNombre, "solicitanteSexo": c.solicitanteSexo,
        "solicitanteTelefono": c.solicitanteTelefono, "solicitanteCorreo": c.solicitanteCorreo,
        "solicitanteDomicilio": c.solicitanteDomicilio, "requeridoNombre": c.requeridoNombre,
        "requeridoSexo": c.requeridoSexo, "requeridoTelefono": c.requeridoTelefono,
        "requeridoCorreo": c.requeridoCorreo, "requeridoDomicilio": c.requeridoDomicilio,
        "profesional": c.profesional, "estado": c.estado, "fechaEntrevista": c.fechaEntrevista,
        "resultadoEntrevista": c.resultadoEntrevista, "estadoJudicial": c.estadoJudicial,
        "fechaDemanda": c.fechaDemanda, "numExpedienteJudicial": c.numExpedienteJudicial,
        "juzgado": c.juzgado, "sentencia1ra": c.sentencia1ra, "sentencia2da": c.sentencia2da,
        "casacion": c.casacion, "motivoCierre": c.motivoCierre, "retorno": c.retorno,
        "observaciones": c.observaciones, "creadoPor": c.creadoPor,
        "createdAt": c.createdAt, "updatedAt": c.updatedAt,
        "bitacora": [{"id": b.id, "casoId": b.casoId, "fecha": b.fecha, "texto": b.texto, "creadoPor": b.creadoPor, "createdAt": b.createdAt} for b in c.bitacora],
        "historialJudicial": [{"id": h.id, "casoId": h.casoId, "etapa": h.etapa, "fecha": h.fecha, "descripcion": h.descripcion, "creadoPor": h.creadoPor, "createdAt": h.createdAt} for h in c.historialJudicial],
    }
