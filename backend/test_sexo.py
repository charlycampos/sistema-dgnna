import requests, json

BASE = 'http://localhost:8000'

# Login
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@dgnna.gob.pe', 'password': 'Admin2026!'})
print('Login status:', r.status_code)
data = r.json()
token = data.get('access_token')
if not token:
    print('No token:', data)
    exit(1)

headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# List cases
r2 = requests.get(f'{BASE}/api/sustracion', headers=headers)
casos = r2.json()
print('Casos count:', len(casos))

if casos:
    c = casos[0]
    caso_id = c['id']
    print(f'First case: {caso_id} | {c["nnaNombre"]} | nnaSexo: {c.get("nnaSexo")}')
    
    # Try PUT with nnaSexo=Mujer
    payload = {'nnaSexo': 'Mujer'}
    r3 = requests.put(f'{BASE}/api/sustracion/{caso_id}', headers=headers, json=payload)
    print('PUT status:', r3.status_code)
    upd = r3.json()
    print('Response nnaSexo after PUT:', upd.get('nnaSexo'))
    
    # GET again to confirm persistence
    r4 = requests.get(f'{BASE}/api/sustracion/{caso_id}', headers=headers)
    fresh = r4.json()
    print('GET after PUT nnaSexo:', fresh.get('nnaSexo'))
