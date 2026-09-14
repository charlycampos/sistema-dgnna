import uuid
import hashlib
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, selectinload
from infrastructure.db.database import get_db
from infrastructure.db.models import Accion, Auditoria, Documento, Plantilla, Seccion, Valor
from domain.services.docx_renderer import renderizar
from domain.services.seed import sembrar
from .auth import usuario_actual, es_admin, requiere_admin, tiene_acceso_direccion, puede_editar_documento, puede_revisar_documentos
from .schemas import (
    AccionCreate,
    DocumentoCreate,
    DocumentoUpdate,
    DocumentoObservarRequest,
    DocumentoVersionarRequest,
    PlantillaCreate,
    PlantillaUpdate,
    PlantillaClonarRequest,
    EstadoPlantilla,
    EstadoDocumento
)

router = APIRouter(prefix="/api/ayuda-memoria", tags=["Ayuda Memoria"])

def nombre(u: dict) -> str:
    return u.get("nombre") or u.get("name") or "Usuario"

def plantilla_json(p: Plantilla) -> dict:
    return {
        "id": p.id,
        "codigo": p.codigo,
        "nombre": p.nombre,
        "descripcion": p.descripcion,
        "tipoAmbito": p.tipoAmbito,
        "direccionDuena": p.direccionDuena,
        "esOficial": p.esOficial,
        "version": p.version or "1.0",
        "estadoPlantilla": p.estadoPlantilla or "VIGENTE",
        "plantillaOrigenId": p.plantillaOrigenId,
        "numSecciones": len(p.secciones),
        "secciones": [
            {
                "id": s.id,
                "orden": s.orden,
                "titulo": s.titulo,
                "tipoSeccion": s.tipoSeccion,
                "guiaLlenado": s.guiaLlenado,
                "direccionSugerida": s.direccionSugerida,
                "configuracionJson": s.configuracionJson
            }
            for s in p.secciones
        ]
    }

def codigo(db: Session, p: Plantilla, region: str | None) -> str:
    """Genera un correlativo institucional transaccional y resistente a colisiones."""
    pref = "CS" if "CASO" in p.codigo.upper() else "AM"
    anio = datetime.now().year
    sub = p.codigo.replace("_", "-").upper()
    if len(sub) > 6:
        sub = sub[:6]
    base = f"{pref}-{sub}-{anio}"
    
    existentes = db.query(Documento.codigoInterno).filter(
        Documento.codigoInterno.like(f"{base}-%")
    ).all()
    
    max_num = 0
    for (cod_str,) in existentes:
        try:
            resto = cod_str[len(base) + 1:]
            partes = resto.split("-")
            num_part = int(partes[0])
            if num_part > max_num:
                max_num = num_part
        except Exception:
            continue
            
    siguiente = max_num + 1
    reg_suffix = f"-{region[:3].upper()}" if region else ""
    return f"{base}-{siguiente:03d}{reg_suffix}"

def _documento(db: Session, id: str) -> Documento:
    d = db.query(Documento).options(
        selectinload(Documento.plantilla).selectinload(Plantilla.secciones),
        selectinload(Documento.valores),
        selectinload(Documento.acciones)
    ).filter_by(id=id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return d

@router.get("/plantillas")
def plantillas(
    direccion: str | None = None,
    estado: str | None = None,
    db: Session = Depends(get_db),
    u: dict = Depends(usuario_actual)
):
    q = db.query(Plantilla).options(selectinload(Plantilla.secciones)).filter(Plantilla.activo.is_(True))
    
    if direccion and direccion not in ("TODAS", "MULTIDIRECCIONAL"):
        q = q.filter(or_(Plantilla.direccionDuena == direccion, Plantilla.direccionDuena == "MULTIDIRECCIONAL"))
    
    if estado:
        q = q.filter(Plantilla.estadoPlantilla == estado)
    elif not es_admin(u):
        # Por defecto los no-admin ven únicamente plantillas VIGENTE
        q = q.filter(Plantilla.estadoPlantilla == "VIGENTE")
        
    return [plantilla_json(p) for p in q.order_by(desc(Plantilla.esOficial), Plantilla.nombre).all()]

@router.get("/plantillas/{id}")
def obtener_plantilla(id: str, db: Session = Depends(get_db), _u: dict = Depends(usuario_actual)):
    p = db.query(Plantilla).options(selectinload(Plantilla.secciones)).filter_by(id=id, activo=True).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return plantilla_json(p)

@router.post("/plantillas")
def crear_plantilla(data: PlantillaCreate, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    # Solo administradores pueden crear plantillas oficiales
    if data.esOficial and not es_admin(u):
        raise HTTPException(status_code=403, detail="Solo los administradores pueden registrar plantillas oficiales")

    cod = data.codigo or f"CUSTOM_{uuid.uuid4().hex[:6].upper()}"
    if db.query(Plantilla).filter_by(codigo=cod).first():
        cod += f"_{uuid.uuid4().hex[:4].upper()}"

    tipo_ambito = data.tipoAmbito.value if hasattr(data.tipoAmbito, "value") else str(data.tipoAmbito)
    direccion_duena = data.direccionDuena.value if hasattr(data.direccionDuena, "value") else str(data.direccionDuena)
    estado_plantilla = data.estadoPlantilla.value if hasattr(data.estadoPlantilla, "value") else str(data.estadoPlantilla)

    p = Plantilla(
        codigo=cod,
        nombre=data.nombre,
        descripcion=data.descripcion,
        tipoAmbito=tipo_ambito,
        direccionDuena=direccion_duena,
        esOficial=data.esOficial if es_admin(u) else False,
        version=data.version or "1.0",
        estadoPlantilla=estado_plantilla,
        creadoPor=nombre(u)
    )
    db.add(p)
    db.flush()

    for i, s in enumerate(data.secciones):
        tipo_sec = s.tipoSeccion.value if hasattr(s.tipoSeccion, "value") else str(s.tipoSeccion)
        db.add(Seccion(
            plantillaId=p.id,
            orden=s.orden or (i + 1),
            titulo=s.titulo,
            tipoSeccion=tipo_sec,
            guiaLlenado=s.guiaLlenado,
            direccionSugerida=s.direccionSugerida,
            configuracionJson=s.configuracionJson
        ))
    db.commit()
    return {"id": p.id, "codigo": p.codigo, "nombre": p.nombre, "version": p.version, "estadoPlantilla": p.estadoPlantilla}

@router.put("/plantillas/{id}")
def actualizar_plantilla(id: str, data: PlantillaUpdate, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    p = db.query(Plantilla).options(selectinload(Plantilla.secciones)).filter_by(id=id, activo=True).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    if not es_admin(u) and p.creadoPor != nombre(u):
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar esta plantilla")

    # Si la plantilla ya está VIGENTE o RETIRADA y ya tiene documentos asociados, no se debe mutar directamente la estructura
    docs_asociados = db.query(Documento).filter_by(plantillaId=p.id).count()
    if docs_asociados > 0 and p.estadoPlantilla in ("VIGENTE", "RETIRADA"):
        raise HTTPException(
            status_code=400,
            detail="La plantilla ya cuenta con documentos asociados y está publicada/retirada. Clone la plantilla para crear una nueva versión."
        )

    if data.nombre is not None:
        p.nombre = data.nombre
    if data.descripcion is not None:
        p.descripcion = data.descripcion
    if data.tipoAmbito is not None:
        p.tipoAmbito = data.tipoAmbito.value if hasattr(data.tipoAmbito, "value") else str(data.tipoAmbito)
    if data.direccionDuena is not None:
        p.direccionDuena = data.direccionDuena.value if hasattr(data.direccionDuena, "value") else str(data.direccionDuena)
    if data.version is not None:
        p.version = data.version
    if data.estadoPlantilla is not None:
        if data.estadoPlantilla in (EstadoPlantilla.VIGENTE, EstadoPlantilla.RETIRADA) and not es_admin(u):
            raise HTTPException(status_code=403, detail="Solo los administradores pueden publicar o retirar plantillas")
        p.estadoPlantilla = data.estadoPlantilla.value if hasattr(data.estadoPlantilla, "value") else str(data.estadoPlantilla)

    if data.secciones is not None:
        # Reemplazar secciones
        for s in list(p.secciones):
            db.delete(s)
        db.flush()
        for i, s in enumerate(data.secciones):
            tipo_sec = s.tipoSeccion.value if hasattr(s.tipoSeccion, "value") else str(s.tipoSeccion)
            db.add(Seccion(
                plantillaId=p.id,
                orden=s.orden or (i + 1),
                titulo=s.titulo,
                tipoSeccion=tipo_sec,
                guiaLlenado=s.guiaLlenado,
                direccionSugerida=s.direccionSugerida,
                configuracionJson=s.configuracionJson
            ))

    db.commit()
    return {"id": p.id, "codigo": p.codigo, "nombre": p.nombre, "version": p.version, "estadoPlantilla": p.estadoPlantilla}

@router.post("/plantillas/{id}/clonar")
def clonar_plantilla(id: str, data: PlantillaClonarRequest, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    p_orig = db.query(Plantilla).options(selectinload(Plantilla.secciones)).filter_by(id=id, activo=True).first()
    if not p_orig:
        raise HTTPException(status_code=404, detail="Plantilla origen no encontrada")

    nuevo_cod = data.nuevoCodigo or f"{p_orig.codigo}_V{data.nuevaVersion.replace('.', '_')}"
    if db.query(Plantilla).filter_by(codigo=nuevo_cod).first():
        nuevo_cod += f"_{uuid.uuid4().hex[:4].upper()}"

    nuevo_nom = data.nuevoNombre or f"{p_orig.nombre} (v{data.nuevaVersion})"

    p_nueva = Plantilla(
        codigo=nuevo_cod,
        nombre=nuevo_nom,
        descripcion=p_orig.descripcion,
        tipoAmbito=p_orig.tipoAmbito,
        direccionDuena=p_orig.direccionDuena,
        esOficial=p_orig.esOficial if es_admin(u) else False,
        version=data.nuevaVersion,
        estadoPlantilla="BORRADOR",
        plantillaOrigenId=p_orig.id,
        creadoPor=nombre(u)
    )
    db.add(p_nueva)
    db.flush()

    for s in p_orig.secciones:
        db.add(Seccion(
            plantillaId=p_nueva.id,
            orden=s.orden,
            titulo=s.titulo,
            tipoSeccion=s.tipoSeccion,
            guiaLlenado=s.guiaLlenado,
            direccionSugerida=s.direccionSugerida,
            configuracionJson=s.configuracionJson
        ))

    db.commit()
    return {
        "id": p_nueva.id,
        "codigo": p_nueva.codigo,
        "nombre": p_nueva.nombre,
        "version": p_nueva.version,
        "estadoPlantilla": p_nueva.estadoPlantilla,
        "plantillaOrigenId": p_nueva.plantillaOrigenId
    }

@router.post("/plantillas/{id}/publicar")
def publicar_plantilla(id: str, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    if not es_admin(u):
        raise HTTPException(status_code=403, detail="Solo administradores pueden publicar plantillas")

    p = db.query(Plantilla).filter_by(id=id, activo=True).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    p.estadoPlantilla = "VIGENTE"
    db.commit()
    return {"id": p.id, "codigo": p.codigo, "estadoPlantilla": p.estadoPlantilla}

@router.post("/plantillas/{id}/retirar")
def retirar_plantilla(id: str, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    if not es_admin(u):
        raise HTTPException(status_code=403, detail="Solo administradores pueden retirar plantillas")

    p = db.query(Plantilla).filter_by(id=id, activo=True).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    p.estadoPlantilla = "RETIRADA"
    db.commit()
    return {"id": p.id, "codigo": p.codigo, "estadoPlantilla": p.estadoPlantilla}

@router.get("/documentos")
def documentos(
    direccion: str | None = None,
    region: str | None = None,
    estado: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    u: dict = Depends(usuario_actual)
):
    query = db.query(Documento).options(selectinload(Documento.plantilla))

    # Filtro explícito de dirección
    if direccion and direccion != "TODAS":
        query = query.filter_by(direccion=direccion)

    # Restricción automática para no administradores: ver solo su dirección, lo transversal
    # y lo propio. Se aplica siempre (aunque el token no traiga dirección) para no listar
    # documentos ajenos ni casos sensibles a quien no tiene acceso.
    if not es_admin(u):
        u_dir = u.get("direccion", "")
        condiciones = [
            Documento.direccion.in_(["MULTIDIRECCIONAL", "COLABORATIVO", "CONSOLIDADO"]),
            Documento.creadoPor == nombre(u)
        ]
        if u_dir:
            condiciones.append(Documento.direccion == u_dir)
        query = query.filter(or_(*condiciones))
        # Los casos de riesgo crítico no se listan por esta vía general para nadie
        # que no sea su creador, aunque coincida la dirección.
        query = query.filter(
            or_(
                Documento.nivelRiesgo.is_(None),
                Documento.nivelRiesgo != "CRITICO",
                Documento.creadoPor == nombre(u)
            )
        )

    if region and region != "TODAS":
        query = query.filter_by(region=region)
    if estado and estado != "TODOS":
        query = query.filter_by(estado=estado)
    if q:
        query = query.filter(or_(Documento.titulo.ilike(f"%{q}%"), Documento.codigoInterno.ilike(f"%{q}%")))

    docs = query.order_by(desc(Documento.updatedAt)).all()
    return [
        {
            "id": d.id,
            "codigoInterno": d.codigoInterno,
            "titulo": d.titulo,
            "region": d.region,
            "fechaCorte": d.fechaCorte,
            "estado": d.estado,
            "direccion": d.direccion,
            "nivelRiesgo": d.nivelRiesgo,
            "servicioMimp": d.servicioMimp,
            "plantillaNombre": d.plantilla.nombre if d.plantilla else "Plantilla",
            "plantillaCodigo": d.plantilla.codigo if d.plantilla else "",
            "creadoPor": d.creadoPor,
            "updatedAt": d.updatedAt.strftime("%d/%m/%Y %H:%M") if d.updatedAt else ""
        }
        for d in docs
    ]

_MESES_ES = (
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
)

def _fecha_corte_defecto() -> str:
    hoy = datetime.now()
    return f"{_MESES_ES[hoy.month - 1].capitalize()} {hoy.year}"

@router.post("/documentos")
def crear_documento(data: DocumentoCreate, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    p = db.query(Plantilla).options(selectinload(Plantilla.secciones)).filter_by(id=data.plantillaId, activo=True).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    dir_val = data.direccion.value if hasattr(data.direccion, "value") else str(data.direccion)
    dir_asignada = dir_val or p.direccionDuena or u.get("direccion") or "DPE"
    riesgo_val = data.nivelRiesgo.value if (data.nivelRiesgo and hasattr(data.nivelRiesgo, "value")) else (str(data.nivelRiesgo) if data.nivelRiesgo else None)

    # Reintento transaccional si hubiese colisión simultánea de correlativo
    for _ in range(5):
        try:
            codigo_gen = codigo(db, p, data.region)
            d = Documento(
                plantillaId=p.id,
                codigoInterno=codigo_gen,
                titulo=data.titulo,
                region=data.region,
                fechaCorte=data.fechaCorte or _fecha_corte_defecto(),
                direccion=dir_asignada,
                nivelRiesgo=riesgo_val,
                servicioMimp=data.servicioMimp,
                creadoPor=nombre(u)
            )
            db.add(d)
            db.flush()

            for s in p.secciones:
                db.add(Valor(
                    documentoId=d.id,
                    seccionId=s.id,
                    textoContenido="",
                    datosTablaJson=s.configuracionJson if s.tipoSeccion == "TABLA_DATOS" else None,
                    actualizadoPor=nombre(u)
                ))
            db.commit()
            return {"id": d.id, "codigoInterno": d.codigoInterno, "titulo": d.titulo}
        except Exception as ex:
            db.rollback()
            if "UNIQUE" in str(ex).upper() or "UQ_" in str(ex).upper() or "00001" in str(ex):
                continue
            raise ex
    raise HTTPException(status_code=409, detail="No se pudo generar un código único en este momento. Reintente.")

@router.get("/documentos/{doc_id}")
def obtener(doc_id: str, request: Request, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)

    # Validar autorización de acceso
    if not tiene_acceso_direccion(d.direccion, d.creadoPor, d.nivelRiesgo, u):
        raise HTTPException(status_code=403, detail="No tiene autorización para consultar este documento")

    # Auditoría en casos sensibles
    es_caso = (d.plantilla and "CASO" in d.plantilla.codigo.upper()) or (d.nivelRiesgo and d.nivelRiesgo.upper() == "CRITICO")
    if es_caso:
        db.add(Auditoria(
            documentoId=d.id,
            usuarioNombre=nombre(u),
            usuarioCorreo=u.get("correo"),
            accion="CONSULTA",
            ipOrigen=request.client.host if request.client else None
        ))
        db.commit()

    vm = {v.seccionId: v for v in d.valores}
    secciones = []
    if d.plantilla and d.plantilla.secciones:
        for s in d.plantilla.secciones:
            v = vm.get(s.id)
            secciones.append({
                "seccionId": s.id,
                "orden": s.orden,
                "titulo": s.titulo,
                "tipoSeccion": s.tipoSeccion,
                "guiaLlenado": s.guiaLlenado,
                "direccionSugerida": s.direccionSugerida,
                "configuracionJson": s.configuracionJson,
                "valorId": v.id if v else None,
                "textoContenido": v.textoContenido if v else "",
                "datosTablaJson": v.datosTablaJson if v else None,
                "datosGraficoJson": v.datosGraficoJson if v else None,
                "cifraCorte": v.cifraCorte if v else ""
            })

    return {
        "id": d.id,
        "codigoInterno": d.codigoInterno,
        "titulo": d.titulo,
        "region": d.region,
        "fechaCorte": d.fechaCorte,
        "estado": d.estado,
        "direccion": d.direccion,
        "nivelRiesgo": d.nivelRiesgo,
        "servicioMimp": d.servicioMimp,
        "plantillaId": d.plantillaId,
        "plantillaNombre": d.plantilla.nombre if d.plantilla else "",
        "plantillaCodigo": d.plantilla.codigo if d.plantilla else "",
        "creadoPor": d.creadoPor,
        "publicadoPor": d.publicadoPor,
        "publicadoAt": d.publicadoAt.strftime("%d/%m/%Y %H:%M") if d.publicadoAt else None,
        "hashIntegridad": d.hashIntegridad,
        "versionDoc": d.versionDoc or "1.0",
        "documentoOrigenId": d.documentoOrigenId,
        "observacionesRevision": d.observacionesRevision,
        "secciones": secciones,
        "acciones": [
            {
                "id": a.id,
                "fecha": a.fecha,
                "institucion": a.institucion,
                "descripcion": a.descripcion,
                "creadoPor": a.creadoPor,
                "createdAt": a.createdAt.strftime("%d/%m/%Y %H:%M") if a.createdAt else ""
            }
            for a in d.acciones
        ]
    }

@router.put("/documentos/{doc_id}")
def actualizar(doc_id: str, data: DocumentoUpdate, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)

    # Inmutabilidad de documentos sellados
    if d.estado in ("PUBLICADO", "HISTORICO"):
        raise HTTPException(
            status_code=403,
            detail=f"El documento se encuentra en estado {d.estado} y es estrictamente inmutable"
        )

    # Permiso de edición
    if not puede_editar_documento(d, u):
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar este documento")

    permitidas = {s.id for s in d.plantilla.secciones} if d.plantilla else set()

    # "estado" se excluye deliberadamente: los cambios de estado pasan siempre por
    # /revisar, /observar, /aprobar, /publicar y /versionar, nunca por este PUT genérico.
    for campo in ("titulo", "region", "fechaCorte", "direccion", "nivelRiesgo", "servicioMimp"):
        valor = getattr(data, campo)
        if valor is not None:
            valor_str = valor.value if hasattr(valor, "value") else valor
            setattr(d, campo, valor_str)

    existentes = {v.seccionId: v for v in d.valores}
    for item in data.valores:
        if item.seccionId not in permitidas:
            raise HTTPException(status_code=422, detail=f"La sección {item.seccionId} no pertenece a la plantilla del documento")
        v = existentes.get(item.seccionId) or Valor(documentoId=d.id, seccionId=item.seccionId)
        db.add(v)
        for campo in ("textoContenido", "datosTablaJson", "datosGraficoJson", "cifraCorte"):
            valor = getattr(item, campo)
            if valor is not None:
                setattr(v, campo, valor)
        v.actualizadoPor = nombre(u)

    d.updatedAt = datetime.utcnow()
    db.commit()
    return {"status": "ok", "estado": d.estado, "updatedAt": d.updatedAt.isoformat()}

@router.post("/documentos/{doc_id}/acciones")
def accion(doc_id: str, data: AccionCreate, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)

    # Inmutabilidad
    if d.estado in ("PUBLICADO", "HISTORICO"):
        raise HTTPException(status_code=403, detail="No se pueden registrar actuaciones en un documento sellado")

    if not puede_editar_documento(d, u):
        raise HTTPException(status_code=403, detail="No tiene permisos para agregar actuaciones a este documento")

    a = Accion(
        documentoId=d.id,
        fecha=data.fecha,
        institucion=data.institucion,
        descripcion=data.descripcion,
        creadoPor=nombre(u)
    )
    db.add(a)
    d.updatedAt = datetime.utcnow()
    db.commit()
    db.refresh(a)
    return {
        "id": a.id,
        "fecha": a.fecha,
        "institucion": a.institucion,
        "descripcion": a.descripcion,
        "creadoPor": a.creadoPor,
        "createdAt": a.createdAt.strftime("%d/%m/%Y %H:%M") if a.createdAt else ""
    }

@router.get("/documentos/{doc_id}/exportar-docx")
def exportar(doc_id: str, request: Request, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)

    if not tiene_acceso_direccion(d.direccion, d.creadoPor, d.nivelRiesgo, u):
        raise HTTPException(status_code=403, detail="No tiene autorización para exportar este documento")

    contenido = renderizar(d)
    db.add(Auditoria(
        documentoId=d.id,
        usuarioNombre=nombre(u),
        usuarioCorreo=u.get("correo"),
        accion="EXPORTAR_WORD",
        ipOrigen=request.client.host if request.client else None
    ))
    db.commit()
    return StreamingResponse(
        contenido,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{d.codigoInterno}.docx"'}
    )

@router.post("/documentos/{doc_id}/revisar")
def enviar_a_revision(doc_id: str, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)
    if d.estado in ("PUBLICADO", "HISTORICO"):
        raise HTTPException(status_code=403, detail="Un documento publicado no puede volver a enviarse a revisión")
    if not puede_editar_documento(d, u):
        raise HTTPException(status_code=403, detail="No tiene permisos para enviar este documento a revisión")
    
    d.estado = "EN_REVISION"
    d.observacionesRevision = None
    d.updatedAt = datetime.utcnow()
    db.commit()
    return {"status": "ok", "estado": d.estado, "mensaje": "Documento enviado a revisión institucional"}

@router.post("/documentos/{doc_id}/observar")
def observar_documento(doc_id: str, data: DocumentoObservarRequest, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)
    if d.estado in ("PUBLICADO", "HISTORICO"):
        raise HTTPException(status_code=403, detail="Un documento publicado no puede observarse")
    
    # Solo revisores/directores del módulo o administradores pueden observar
    if not puede_revisar_documentos(u):
        raise HTTPException(status_code=403, detail="Solo un revisor o directivo puede formular observaciones")

    d.estado = "OBSERVADO"
    d.observacionesRevision = f"[{datetime.now().strftime('%d/%m/%Y %H:%M')} - {nombre(u)}]: {data.observaciones}"
    d.updatedAt = datetime.utcnow()
    db.commit()
    return {"status": "ok", "estado": d.estado, "observaciones": d.observacionesRevision}

@router.post("/documentos/{doc_id}/aprobar")
def aprobar_documento(doc_id: str, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)
    if d.estado in ("PUBLICADO", "HISTORICO"):
        raise HTTPException(status_code=403, detail="El documento ya se encuentra publicado")
    if not puede_revisar_documentos(u):
        raise HTTPException(status_code=403, detail="Solo un revisor o directivo puede aprobar el documento")

    d.estado = "APROBADO"
    d.updatedAt = datetime.utcnow()
    db.commit()
    return {"status": "ok", "estado": d.estado, "mensaje": "Documento aprobado, listo para publicación oficial"}

@router.post("/documentos/{doc_id}/publicar")
def sellar_y_publicar(doc_id: str, request: Request, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d = _documento(db, doc_id)

    if d.estado == "PUBLICADO":
        raise HTTPException(status_code=400, detail="El documento ya se encuentra publicado y sellado")

    # Solo revisores/directores del módulo o administradores pueden sellar y publicar
    if not puede_revisar_documentos(u):
        raise HTTPException(status_code=403, detail="Solo un revisor o directivo puede publicar el documento")

    # El documento debe haber pasado por el flujo de aprobación
    if d.estado != "APROBADO":
        raise HTTPException(
            status_code=400,
            detail=f"El documento debe estar en estado APROBADO para publicarse (estado actual: {d.estado})"
        )

    # Generar Snapshot y calcular SHA-256 de inmutabilidad, incluyendo bitácora y gráficos
    snapshot = {
        "codigoInterno": d.codigoInterno,
        "titulo": d.titulo,
        "region": d.region,
        "fechaCorte": d.fechaCorte,
        "direccion": d.direccion,
        "nivelRiesgo": d.nivelRiesgo,
        "version": d.versionDoc or "1.0",
        "valores": [
            {
                "seccionId": v.seccionId,
                "texto": v.textoContenido or "",
                "tabla": v.datosTablaJson or "",
                "grafico": v.datosGraficoJson or "",
                "cifra": v.cifraCorte or ""
            }
            for v in d.valores
        ],
        "acciones": [
            {
                "fecha": a.fecha,
                "institucion": a.institucion or "",
                "descripcion": a.descripcion
            }
            for a in d.acciones
        ]
    }
    raw_bytes = json.dumps(snapshot, sort_keys=True, ensure_ascii=False).encode("utf-8")
    hash_sha256 = hashlib.sha256(raw_bytes).hexdigest()

    d.estado = "PUBLICADO"
    d.publicadoPor = nombre(u)
    d.publicadoAt = datetime.utcnow()
    d.hashIntegridad = hash_sha256
    d.updatedAt = datetime.utcnow()

    # Registro de auditoría
    db.add(Auditoria(
        documentoId=d.id,
        usuarioNombre=nombre(u),
        usuarioCorreo=u.get("correo"),
        accion="PUBLICACION_INMUTABLE",
        ipOrigen=request.client.host if request.client else None
    ))

    db.commit()
    return {
        "status": "ok",
        "estado": d.estado,
        "hashIntegridad": d.hashIntegridad,
        "publicadoPor": d.publicadoPor,
        "publicadoAt": d.publicadoAt.isoformat()
    }

@router.post("/documentos/{doc_id}/versionar")
def crear_nueva_version_documento(doc_id: str, data: DocumentoVersionarRequest, db: Session = Depends(get_db), u: dict = Depends(usuario_actual)):
    d_orig = _documento(db, doc_id)
    if d_orig.estado != "PUBLICADO":
        raise HTTPException(status_code=400, detail="Solo se puede generar una nueva versión a partir de un documento PUBLICADO")

    if not tiene_acceso_direccion(d_orig.direccion, d_orig.creadoPor, d_orig.nivelRiesgo, u):
        raise HTTPException(status_code=403, detail="No tiene permisos para generar una versión de este documento")

    # Generar nuevo código con sufijo de versión
    nuevo_codigo = f"{d_orig.codigoInterno}-V{data.nuevaVersion.replace('.', '_')}"
    if db.query(Documento).filter_by(codigoInterno=nuevo_codigo).first():
        nuevo_codigo += f"_{uuid.uuid4().hex[:3].upper()}"

    d_nuevo = Documento(
        plantillaId=d_orig.plantillaId,
        codigoInterno=nuevo_codigo,
        titulo=f"{d_orig.titulo} (v{data.nuevaVersion})",
        region=d_orig.region,
        fechaCorte=d_orig.fechaCorte,
        estado="BORRADOR",
        direccion=d_orig.direccion,
        nivelRiesgo=d_orig.nivelRiesgo,
        servicioMimp=d_orig.servicioMimp,
        versionDoc=data.nuevaVersion,
        documentoOrigenId=d_orig.id,
        creadoPor=nombre(u)
    )
    db.add(d_nuevo)
    db.flush()

    for v in d_orig.valores:
        db.add(Valor(
            documentoId=d_nuevo.id,
            seccionId=v.seccionId,
            textoContenido=v.textoContenido,
            datosTablaJson=v.datosTablaJson,
            datosGraficoJson=v.datosGraficoJson,
            cifraCorte=v.cifraCorte,
            actualizadoPor=nombre(u)
        ))

    db.commit()
    return {
        "id": d_nuevo.id,
        "codigoInterno": d_nuevo.codigoInterno,
        "titulo": d_nuevo.titulo,
        "versionDoc": d_nuevo.versionDoc,
        "documentoOrigenId": d_nuevo.documentoOrigenId
    }

@router.post("/seed")
def seed(db: Session = Depends(get_db), u: dict = Depends(requiere_admin)):
    return {"status": "ok", "plantillas_creadas": sembrar(db)}

