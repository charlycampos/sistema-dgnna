"""Crea o repara el schema Oracle de este microservicio.

Usa la conexión administrativa ya configurada en servicio-auth y toma el
usuario/clave objetivo desde el .env de este servicio. No imprime secretos.
"""
from pathlib import Path

import oracledb
from dotenv import dotenv_values
from sqlalchemy.engine import make_url


ROOT = Path(__file__).resolve().parents[1]
ADMIN_ENV = ROOT / "servicio-auth" / ".env"
TARGET_ENV = Path(__file__).resolve().parent / ".env"


def _connection_data(env_path: Path):
    value = dotenv_values(env_path).get("DATABASE_URL")
    if not value:
        raise RuntimeError(f"DATABASE_URL no configurada en {env_path}")
    url = make_url(value)
    service_name = url.query.get("service_name")
    if not service_name:
        raise RuntimeError("La URL de Oracle no contiene service_name")
    return url, f"{url.host}:{url.port or 1521}/{service_name}"


def main():
    admin, dsn = _connection_data(ADMIN_ENV)
    target, _ = _connection_data(TARGET_ENV)
    username = (target.username or "").upper()
    password = target.password or ""
    if username != "PREVENIR_DB":
        raise RuntimeError("El usuario objetivo debe ser PREVENIR_DB")

    with oracledb.connect(user=admin.username, password=admin.password, dsn=dsn) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM dba_users WHERE username = :name", name=username)
            exists = cursor.fetchone()[0] > 0
            if exists:
                cursor.execute(f'ALTER USER {username} IDENTIFIED BY "{password}" ACCOUNT UNLOCK')
                action = "actualizado"
            else:
                cursor.execute(f'CREATE USER {username} IDENTIFIED BY "{password}"')
                action = "creado"
            cursor.execute(f"GRANT CONNECT, RESOURCE, CREATE SESSION TO {username}")
            cursor.execute(f"ALTER USER {username} QUOTA UNLIMITED ON USERS")
        connection.commit()
    print(f"Schema {username} {action} correctamente")


if __name__ == "__main__":
    main()
