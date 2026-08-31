"""
Rutas API FastAPI para el microservicio de Consulta Normativa y Administración de IA.
"""
import time
import json
import httpx
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from infrastructure.db.database import get_db
from datetime import datetime, date
from sqlalchemy import func
from infrastructure.db.models import (
    DocumentoNormativoModel, UnidadNormativaModel, ConsultaIAModel, ConfiguracionIAModel, ParametroNormativaModel
)
from domain.schemas import (
    DocumentoNormativoOut, UnidadNormativaSimpleOut, UnidadNormativaDetalleOut,
    BusquedaRespuestaOut, BusquedaItemOut, ConsultaIARequest, ConsultaIAResponse,
    CitaItem, ContextoNormativoOut, ConfiguracionIAItemOut, ConfiguracionIAGuardarIn,
    ProbarConexionIn, ProbarConexionOut, MetricasConsumoOut, ActualizarParametroIn
)
from domain.services.rag_engine import rag_engine
from domain.services.llm_provider import llm_manager

router = APIRouter()


def enmascarar_key(k: Optional[str]) -> str:
    """Enmascara la clave API mostrando solo los primeros y últimos caracteres."""
    if not k or len(k) < 8:
        return ""
    return f"{k[:7]}••••••••••••••••{k[-4:]}"


def registrar_auditoria_async(evento: dict):
    """Envía un evento de auditoría al microservicio de auditoría."""
    try:
        payload = {
            "modulo": evento.get("modulo", "normativa").lower(),
            "tablaAfectada": evento.get("tablaAfectada", "NORMATIVA"),
            "registroId": str(evento.get("registroId", "0")),
            "codigoReferencia": evento.get("codigoReferencia"),
            "accion": evento.get("accion", "CONSULTA"),
            "camposCambiados": evento.get("camposCambiados"),
            "valoresPrevios": evento.get("valoresPrevios"),
            "valoresNuevos": evento.get("valoresNuevos"),
            "usuarioId": str(evento.get("usuarioId") or evento.get("usuarioNombre") or "usr-anonimo"),
            "usuarioNombre": str(evento.get("usuarioNombre") or "Especialista DGNNA"),
            "usuarioRol": str(evento.get("usuarioRol") or "ESPECIALISTA"),
            "ipOrigen": evento.get("ipOrigen")
        }
        httpx.post("http://auditoria-service:8009/api/auditoria", json=payload, timeout=2.0)
    except Exception as e:
        print(f"[NormativaRouter] No se pudo enviar evento a auditoría: {e}")


def obtener_limite_diario(db: Session) -> int:
    """Obtiene el límite de consultas diarias por especialista configurado en BD."""
    param = db.query(ParametroNormativaModel).filter(ParametroNormativaModel.clave == "LIMITE_CONSULTAS_DIARIAS").first()
    if param and param.valor.isdigit():
        return int(param.valor)
    return 20  # Límite por defecto: 20 consultas/día


@router.get("/documentos", response_model=List[DocumentoNormativoOut])
def listar_documentos(db: Session = Depends(get_db)):
    """Lista todos los documentos normativos registrados."""
    docs = db.query(DocumentoNormativoModel).order_by(DocumentoNormativoModel.id).all()
    return docs


@router.get("/documentos/{codigo}/unidades", response_model=List[UnidadNormativaSimpleOut])
def listar_unidades_por_documento(codigo: str, db: Session = Depends(get_db)):
    """Lista todas las unidades normativas (artículos) de un documento específico."""
    doc = db.query(DocumentoNormativoModel).filter(DocumentoNormativoModel.codigo == codigo).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Documento con código {codigo} no encontrado")
    
    unidades = db.query(UnidadNormativaModel).filter(
        UnidadNormativaModel.documentoId == doc.id
    ).order_by(UnidadNormativaModel.orden).all()
    
    return [
        UnidadNormativaSimpleOut(
            id=u.id,
            documentoCodigo=doc.codigo,
            referencia=u.referencia,
            articulo=u.articulo,
            sumilla=u.sumilla,
            vigente=u.vigente,
            modificadoPor=u.modificadoPor,
            orden=u.orden
        ) for u in unidades
    ]


@router.get("/unidades/{referencia}", response_model=UnidadNormativaDetalleOut)
def obtener_unidad_detalle(referencia: str, db: Session = Depends(get_db)):
    """Obtiene el texto completo y metadatos de una unidad normativa específica."""
    u = db.query(UnidadNormativaModel).join(DocumentoNormativoModel).filter(
        UnidadNormativaModel.referencia == referencia
    ).first()
    if not u:
        raise HTTPException(status_code=404, detail="Unidad normativa no encontrada")
    
    return UnidadNormativaDetalleOut(
        id=u.id,
        documentoId=u.documentoId,
        documentoCodigo=u.documento.codigo if u.documento else None,
        referencia=u.referencia,
        libro=u.libro,
        titulo=u.titulo,
        capitulo=u.capitulo,
        articulo=u.articulo,
        numeral=u.numeral,
        literal=u.literal,
        sumilla=u.sumilla,
        texto=u.texto,
        vigente=u.vigente,
        modificadoPor=u.modificadoPor,
        paginaPdf=u.paginaPdf,
        orden=u.orden
    )


@router.get("/buscar", response_model=BusquedaRespuestaOut)
def buscar_normativa(
    q: str = Query(..., min_length=2),
    documento: Optional[str] = Query(None),
    top_k: int = Query(50, ge=1, le=100),
    usuario_nombre: Optional[str] = Query(None),
    usuario_rol: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Búsqueda literal exhaustiva de frase exacta en los 398 artículos normativos."""
    resultados = rag_engine.buscar_literal_exhaustiva(db, query=q, documento_filtro=documento, max_results=top_k)
    
    items = []
    for r in resultados:
        items.append(BusquedaItemOut(
            referencia=r.get("referencia", ""),
            documentoCodigo=r.get("documentoCodigo", ""),
            articulo=r.get("articulo"),
            sumilla=r.get("sumilla"),
            fragmento=r.get("fragmento", ""),
            score=float(r.get("score", 0.0)),
            conteoCoincidencias=r.get("conteoCoincidencias", 1),
            vigente=r.get("vigente", 1)
        ))

    # Registrar evento en microservicio de auditoría
    registrar_auditoria_async({
        "modulo": "NORMATIVA",
        "registroId": "BUSQUEDA",
        "codigoReferencia": f"BUSQUEDA-'{q[:30]}'",
        "accion": "BUSQUEDA_LITERAL_NORMATIVA",
        "camposCambiados": f"query='{q}', coincidencias={len(items)}",
        "valoresNuevos": json.dumps({"query": q, "totalCoincidencias": len(items), "filtro": documento}),
        "usuarioNombre": usuario_nombre or "Especialista DGNNA",
        "usuarioRol": usuario_rol or "ESPECIALISTA"
    })

    return BusquedaRespuestaOut(
        total=len(items),
        query=q,
        items=items
    )


@router.post("/consultar", response_model=ConsultaIAResponse)
def consultar_asistente_ia(body: ConsultaIARequest, db: Session = Depends(get_db)):
    """Consulta semántica con RAG Multi-LLM, control de cuotas y citas verificadas."""
    # 1. Asegurar claves actualizadas desde BD
    llm_manager.cargar_desde_db(db)

    # 2. Control de cuota diaria de consultas por especialista
    usr_id = body.usuarioId or body.usuarioNombre or "usr-anonimo"
    es_admin = bool(body.usuarioRol and "ADMIN" in body.usuarioRol.upper())
    limite_diario = obtener_limite_diario(db)

    # Contar consultas hechas hoy por este usuario
    hoy_inicio = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    consultas_hoy = db.query(ConsultaIAModel).filter(
        ConsultaIAModel.usuarioId == usr_id,
        ConsultaIAModel.createdAt >= hoy_inicio
    ).count()

    if not es_admin and consultas_hoy >= limite_diario:
        return ConsultaIAResponse(
            id=None,
            pregunta=body.pregunta,
            respuesta=(
                f"⚠️ **Has alcanzado tu límite diario de {limite_diario} consultas asistidas por IA para el día de hoy.**\n\n"
                "Para continuar revisando el marco normativo de manera **ilimitada y gratuita**, puedes utilizar la "
                "**Búsqueda Normal de texto completo** en el panel izquierdo o consultar directamente el índice del DL 1297 y su Reglamento.\n\n"
                "*(Si requieres ampliar tu cuota de consultas, comunícate con el Administrador del Sistema DGNNA).* "
            ),
            citas=[],
            proveedorUsado="Control de Cuota DGNNA",
            modeloUsado="Límite Diario Alcanzado",
            latenciaMs=0,
            verificado=True,
            versionCorpus="2026.1",
            limiteAlcanzado=True,
            consultasRestantesHoy=0
        )

    # 3. Recuperar fragmentos normativos relevantes
    fragmentos = rag_engine.buscar(
        db,
        query=body.pregunta,
        documento_filtro=body.documentoFiltro,
        top_k=body.topK or 4
    )

    # 4. Generar respuesta con LLM (DeepSeek -> Gemini -> OpenAI -> Claude -> Offline)
    respuesta, prov_usado, mod_usado, latencia, t_in, t_out = llm_manager.generar_respuesta(
        pregunta=body.pregunta,
        fragmentos=fragmentos,
        proveedor_solicitado=body.proveedor,
        modelo_solicitado=body.modelo
    )

    # 5. Verificar citas
    verificado, citas_encontradas = llm_manager.verificar_citas(respuesta, fragmentos)

    # 6. Mapear citas estructuradas
    citas = []
    refs_citadas = []
    for f in fragmentos:
        citas.append(CitaItem(
            referencia=f.get("referencia", ""),
            documentoCodigo=f.get("documentoCodigo", ""),
            articulo=f.get("articulo"),
            sumilla=f.get("sumilla"),
            textoExtracto=f.get("texto", "")[:250] + ("..." if len(f.get("texto", "")) > 250 else "")
        ))
        refs_citadas.append(f.get("referencia", ""))

    # 7. Registrar consulta en BD para métricas y control
    consulta_log = ConsultaIAModel(
        usuarioId=usr_id,
        usuarioNombre=body.usuarioNombre or "Especialista DGNNA",
        pregunta=body.pregunta,
        respuesta=respuesta,
        unidadesCitadas=",".join(refs_citadas),
        proveedor=prov_usado,
        modelo=mod_usado,
        latenciaMs=latencia,
        tokensEntrada=t_in,
        tokensSalida=t_out,
        verificado=1 if verificado else 0
    )
    db.add(consulta_log)
    db.commit()
    db.refresh(consulta_log)

    # 8. Registrar evento en microservicio de auditoría
    registrar_auditoria_async({
        "modulo": "NORMATIVA",
        "registroId": str(consulta_log.id),
        "codigoReferencia": f"CONSULTA-IA-{prov_usado.upper()}",
        "accion": "CONSULTA_IA_NORMATIVA",
        "camposCambiados": f"pregunta='{body.pregunta[:60]}...', proveedor={prov_usado}, tokens={t_in+t_out}",
        "valoresNuevos": json.dumps({
            "pregunta": body.pregunta,
            "proveedor": prov_usado,
            "modelo": mod_usado,
            "tokensEntrada": t_in,
            "tokensSalida": t_out,
            "latenciaMs": latencia,
            "citas": refs_citadas
        }),
        "usuarioNombre": body.usuarioNombre or "Especialista DGNNA",
        "usuarioRol": body.usuarioRol or "ESPECIALISTA"
    })

    consultas_restantes = max(0, limite_diario - (consultas_hoy + 1)) if not es_admin else 999

    return ConsultaIAResponse(
        id=consulta_log.id,
        pregunta=body.pregunta,
        respuesta=respuesta,
        citas=citas,
        proveedorUsado=prov_usado,
        modeloUsado=mod_usado,
        latenciaMs=latencia,
        verificado=verificado,
        versionCorpus="2026.1",
        limiteAlcanzado=False,
        consultasRestantesHoy=consultas_restantes
    )


@router.get("/contexto", response_model=ContextoNormativoOut)
def obtener_contexto_campo(referencia: str = Query(...), db: Session = Depends(get_db)):
    """Devuelve el sustento normativo exacto para el botón de ayuda ⓘ en otros módulos."""
    u = db.query(UnidadNormativaModel).filter(UnidadNormativaModel.referencia == referencia).first()
    if not u:
        raise HTTPException(status_code=404, detail="Referencia normativa no encontrada")
    
    return ContextoNormativoOut(
        referencia=u.referencia,
        documentoCodigo=u.documento.codigo if u.documento else "",
        articulo=u.articulo,
        sumilla=u.sumilla,
        texto=u.texto[:400] + ("..." if len(u.texto) > 400 else ""),
        vigente=bool(u.vigente == 1),
        modificadoPor=u.modificadoPor
    )


@router.get("/providers")
def listar_proveedores_disponibles(db: Session = Depends(get_db)):
    """Devuelve la disponibilidad de cada proveedor de IA."""
    llm_manager.cargar_desde_db(db)
    return llm_manager.get_available_providers()


# ── RUTAS EXCLUSIVAS PARA ADMINISTRADOR (CONFIGURACIÓN Y MÉTRICAS DE IA) ─────

PROVEEDORES_DEFAULT = [
    {"proveedor": "deepseek", "nombreDisplay": "DeepSeek (V3 / R1)", "modeloDefecto": "deepseek-chat"},
    {"proveedor": "gemini", "nombreDisplay": "Google Gemini", "modeloDefecto": "gemini-2.5-flash"},
    {"proveedor": "openai", "nombreDisplay": "OpenAI (ChatGPT)", "modeloDefecto": "gpt-4o-mini"},
    {"proveedor": "claude", "nombreDisplay": "Anthropic Claude", "modeloDefecto": "claude-3-5-haiku-20241022"}
]


@router.get("/admin/config-ia", response_model=List[ConfiguracionIAItemOut])
def obtener_configuraciones_ia(db: Session = Depends(get_db)):
    """Lista el estado de configuración y claves enmascaradas de los 4 proveedores (Solo Admin)."""
    resultado = []
    
    for p_def in PROVEEDORES_DEFAULT:
        p_code = p_def["proveedor"]
        cfg = db.query(ConfiguracionIAModel).filter(ConfiguracionIAModel.proveedor == p_code).first()
        
        key_actual = cfg.apiKey if (cfg and cfg.apiKey) else getattr(llm_manager, f"{p_code}_key", "")
        modelo_actual = (cfg.modeloDefecto if (cfg and cfg.modeloDefecto) else p_def["modeloDefecto"])
        activo_actual = cfg.activo if cfg else 1

        resultado.append(ConfiguracionIAItemOut(
            proveedor=p_code,
            nombreDisplay=p_def["nombreDisplay"],
            apiKeyEnmascarada=enmascarar_key(key_actual),
            tieneKey=bool(key_actual),
            modeloDefecto=modelo_actual,
            activo=activo_actual,
            updatedAt=cfg.updatedAt.isoformat() if (cfg and cfg.updatedAt) else None
        ))
        
    return resultado


@router.post("/admin/config-ia")
def guardar_configuracion_ia(body: ConfiguracionIAGuardarIn, db: Session = Depends(get_db)):
    """Guarda o actualiza la clave API y modelo de un proveedor en la base de datos (Solo Admin)."""
    p_code = body.proveedor.lower().strip()
    p_def = next((p for p in PROVEEDORES_DEFAULT if p["proveedor"] == p_code), None)
    if not p_def:
        raise HTTPException(status_code=400, detail=f"Proveedor '{body.proveedor}' no reconocido")

    cfg = db.query(ConfiguracionIAModel).filter(ConfiguracionIAModel.proveedor == p_code).first()
    if not cfg:
        cfg = ConfiguracionIAModel(
            proveedor=p_code,
            nombreDisplay=p_def["nombreDisplay"],
            apiKey=body.apiKey.strip() if body.apiKey else None,
            modeloDefecto=body.modeloDefecto or p_def["modeloDefecto"],
            activo=body.activo if body.activo is not None else 1,
            updatedBy="Administrador"
        )
        db.add(cfg)
    else:
        if body.apiKey is not None:
            cfg.apiKey = body.apiKey.strip() if body.apiKey.strip() else None
        if body.modeloDefecto:
            cfg.modeloDefecto = body.modeloDefecto.strip()
        if body.activo is not None:
            cfg.activo = body.activo
        cfg.updatedBy = "Administrador"

    db.commit()
    db.refresh(cfg)

    # Recargar llm_manager en caliente
    llm_manager.cargar_desde_db(db)

    # Registrar evento de auditoría
    registrar_auditoria_async({
        "modulo": "NORMATIVA",
        "registroId": str(cfg.id),
        "codigoReferencia": f"CONFIG-IA-{p_code.upper()}",
        "accion": "ACTUALIZAR_CONFIG_IA",
        "camposCambiados": f"proveedor={p_code}, modelo={cfg.modeloDefecto}",
        "valoresNuevos": json.dumps({"proveedor": p_code, "modelo": cfg.modeloDefecto, "tieneKey": bool(cfg.apiKey)}),
        "usuarioNombre": "Administrador DGNNA",
        "usuarioRol": "ADMINISTRADOR"
    })

    return {
        "status": "success",
        "mensaje": f"Configuración de {p_def['nombreDisplay']} guardada correctamente.",
        "tieneKey": bool(cfg.apiKey),
        "modelo": cfg.modeloDefecto
    }


@router.post("/admin/probar-conexion", response_model=ProbarConexionOut)
def probar_conexion_api(body: ProbarConexionIn):
    """Realiza una prueba mínima de conexión en vivo con la API Key proporcionada."""
    exito, mensaje, latencia = llm_manager.probar_conexion(
        proveedor=body.proveedor,
        api_key=body.apiKey,
        modelo=body.modelo
    )
    return ProbarConexionOut(
        exito=exito,
        mensaje=mensaje,
        latenciaMs=latencia
    )


@router.get("/admin/metricas-consumo", response_model=MetricasConsumoOut)
def obtener_metricas_consumo(db: Session = Depends(get_db)):
    """Devuelve estadísticas y métricas de consumo de tokens y consultas para el Administrador."""
    hoy_inicio = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    mes_inicio = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_hoy = db.query(ConsultaIAModel).filter(ConsultaIAModel.createdAt >= hoy_inicio).count()
    total_mes = db.query(ConsultaIAModel).filter(ConsultaIAModel.createdAt >= mes_inicio).count()
    
    tokens_res = db.query(
        func.sum(ConsultaIAModel.tokensEntrada).label("t_in"),
        func.sum(ConsultaIAModel.tokensSalida).label("t_out")
    ).filter(ConsultaIAModel.createdAt >= mes_inicio).first()

    t_in = tokens_res.t_in or 0 if tokens_res else 0
    t_out = tokens_res.t_out or 0 if tokens_res else 0
    total_tokens_mes = t_in + t_out

    # Costo estimado (promedio ponderado DeepSeek/Gemini/GPT-4o-mini ~ $0.0003 por consulta)
    costo_usd = round(total_mes * 0.0003, 4)
    limite_diario = obtener_limite_diario(db)

    # Top usuarios
    top_u = db.query(
        ConsultaIAModel.usuarioNombre,
        func.count(ConsultaIAModel.id).label("total")
    ).filter(ConsultaIAModel.createdAt >= mes_inicio).group_by(ConsultaIAModel.usuarioNombre).order_by(func.count(ConsultaIAModel.id).desc()).limit(5).all()

    top_usuarios = [{"nombre": u.usuarioNombre or "Anónimo", "totalConsultas": u.total} for u in top_u]

    # Consultas recientes
    recientes = db.query(ConsultaIAModel).order_by(ConsultaIAModel.createdAt.desc()).limit(8).all()
    consultas_recientes = [
        {
            "id": c.id,
            "usuarioNombre": c.usuarioNombre,
            "pregunta": c.pregunta[:80] + ("..." if len(c.pregunta) > 80 else ""),
            "proveedor": c.proveedor,
            "modelo": c.modelo,
            "tokens": (c.tokensEntrada or 0) + (c.tokensSalida or 0),
            "latenciaMs": c.latenciaMs,
            "createdAt": c.createdAt.isoformat()
        }
        for c in recientes
    ]

    return MetricasConsumoOut(
        totalConsultasHoy=total_hoy,
        totalConsultasMes=total_mes,
        totalTokensMes=total_tokens_mes,
        costoEstimadoUSD=costo_usd,
        limiteDiarioPorUsuario=limite_diario,
        topUsuarios=top_usuarios,
        consultasRecientes=consultas_recientes
    )


@router.post("/admin/parametros")
def actualizar_parametro_normativa(body: ActualizarParametroIn, db: Session = Depends(get_db)):
    """Actualiza parámetros operativos (ej: LIMITE_CONSULTAS_DIARIAS) (Solo Admin)."""
    param = db.query(ParametroNormativaModel).filter(ParametroNormativaModel.clave == body.clave).first()
    if not param:
        param = ParametroNormativaModel(clave=body.clave, valor=body.valor)
        db.add(param)
    else:
        param.valor = body.valor
    
    db.commit()
    db.refresh(param)

    # Registrar evento de auditoría
    registrar_auditoria_async({
        "modulo": "normativa",
        "tablaAfectada": "PARAMETROS_NORMATIVA",
        "registroId": str(param.id),
        "codigoReferencia": f"PARAM-{body.clave}",
        "accion": "ACTUALIZAR_PARAMETRO",
        "camposCambiados": f"{body.clave}={body.valor}",
        "valoresNuevos": json.dumps({"clave": body.clave, "valor": body.valor}),
        "usuarioNombre": "Administrador DGNNA",
        "usuarioRol": "ADMINISTRADOR"
    })

    return {"status": "success", "clave": param.clave, "valor": param.valor}

