import sys
import json
import urllib.request
import urllib.error

def test_dashboard():
    # Login first to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = json.dumps({"email": "admin@dgnna.gob.pe", "password": "Admin2026!"}).encode('utf-8')
    
    print("Iniciando sesión...")
    try:
        req_login = urllib.request.Request(login_url, data=login_data, method='POST', headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req_login) as res:
            auth_data = json.loads(res.read().decode('utf-8'))
            token = auth_data["access_token"]
            print("Sesión iniciada correctamente.")
    except Exception as e:
        print(f"Error al iniciar sesión: {e}")
        return

    # Call dashboard
    dash_url = "http://localhost:8000/api/dashboard"
    print(f"Llamando dashboard en {dash_url}...")
    try:
        req = urllib.request.Request(dash_url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print(json.dumps(data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error llamando API: {e}")

if __name__ == "__main__":
    test_dashboard()
