from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Usuario, UsuarioModulo
from schemas import UsuarioCreate, UsuarioUpdate, UsuarioOut
from auth import hash_password, require_admin

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.get("", response_model=List[UsuarioOut])
def listar(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return db.query(Usuario).order_by(Usuario.createdAt).all()


@router.post("", response_model=UsuarioOut, status_code=201)
def crear(
    body: UsuarioCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if not body.nombre or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Nombre, email y contraseña son requeridos")

    email = body.email.lower().strip()
    existente = db.query(Usuario).filter(Usuario.email == email).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    rol = "admin" if body.rol == "admin" else "usuario"
    usuario = Usuario(
        nombre       = body.nombre.strip(),
        email        = email,
        passwordHash = hash_password(body.password),
        rol          = rol,
        activo       = True,
    )
    db.add(usuario)
    db.flush()  # Para obtener el id antes del commit

    if rol == "usuario" and body.modulos:
        for m in body.modulos:
            db.add(UsuarioModulo(
                usuarioId = usuario.id,
                modulo    = m.modulo,
                rolModulo = m.rolModulo,
            ))

    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/{id}", response_model=UsuarioOut)
def obtener(id: str, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    u = db.query(Usuario).filter(Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return u


@router.put("/{id}", response_model=UsuarioOut)
def actualizar(
    id: str,
    body: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    u = db.query(Usuario).filter(Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if body.nombre is not None:
        u.nombre = body.nombre.strip()
    if body.email is not None:
        u.email = body.email.lower().strip()
    if body.password:
        u.passwordHash = hash_password(body.password)
    if body.rol is not None:
        u.rol = "admin" if body.rol == "admin" else "usuario"
    if body.activo is not None:
        u.activo = body.activo

    if body.modulos is not None:
        # Reemplazar módulos
        db.query(UsuarioModulo).filter(UsuarioModulo.usuarioId == id).delete()
        if u.rol == "usuario":
            for m in body.modulos:
                db.add(UsuarioModulo(usuarioId=id, modulo=m.modulo, rolModulo=m.rolModulo))

    db.commit()
    db.refresh(u)
    return u


@router.delete("/{id}")
def eliminar(id: str, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    u = db.query(Usuario).filter(Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(u)
    db.commit()
    return {"success": True}
