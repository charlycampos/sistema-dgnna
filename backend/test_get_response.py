"""
Verifica la respuesta del GET /api/sustracion/{id} para Isabella
"""
import requests

BASE = 'http://localhost:8000'

# Login
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@dgnna.gob.pe', 'password': 'Admin2026!'})
token = r.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# List all
r2 = requests.get(f'{BASE}/api/sustracion', headers=headers)
casos = r2.json()

for c in casos:
    print(f"{c['id'][:8]}... {c['nnaNombre'][:30]:30s} | nnaSexo={c.get('nnaSexo')!r} | nnaEdad={c.get('nnaEdad')!r}")

# GET individual Isabella
isabella = next((c for c in casos if 'Isabella' in c['nnaNombre']), None)
if isabella:
    r3 = requests.get(f'{BASE}/api/sustracion/{isabella["id"]}', headers=headers)
    ind = r3.json()
    print(f"\nGET individual Isabella:")
    print(f"  nnaSexo: {ind.get('nnaSexo')!r}")
    print(f"  nnaEdad: {ind.get('nnaEdad')!r}")
    print(f"  nnaNombre: {ind.get('nnaNombre')!r}")
