import os,sys,unittest
from pathlib import Path
os.environ["TESTING"]="true"; os.environ["DATABASE_URL"]="sqlite:///:memory:"
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from infrastructure.db.database import Base,engine
from infrastructure.db import models
Base.metadata.create_all(engine)
from main import health
class HealthTest(unittest.TestCase):
    def test_health(self):
        result=health()
        self.assertEqual(result["status"],"ok")
        self.assertEqual(result["servicio"],"ayuda-memoria")
