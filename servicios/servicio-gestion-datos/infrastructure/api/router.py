import os
import jwt
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func

from infrastructure.db.database import get_db
from infrastructure.db.models import DatasetModel, DiccionarioCampoModel
from infrastructure.api.schemas import DatasetCreate, DatasetUpdate, DatasetOut, CampoIn, CampoOut

router = APIRouter(prefix="/api/gestion-datos", tags=["gestion-datos"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/auth/login", auto_error=False)


def get_usuario(token: str = Depends(oauth2_scheme)) -> str:
    if not token:
        return ""
    try:
        payload = jwt.decode(token, os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026"), algorithms=["HS256"])
        return payload.get("nombre", "") or payload.get("sub", "")
    except Exception:
        return ""


@router.get("/stats")
def obtener_estadisticas(db: Session = Depends(get_db)):
    total_datasets = db.query(DatasetModel).count()
    activos = db.query(DatasetModel).filter(DatasetModel.estado == "activo").count()
    total_campos = db.query(DiccionarioCampoModel).count()
    
    por_direccion = {}
    for d, count in db.query(DatasetModel.direccionLinea, func.count(DatasetModel.id)).group_by(DatasetModel.direccionLinea).all():
        por_direccion[d] = count

    return {
        "totalDatasets": total_datasets,
        "activos": activos,
        "totalCampos": total_campos,
        "porDireccion": por_direccion,
    }


@router.get("/datasets")
def listar_datasets(
    q: Optional[str] = None,
    direccion: Optional[str] = None,
    estado: Optional[str] = None,
    tipoFuente: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DatasetModel)
    if direccion and direccion != "todos":
        query = query.filter(DatasetModel.direccionLinea == direccion)
    if estado and estado != "todos":
        query = query.filter(DatasetModel.estado == estado)
    if tipoFuente and tipoFuente != "todos":
        query = query.filter(DatasetModel.tipoFuente == tipoFuente)
    if q:
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            (func.lower(DatasetModel.nombre).like(term)) |
            (func.lower(DatasetModel.codigo).like(term)) |
            (func.lower(DatasetModel.descripcion).like(term))
        )
    
    resultados = query.order_by(DatasetModel.createdAt.desc()).all()
    out = []
    for r in resultados:
        campos_out = [CampoOut.from_orm(c) for c in r.campos]
        out.append({
            "id": r.id,
            "codigo": r.codigo,
            "nombre": r.nombre,
            "descripcion": r.descripcion,
            "direccionLinea": r.direccionLinea,
            "tipoFuente": r.tipoFuente,
            "frecuenciaAct": r.frecuenciaAct,
            "formatoSalida": r.formatoSalida,
            "responsable": r.responsable,
            "estado": r.estado,
            "creadoPor": r.creadoPor,
            "createdAt": r.createdAt,
            "updatedAt": r.updatedAt,
            "totalCampos": len(campos_out),
            "campos": campos_out
        })
    return out


@router.get("/datasets/{dataset_id}")
def obtener_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    campos_out = [CampoOut.from_orm(c) for c in ds.campos]
    return {
        "id": ds.id,
        "codigo": ds.codigo,
        "nombre": ds.nombre,
        "descripcion": ds.descripcion,
        "direccionLinea": ds.direccionLinea,
        "tipoFuente": ds.tipoFuente,
        "frecuenciaAct": ds.frecuenciaAct,
        "formatoSalida": ds.formatoSalida,
        "responsable": ds.responsable,
        "estado": ds.estado,
        "creadoPor": ds.creadoPor,
        "createdAt": ds.createdAt,
        "updatedAt": ds.updatedAt,
        "totalCampos": len(campos_out),
        "campos": campos_out
    }


@router.post("/datasets", status_code=201)
def crear_dataset(datos: DatasetCreate, db: Session = Depends(get_db), usuario: str = Depends(get_usuario)):
    existente = db.query(DatasetModel).filter(DatasetModel.codigo == datos.codigo.strip()).first()
    if existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un dataset con el código {datos.codigo}")

    nuevo = DatasetModel(
        codigo=datos.codigo.strip().upper(),
        nombre=datos.nombre.strip(),
        descripcion=datos.descripcion,
        direccionLinea=datos.direccionLinea,
        tipoFuente=datos.tipoFuente or "Sistema Interno",
        frecuenciaAct=datos.frecuenciaAct or "Mensual",
        formatoSalida=datos.formatoSalida or "Excel",
        responsable=datos.responsable,
        estado=datos.estado or "activo",
        creadoPor=usuario,
    )
    db.add(nuevo)
    db.flush()

    if datos.campos:
        for c in datos.campos:
            campo = DiccionarioCampoModel(
                datasetId=nuevo.id,
                nombreCampo=c.nombreCampo.strip(),
                tipoDato=c.tipoDato.strip(),
                longitudMax=c.longitudMax,
                esObligatorio=c.esObligatorio or 0,
                descripcion=c.descripcion,
                ejemplo=c.ejemplo
            )
            db.add(campo)

    db.commit()
    return {"id": nuevo.id, "mensaje": "Dataset registrado exitosamente"}


@router.put("/datasets/{dataset_id}")
def actualizar_dataset(dataset_id: str, datos: DatasetUpdate, db: Session = Depends(get_db)):
    ds = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    if datos.nombre is not None:
        ds.nombre = datos.nombre.strip()
    if datos.descripcion is not None:
        ds.descripcion = datos.descripcion
    if datos.direccionLinea is not None:
        ds.direccionLinea = datos.direccionLinea
    if datos.tipoFuente is not None:
        ds.tipoFuente = datos.tipoFuente
    if datos.frecuenciaAct is not None:
        ds.frecuenciaAct = datos.frecuenciaAct
    if datos.formatoSalida is not None:
        ds.formatoSalida = datos.formatoSalida
    if datos.responsable is not None:
        ds.responsable = datos.responsable
    if datos.estado is not None:
        ds.estado = datos.estado
    ds.updatedAt = datetime.utcnow()

    if datos.campos is not None:
        db.query(DiccionarioCampoModel).filter(DiccionarioCampoModel.datasetId == dataset_id).delete()
        for c in datos.campos:
            campo = DiccionarioCampoModel(
                datasetId=ds.id,
                nombreCampo=c.nombreCampo.strip(),
                tipoDato=c.tipoDato.strip(),
                longitudMax=c.longitudMax,
                esObligatorio=c.esObligatorio or 0,
                descripcion=c.descripcion,
                ejemplo=c.ejemplo
            )
            db.add(campo)

    db.commit()
    return {"id": ds.id, "mensaje": "Dataset actualizado exitosamente"}


@router.delete("/datasets/{dataset_id}")
def eliminar_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    db.delete(ds)
    db.commit()
    return {"mensaje": "Dataset eliminado exitosamente"}
