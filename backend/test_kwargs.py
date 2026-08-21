import json
from models import CasoSustracion

def test():
    data = {
        "codigo": "2026-00054",
        "nnaNombre": "HENRRY ROBERT REIMOND CORDOVA",
        "nnaSexo": "Hombre"
    }
    caso = CasoSustracion(**data)
    print("caso.nnaNombre:", caso.nnaNombre)
    print("caso.codigo:", caso.codigo)
    print("caso.__dict__:", caso.__dict__)

if __name__ == "__main__":
    test()
