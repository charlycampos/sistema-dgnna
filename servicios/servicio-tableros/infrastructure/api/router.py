import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from infrastructure.db.database import get_db
from infrastructure.db.models import TableroModel
from infrastructure.api.schemas import TableroCreate, TableroUpdate, TableroOut

router = APIRouter(prefix="/api/tableros", tags=["Tableros de Direcciones"])

TABLEROS_SEMILLA = [
    {
        "id": "dsld-general-v3",
        "codigo_direccion": "DSLD",
        "titulo": "Tablero General DSLD (V3)",
        "subtitulo": "Monitoreo consolidado de defensorías y servicios distritales",
        "tipo": "powerbi",
        "url_embed": "https://app.powerbi.com/view?r=eyJrIjoiZDljNTIzNDctNTg2Yy00MWFjLWE4M2ItYzQ1NDc5MTZjMjg1IiwidCI6IjY4MTljNDYzLTVkZWItNDA3MC1hY2I2LTlmZGQzY2FhZTk4NCJ9",
        "descripcion": "Cuadro de mando interactivo en Power BI para el seguimiento operativo de las Defensorías Municipales del Niño, Niña y Adolescente (DEMUNA) a nivel nacional.",
        "responsable": "Equipo de Información y Estadística DSLD",
        "estado": "activo",
        "orden": 1,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "dsld-acreditacion",
        "codigo_direccion": "DSLD",
        "titulo": "Casos de RDF reportados",
        "subtitulo": "Procedimientos por riesgo en DEMUNAs acreditadas",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Reporte consolidado y casuística de casos de riesgo de desprotección familiar (RDF) atendidos por las DEMUNAs a nivel nacional.",
        "responsable": "Equipo Técnico DSLD",
        "estado": "desarrollo",
        "orden": 2,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "dpnna-politicas",
        "codigo_direccion": "DPNNA",
        "titulo": "Seguimiento de Políticas y Planes Nacionales",
        "subtitulo": "Metas PNAIA y compromisos intersectoriales",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Indicadores de seguimiento del Plan Nacional de Acción por la Infancia y la Adolescencia (PNAIA) e hitos estratégicos.",
        "responsable": "Dirección de Políticas de NNA",
        "estado": "planificado",
        "orden": 1,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "dpnna-cconna",
        "codigo_direccion": "DPNNA",
        "titulo": "Participación Infantil y Red CCONNA",
        "subtitulo": "Monitoreo territorial del Consejo Consultivo de NNA",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Registro y representatividad territorial de los Consejos Consultivos de Niñas, Niños y Adolescentes a nivel nacional.",
        "responsable": "Equipo de Participación Protagónica DPNNA",
        "estado": "planificado",
        "orden": 2,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "dpnna-encuestas-nacionales",
        "codigo_direccion": "DPNNA",
        "titulo": "Situación de la niñez y adolescencia (Encuestas Nacionales)",
        "subtitulo": "Indicadores sociodemográficos oficiales (ENAHO, ENDES, ENAPRES)",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Monitoreo y análisis de las condiciones de vida, salud, educación y desarrollo de niñas, niños y adolescentes a partir de fuentes de encuestas nacionales.",
        "responsable": "Dirección de Políticas de NNA",
        "estado": "desarrollo",
        "orden": 3,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "dpnna-registros-administrativos",
        "codigo_direccion": "DPNNA",
        "titulo": "Situación de la niñez y adolescencia (Registros administrativos)",
        "subtitulo": "Analítica sectorial basada en registros del Estado",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Consolidación y seguimiento de información operativa e institucional proveniente de registros administrativos sectoriales e interinstitucionales.",
        "responsable": "Dirección de Políticas de NNA",
        "estado": "desarrollo",
        "orden": 4,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "dpe-upe-nacional",
        "codigo_direccion": "DPE",
        "titulo": "Monitoreo de Casos y Respuestas UPE",
        "subtitulo": "Procedimientos por desprotección familiar",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Carga operativa de las Unidades de Protección Especial (UPE), tipos de acogimiento residencial/familiar y plazos de atención.",
        "responsable": "Coordinación Nacional UPE - DPE",
        "estado": "desarrollo",
        "orden": 1,
        "activo": True,
        "es_personalizado": False
    },
    {
        "id": "da-solicitantes-aptos",
        "codigo_direccion": "DA",
        "titulo": "Familias Declaradas Aptas y Procesos",
        "subtitulo": "Registro Nacional de Adopciones",
        "tipo": "proximamente",
        "url_embed": None,
        "descripcion": "Estadísticas de solicitantes con idoneidad aprobada, tiempos promedio de espera y perfiles de adoptantes.",
        "responsable": "Dirección de Adopciones",
        "estado": "desarrollo",
        "orden": 1,
        "activo": True,
        "es_personalizado": False
    }
]

def seed_tableros_if_empty(db: Session):
    for t in TABLEROS_SEMILLA:
        existente = db.query(TableroModel).filter(TableroModel.id == t["id"]).first()
        if not existente:
            nuevo = TableroModel(**t)
            db.add(nuevo)
    db.commit()

@router.get("", response_model=List[TableroOut])
def listar_tableros(
    direccion: Optional[str] = None,
    solo_activos: bool = True,
    db: Session = Depends(get_db)
):
    seed_tableros_if_empty(db)
    query = db.query(TableroModel)
    if solo_activos:
        query = query.filter(TableroModel.activo == True)
    if direccion:
        query = query.filter(TableroModel.codigo_direccion == direccion.upper())
    return query.order_by(TableroModel.codigo_direccion, TableroModel.orden).all()

@router.get("/{tablero_id}", response_model=TableroOut)
def obtener_tablero(tablero_id: str, db: Session = Depends(get_db)):
    tablero = db.query(TableroModel).filter(TableroModel.id == tablero_id).first()
    if not tablero:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    return tablero

@router.post("", response_model=TableroOut, status_code=status.HTTP_201_CREATED)
def crear_tablero(payload: TableroCreate, db: Session = Depends(get_db)):
    tablero_id = f"tablero-{payload.codigo_direccion.lower()}-{uuid.uuid4().hex[:8]}"
    nuevo = TableroModel(
        id=tablero_id,
        codigo_direccion=payload.codigo_direccion.upper(),
        titulo=payload.titulo,
        subtitulo=payload.subtitulo,
        tipo=payload.tipo,
        url_embed=payload.url_embed,
        descripcion=payload.descripcion,
        responsable=payload.responsable,
        estado=payload.estado,
        orden=payload.orden,
        activo=payload.activo,
        es_personalizado=True
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.put("/{tablero_id}", response_model=TableroOut)
def actualizar_tablero(tablero_id: str, payload: TableroUpdate, db: Session = Depends(get_db)):
    tablero = db.query(TableroModel).filter(TableroModel.id == tablero_id).first()
    if not tablero:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    
    update_data = payload.model_dump(exclude_unset=True)
    if "codigo_direccion" in update_data and update_data["codigo_direccion"]:
        update_data["codigo_direccion"] = update_data["codigo_direccion"].upper()
        
    for k, v in update_data.items():
        setattr(tablero, k, v)

    db.commit()
    db.refresh(tablero)
    return tablero

@router.delete("/{tablero_id}")
def eliminar_tablero(tablero_id: str, db: Session = Depends(get_db)):
    tablero = db.query(TableroModel).filter(TableroModel.id == tablero_id).first()
    if not tablero:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")
    db.delete(tablero)
    db.commit()
    return {"mensaje": "Tablero eliminado correctamente", "id": tablero_id}
