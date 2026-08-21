from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import CasoSustracion
from database import DATABASE_URL

engine = create_engine(DATABASE_URL, echo=True)
Session = sessionmaker(bind=engine)
db = Session()

data = {
    "codigo": "2026-TEST-999",
    "nnaNombre": "HENRRY",
    "pais": "Alemania",
    "fechaIngreso": "2026-08-20"
}
caso = CasoSustracion(**data)
db.add(caso)
try:
    db.commit()
    print("OK")
except Exception as e:
    print("ERROR:", e)
