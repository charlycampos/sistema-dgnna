import os
import jwt
from fastapi import Header, HTTPException, Depends

def usuario_actual(authorization: str | None = Header(default=None)) -> dict:
    """Extrae y valida el usuario desde el header Authorization Bearer."""
    if os.getenv("TESTING", "").lower() == "true" and not authorization:
        return {
            "nombre": "Prueba Admin",
            "correo": "prueba@example.invalid",
            "rol": "admin",
            "direccion": "DPE"
        }
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    try:
        payload = jwt.decode(
            authorization[7:],
            os.getenv("SESSION_SECRET", "dgnna-sistema-dgnna-secret-2026"),
            algorithms=["HS256"]
        )
        nombre = payload.get("nombre") or payload.get("name") or "Usuario"
        correo = payload.get("correo") or payload.get("email") or ""
        rol = payload.get("rol", "usuario")
        direccion = payload.get("direccion", "")
        return {
            "id": payload.get("userId") or payload.get("id"),
            "nombre": nombre,
            "correo": correo,
            "rol": rol,
            "direccion": direccion,
            "modulos": payload.get("modulos", [])
        }
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc


def es_admin(usuario: dict) -> bool:
    """Verifica si el usuario tiene rol de administrador."""
    return usuario.get("rol") == "admin"


def requiere_admin(usuario: dict = Depends(usuario_actual)) -> dict:
    """Dependencia de FastAPI que exige rol de administrador."""
    if not es_admin(usuario):
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador para esta acción")
    return usuario


def tiene_acceso_direccion(doc_direccion: str, doc_creador: str, nivel_riesgo: str | None, usuario: dict) -> bool:
    """Verifica si el usuario tiene permiso de lectura sobre un documento según su dirección y nivel de riesgo."""
    if es_admin(usuario):
        return True
    
    if doc_direccion in ("MULTIDIRECCIONAL", "COLABORATIVO", "CONSOLIDADO", "TODAS"):
        return True

    u_nombre = usuario.get("nombre", "")
    if doc_creador and u_nombre and doc_creador.strip().lower() == u_nombre.strip().lower():
        return True

    u_dir = usuario.get("direccion", "")
    if u_dir and u_dir.upper() == doc_direccion.upper():
        return True

    if nivel_riesgo and nivel_riesgo.upper() == "CRITICO":
        return False

    return False


def tiene_rol_en_modulo(usuario: dict, modulo: str, roles: tuple[str, ...]) -> bool:
    """Verifica si el usuario tiene alguno de los roles indicados dentro de un módulo específico."""
    for m in usuario.get("modulos", []) or []:
        if m.get("modulo") == modulo and m.get("rolModulo") in roles:
            return True
    return False


def puede_revisar_documentos(usuario: dict) -> bool:
    """Verifica si el usuario puede observar/aprobar/publicar: administrador, un rol
    global de revisor/director (compatibilidad con emisores de token que lo entreguen
    así), o el módulo "ayuda-memoria" asignado con rolModulo "directora" — la
    convención que ya usa toda la app (Gestión de Usuarios) para el rol de
    supervisión/consulta elevada de un módulo, la única vía asignable desde esa
    pantalla hoy — además de "revisor"/"director" por si un emisor de token futuro
    los usa literalmente."""
    if es_admin(usuario):
        return True
    if usuario.get("rol") in ("revisor", "director"):
        return True
    return tiene_rol_en_modulo(usuario, "ayuda-memoria", ("directora", "revisor", "director"))


def puede_editar_documento(doc, usuario: dict) -> bool:
    """Verifica si el usuario puede modificar un documento existente."""
    if es_admin(usuario):
        return True

    if getattr(doc, "estado", "").upper() in ("PUBLICADO", "HISTORICO"):
        return False

    if doc.direccion in ("MULTIDIRECCIONAL", "COLABORATIVO"):
        return True

    u_nombre = usuario.get("nombre", "")
    if doc.creadoPor and u_nombre and doc.creadoPor.strip().lower() == u_nombre.strip().lower():
        return True

    u_dir = usuario.get("direccion", "")
    if u_dir and u_dir.upper() == doc.direccion.upper():
        return True

    return False
