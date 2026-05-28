from database import SessionLocal
from models import Apelacion, Abogado

def check_data():
    db = SessionLocal()
    try:
        apelaciones = db.query(Apelacion).all()
        print(f"Total apelaciones: {len(apelaciones)}")
        for a in apelaciones:
            print(f"ID: {a.id}, Estado: {a.estado}, Puntos: {a.puntosTotal}, AbogadoID: {a.abogadoId}")
            
        abogados = db.query(Abogado).all()
        print(f"\nTotal abogados: {len(abogados)}")
        for ab in abogados:
            print(f"ID: {ab.id}, Nombre: {ab.nombre}")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
