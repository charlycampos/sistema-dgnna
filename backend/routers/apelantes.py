from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Apelacion
from auth import get_current_user

router = APIRouter(prefix="/api/apelantes", tags=["apelantes"])

@router.get("/buscar-coincidencias")
def buscar_coincidencias(
    nombres: Optional[str] = None,
    apellidoPaterno: Optional[str] = None,
    institucion: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    query = db.query(Apelacion)
    
    has_filters = False
    
    # Clean whitespace
    inst_clean = institucion.strip() if institucion else ""
    nom_clean = nombres.strip() if nombres else ""
    pat_clean = apellidoPaterno.strip() if apellidoPaterno else ""
    
    if inst_clean:
        query = query.filter(Apelacion.apelante.like(f"%{inst_clean}%"))
        has_filters = True
    else:
        if nom_clean:
            query = query.filter(Apelacion.apelante.like(f"%{nom_clean}%"))
            has_filters = True
        if pat_clean:
            query = query.filter(Apelacion.apelante.like(f"%{pat_clean}%"))
            has_filters = True
            
    if not has_filters:
        return []
        
    coincidencias = query.order_by(Apelacion.fechaIngreso.desc()).all()
    
    res = []
    for c in coincidencias:
        res.append({
            "id": c.id,
            "numeroExpediente": c.numeroExpediente,
            "fechaIngreso": c.fechaIngreso.isoformat() if c.fechaIngreso else None,
            "estado": c.estado
        })
    return res
