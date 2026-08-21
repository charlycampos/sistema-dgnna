import json
from sqlalchemy.orm import Session
from database import get_db, engine
from models import CasoSustracion

def test():
    db = next(get_db())
    # Create instance directly
    caso = CasoSustracion(
        codigo="TEST-002",
        nnaNombre="",
        nnaSexo="Hombre",
        nnaEdad="11",
        nnaTipoEdad="Años",
        pais="Alemania",
        fechaIngreso="2026-08-20"
    )
    db.add(caso)
    try:
        db.commit()
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()

if __name__ == "__main__":
    test()
