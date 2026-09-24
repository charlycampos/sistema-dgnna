from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from infrastructure.db.database import get_db
from infrastructure.api.schemas import AsignacionPropuestaOut
from infrastructure.services.asignacion_nueva_service import AsignacionNuevaService

router = APIRouter(prefix="/api/asignacion", tags=["asignación automática"])

@router.get("", response_model=AsignacionPropuestaOut)
def propuesta(complejidadId: str = Query(...), folios: int = Query(...), db: Session = Depends(get_db)):
    try:
        return AsignacionNuevaService(db).propuesta(complejidadId, folios)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tablero")
def tablero(db: Session = Depends(get_db)):
    """Estado de la nueva modalidad para el dashboard de apelaciones."""
    return AsignacionNuevaService(db).estado_tablero()
