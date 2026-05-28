import sys, os
sys.path.insert(0, os.getcwd())
from backend.database import SessionLocal
from backend.models import ExtensionRango
db = SessionLocal()
try:
    print([(r.descripcion, r.minFolios, r.maxFolios, r.puntos) for r in db.query(ExtensionRango).all()])
finally:
    db.close()
