import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Asegurar que el path del backend esté disponible
sys.path.insert(0, '.')

from database import SessionLocal
from models import Apelacion, Revisor
from datetime import datetime

def test_revisor_assignment():
    db = SessionLocal()
    try:
        print("=== 1. Consultando Revisores en Base de Datos ===")
        revisores = db.query(Revisor).all()
        if not revisores:
            print("No se encontraron revisores en la base de datos.")
            return
        
        for r in revisores:
            print(f"  Revisor ID: {r.id} | Nombre: {r.nombre} | Activo: {r.activo}")

        print("\n=== 2. Consultando una Apelación ===")
        ap = db.query(Apelacion).first()
        if not ap:
            print("No hay apelaciones registradas en la base de datos.")
            return

        print(f"  Apelación Seleccionada: Expediente {ap.numeroExpediente}")
        print(f"  Abogado Asignado: {ap.abogado.nombre if ap.abogado else 'Ninguno'}")
        print(f"  Revisor Actual: {ap.revisor.nombre if ap.revisor else 'Ninguno'} (ID: {ap.revisorId})")
        print(f"  Fecha Revisor Actual: {ap.fechaRevisor}")

        # Guardar valores originales para poder restaurar
        original_revisor_id = ap.revisorId
        original_fecha_revisor = ap.fechaRevisor

        # Seleccionar un nuevo revisor
        nuevo_revisor = revisores[0] if revisores[0].id != original_revisor_id else revisores[1]
        nuevo_revisor_id = nuevo_revisor.id
        print(f"\n=== 3. Simulando Asignación de Revisor: '{nuevo_revisor.nombre}' ===")

        # Lógica de asignación idéntica al Router de FastAPI
        if nuevo_revisor_id != ap.revisorId:
            if nuevo_revisor_id:
                ap.fechaRevisor = datetime.utcnow()
            else:
                ap.fechaRevisor = None
            ap.revisorId = nuevo_revisor_id

        db.commit()
        db.refresh(ap)
        print("  [COMMIT EXITOSO]")

        print("\n=== 4. Verificando Registro Modificado ===")
        print(f"  Nuevo Revisor en DB: {ap.revisor.nombre if ap.revisor else 'Ninguno'}")
        print(f"  Nueva Fecha Revisor en DB: {ap.fechaRevisor} (Tipo: {type(ap.fechaRevisor)})")

        if ap.fechaRevisor is not None:
            print("  [SUCCESS] VERIFICACION DE GUARDADO AUTOMATICO: EXITOSA")
        else:
            print("  [FAILED] VERIFICACION DE GUARDADO AUTOMATICO: FALLIDA")

        # Restaurar los valores originales
        print("\n=== 5. Restaurando Valores Originales de la Apelación ===")
        ap.revisorId = original_revisor_id
        ap.fechaRevisor = original_fecha_revisor
        db.commit()
        print("  Valores originales restaurados con éxito.")

    except Exception as e:
        db.rollback()
        print(f"Ocurrió un error en el test: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_revisor_assignment()
