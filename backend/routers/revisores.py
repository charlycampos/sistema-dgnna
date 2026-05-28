from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from database import get_db
from models import Revisor
from schemas import RevisorCreate, RevisorUpdate, RevisorOut
from auth import get_current_user

router = APIRouter(prefix="/api/revisores", tags=["revisores"])


@router.get("/carga")
def carga_por_revisor(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Retorna la cantidad de casos por revisor directamente desde Oracle."""
    rows = db.execute(text("""
        SELECT
            r.ID,
            r.NOMBRE,
            COUNT(a.ID)                                                    AS total,
            SUM(CASE WHEN a.ESTADO = 'Pendiente' THEN 1 ELSE 0 END)       AS pendientes,
            SUM(CASE WHEN a.ESTADO = 'Resuelto'  THEN 1 ELSE 0 END)       AS resueltos,
            SUM(CASE WHEN a.ESTADO = 'Atendido'  THEN 1 ELSE 0 END)       AS atendidos
        FROM APELACIONES_DB.REVISORES r
        LEFT JOIN APELACIONES_DB.APELACIONES a ON a.REVISORID = r.ID
        WHERE r.ACTIVO = 1
        GROUP BY r.ID, r.NOMBRE
        ORDER BY r.NOMBRE
    """)).fetchall()

    return [
        {
            "revisorId":       row[0],
            "nombre":          row[1],
            "totalCasos":      int(row[2] or 0),
            "casosPendientes": int(row[3] or 0),
            "casosResueltos":  int(row[4] or 0),
            "casosAtendidos":  int(row[5] or 0),
        }
        for row in rows
    ]


@router.get("", response_model=List[RevisorOut])
def listar_revisores(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return db.query(Revisor).order_by(Revisor.nombre).all()


@router.post("", response_model=RevisorOut, status_code=201)
def crear_revisor(
    body: RevisorCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    revisor = Revisor(nombre=body.nombre.strip(), activo=body.activo)
    db.add(revisor)
    db.commit()
    db.refresh(revisor)
    return revisor


@router.put("/{id}", response_model=RevisorOut)
def actualizar_revisor(
    id: str,
    body: RevisorUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    revisor = db.query(Revisor).filter(Revisor.id == id).first()
    if not revisor:
        raise HTTPException(status_code=404, detail="Revisor no encontrado")

    if body.nombre is not None:
        revisor.nombre = body.nombre.strip()
    if body.activo is not None:
        revisor.activo = body.activo

    db.commit()
    db.refresh(revisor)
    return revisor


@router.delete("/{id}")
def eliminar_revisor(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    revisor = db.query(Revisor).filter(Revisor.id == id).first()
    if not revisor:
        raise HTTPException(status_code=404, detail="Revisor no encontrado")
    db.delete(revisor)
    db.commit()
    return {"success": True}
