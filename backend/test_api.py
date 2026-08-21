import json
from sqlalchemy.orm import Session
from database import get_db
from schemas import CasoSustracionCreate
from routers.sustracion import crear_caso
from pydantic import BaseModel

class UserMock:
    def get(self, key, default): return "test_user"

def test():
    db = next(get_db())
    body = CasoSustracionCreate(
        codigo="TEST-005",
        nnaNombre="HENRRY ROBERT REIMOND CORDOVA",
        nnaSexo="Hombre",
        nnaEdad="11",
        nnaTipoEdad="Años",
        pais="Alemania",
        fechaIngreso="2026-08-20"
    )
    user = {"nombre": "Test User"}
    try:
        res = crear_caso(body, db, user)
        print("Success:", res.id)
    except Exception as e:
        print("Error from crear_caso:", e)

if __name__ == "__main__":
    test()
