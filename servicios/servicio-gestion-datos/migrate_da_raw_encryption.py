"""Migra filas RAW históricas de Adopciones/RPADO de JSON claro a AES-256-GCM."""

import argparse

from domain.services.car_crypto import encrypt_text
from infrastructure.db.database import SessionLocal
from infrastructure.db.models import DaCargaFilaRawModel


PREFIX = "enc:v1:"


def migrar(aplicar: bool = False) -> tuple[int, int]:
    db = SessionLocal()
    revisadas = 0
    pendientes = 0
    try:
        filas = db.query(DaCargaFilaRawModel).yield_per(200)
        for fila in filas:
            revisadas += 1
            contenido = str(fila.rawJson or "")
            if not contenido or contenido.startswith(PREFIX):
                continue
            pendientes += 1
            if aplicar:
                fila.rawJson = PREFIX + encrypt_text(contenido)
        if aplicar:
            db.commit()
        else:
            db.rollback()
        return revisadas, pendientes
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Aplica el cifrado; sin este indicador solo audita.")
    args = parser.parse_args()
    total, pendientes = migrar(aplicar=args.apply)
    modo = "migradas" if args.apply else "pendientes"
    print(f"Filas revisadas: {total}; filas {modo}: {pendientes}")
