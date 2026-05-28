import sys
import json
import urllib.request
import urllib.error

def test_api():
    url = "http://localhost:8000/api/sustracion"
    print(f"Buscando casos en {url}...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as res:
            casos = json.loads(res.read().decode('utf-8'))
            if not casos:
                print("No hay casos.")
                return
            caso = casos[0]
            caso_id = caso["id"]
            print(f"Caso seleccionado: {caso_id}")
            print(f"Sexo actual: {caso.get('nnaSexo')}")
            
            # Cambiamos
            nuevo = "Mujer" if caso.get("nnaSexo") != "Mujer" else "Hombre"
            print(f"Haciendo PUT para cambiar a {nuevo}...")
            
            put_url = f"{url}/{caso_id}"
            data = json.dumps({"nnaSexo": nuevo}).encode('utf-8')
            req_put = urllib.request.Request(put_url, data=data, method='PUT', headers={'Content-Type': 'application/json'})
            
            with urllib.request.urlopen(req_put) as res_put:
                res_data = json.loads(res_put.read().decode('utf-8'))
                print(f"PUT exitoso. Respuesta del servidor: {res_data.get('nnaSexo')}")
                
            req_get2 = urllib.request.Request(put_url)
            with urllib.request.urlopen(req_get2) as res_get2:
                res_data2 = json.loads(res_get2.read().decode('utf-8'))
                print(f"GET posterior. Sexo en servidor: {res_data2.get('nnaSexo')}")

    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error llamando API: {e}")

if __name__ == "__main__":
    test_api()
