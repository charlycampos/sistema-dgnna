import json
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict
from typing import Optional

class CasoSustracionCreate(BaseModel):
    codigo: str
    nnaNombre: str
    nnaSexo: Optional[str] = None
    nnaEdad: Optional[str] = None
    nnaTipoEdad: Optional[str] = None
    nnaFechaNac: Optional[str] = None

payload = {
    "codigo": "TEST-123",
    "nnanombre": "",
    "nnasexo": None,
    "nnaedad": None,
    "nnatipoedad": None,
    "nnafechanac": None,
    "nnaNombre": "HENRRY",
    "nnaSexo": "Hombre",
    "nnaEdad": "11",
    "nnaTipoEdad": "Años",
    "nnaFechaNac": ""
}

try:
    obj = CasoSustracionCreate(**payload)
    print(obj.model_dump())
except Exception as e:
    print(e)
