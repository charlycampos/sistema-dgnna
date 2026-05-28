from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.models import ApelacionModel, NnaDetalleModel

from sqlalchemy import func

router = APIRouter(prefix="/api/nna", tags=["nna"])

def normalizar_texto_db(col):
    return func.translate(
        func.lower(col),
        'áéíóúüñ',
        'aeiouun'
    )

def normalizar_texto_py(s: str) -> str:
    s = s.lower().strip()
    reemplazos = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ü': 'u', 'ñ': 'n'
    }
    for acento, limpio in reemplazos.items():
        s = s.replace(acento, limpio)
    return s

@router.get("/buscar-coincidencias")
def buscar_coincidencias(
    nombres: Optional[str] = Query(None),
    primerApellido: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ApelacionModel).join(ApelacionModel.nnas)
    
    has_filters = False
    
    nom_clean = normalizar_texto_py(nombres) if nombres else ""
    ape_clean = normalizar_texto_py(primerApellido) if primerApellido else ""
    
    if nom_clean:
        query = query.filter(
            NnaDetalleModel.tipo == "natural",
            normalizar_texto_db(NnaDetalleModel.nombres).like(f"%{nom_clean}%")
        )
        has_filters = True
    if ape_clean:
        query = query.filter(
            NnaDetalleModel.tipo == "natural",
            normalizar_texto_db(NnaDetalleModel.primerApellido).like(f"%{ape_clean}%")
        )
        has_filters = True
            
    if not has_filters:
        return []
        
    coincidencias = query.order_by(ApelacionModel.fechaIngreso.desc()).all()
    
    res = []
    seen_ids = set()
    for c in coincidencias:
        if c.id not in seen_ids:
            seen_ids.add(c.id)
            
            # Format Apelantes details
            apelantes_list = []
            for ap in c.apelantes:
                if ap.tipo == "institucion":
                    apelantes_list.append({
                        "tipo": "institucion",
                        "nombre": ap.institucion or "",
                        "documento": ap.documento or ""
                    })
                else:
                    nombre_completo = " ".join(filter(None, [ap.nombres, ap.apellidoPaterno, ap.apellidoMaterno]))
                    apelantes_list.append({
                        "tipo": "natural",
                        "nombre": nombre_completo,
                        "documento": ap.documento or ""
                    })
            
            # Format NNAs details
            nnas_list = []
            for n in c.nnas:
                if n.tipo == "institucion":
                    nnas_list.append({
                        "tipo": "institucion",
                        "nombre": n.institucion or "",
                        "edad": None
                    })
                else:
                    nombre_completo = " ".join(filter(None, [n.nombres, n.primerApellido, n.segundoApellido]))
                    nnas_list.append({
                        "tipo": "natural",
                        "nombre": nombre_completo,
                        "edad": n.edad
                    })

            res.append({
                "id": c.id,
                "numeroExpediente": c.numeroExpediente,
                "fechaIngreso": c.fechaIngreso.isoformat() if c.fechaIngreso else None,
                "estado": c.estado,
                "abogadoNombre": c.abogado.nombre if c.abogado else "No asignado",
                "abogadoId": c.abogado.id if c.abogado else None,
                "apelantes": apelantes_list,
                "nnas": nnas_list
            })
    return res
