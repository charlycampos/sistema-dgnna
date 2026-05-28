"""Inspecciona la respuesta raw del servidor para Isabella"""
import requests

BASE = 'http://localhost:8000'
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@dgnna.gob.pe', 'password': 'Admin2026!'})
token = r.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# GET individual Isabella directamente desde la API del servidor en vivo
r2 = requests.get(f'{BASE}/api/sustracion', headers=headers)
casos = r2.json()
isabella = next((c for c in casos if 'Isabella' in c.get('nnaNombre', '')), None)
if isabella:
    caso_id = isabella['id']
    print(f"Isabella ID: {caso_id}")
    r3 = requests.get(f'{BASE}/api/sustracion/{caso_id}', headers=headers)
    raw = r3.json()
    # Mostrar todos los campos con valor
    for k, v in raw.items():
        if v is not None and k not in ('bitacora', 'historialJudicial'):
            print(f"  {k}: {v!r}")
    # Mostrar específicamente los campos None que nos importan
    print(f"\n  nnaSexo = {raw.get('nnaSexo')!r}")
    print(f"  nnaEdad = {raw.get('nnaEdad')!r}")
    print(f"  etapa   = {raw.get('etapa')!r}")
