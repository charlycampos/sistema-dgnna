"""Diagnóstico simple del servidor"""
import requests

BASE = 'http://localhost:8000'

# Login
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@dgnna.gob.pe', 'password': 'Admin2026!'})
print(f"Login status: {r.status_code}")
print(f"Login response: {r.text[:200]}")

if r.status_code == 200:
    token = r.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    r2 = requests.get(f'{BASE}/api/sustracion', headers=headers)
    print(f"\nGET /api/sustracion status: {r2.status_code}")
    data = r2.json()
    print(f"Response type: {type(data)}")
    if isinstance(data, list) and data:
        c = data[0]
        print(f"First item keys: {list(c.keys())[:8]}")
        print(f"nnaSexo = {c.get('nnaSexo')!r}")
        print(f"nnaNombre = {c.get('nnaNombre')!r}")
    else:
        print(f"Response: {str(data)[:300]}")
