"""
Cliente de auditoría no bloqueante para enviar eventos al microservicio de Auditoría.
"""
import os
import json
import threading
import httpx

AUDITORIA_URL = os.getenv("AUDITORIA_SERVICE_URL", "http://auditoria-service:8009")


def registrar_auditoria(
    modulo: str,
    tabla: str,
    registro_id: str,
    codigo_referencia: str = None,
    accion: str = "MODIFICAR",
    campos_cambiados: str = None,
    valores_previos: dict = None,
    valores_nuevos: dict = None,
    usuario_id: str = "anonimo",
    usuario_nombre: str = "Usuario",
    usuario_rol: str = None,
    ip_origen: str = None
):
    """Envía un evento de auditoría en segundo plano sin ralentizar la petición principal."""
    payload = {
        "modulo": modulo,
        "tablaAfectada": tabla,
        "registroId": str(registro_id),
        "codigoReferencia": codigo_referencia,
        "accion": accion.upper(),
        "camposCambiados": campos_cambiados,
        "valoresPrevios": json.dumps(valores_previos, default=str) if isinstance(valores_previos, dict) else valores_previos,
        "valoresNuevos": json.dumps(valores_nuevos, default=str) if isinstance(valores_nuevos, dict) else valores_nuevos,
        "usuarioId": usuario_id or "anonimo",
        "usuarioNombre": usuario_nombre or "Usuario",
        "usuarioRol": usuario_rol,
        "ipOrigen": ip_origen or "127.0.0.1"
    }

    def _send():
        try:
            with httpx.Client(timeout=2.0) as client:
                client.post(f"{AUDITORIA_URL}/api/auditoria", json=payload)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()
