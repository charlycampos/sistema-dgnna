"""
Agrega las columnas "direccionResponsable" y "nombreResponsable" a la tabla
RESERVAS_SALA en Oracle, usando la MISMA conexion de la app (.env), con el caso
EXACTO que SQLAlchemy espera (identificadores entre comillas, sensibles a may/min).

Uso:
    cd backend
    venv\Scripts\activate     (Windows)   o   source venv/bin/activate
    python migrar_responsable.py
"""
from sqlalchemy import text
from database import engine

TABLE = "RESERVAS_SALA"
COLUMNS = {
    "direccionResponsable": "VARCHAR2(200)",
    "nombreResponsable": "VARCHAR2(200)",
}


def column_exists(conn, col):
    q = text(
        "SELECT COUNT(*) FROM user_tab_columns "
        "WHERE table_name = :t AND column_name = :c"
    )
    return conn.execute(q, {"t": TABLE, "c": col}).scalar() > 0


def main():
    with engine.begin() as conn:
        who = conn.execute(text("SELECT USER FROM dual")).scalar()
        print("Conectado como esquema:", who)

        for col, tipo in COLUMNS.items():
            if column_exists(conn, col):
                print("= ya existe:", col)
                continue
            conn.execute(text('ALTER TABLE ' + TABLE + ' ADD ("' + col + '" ' + tipo + ')'))
            print("+ agregada:", col)

        print("\nColumnas actuales de RESERVAS_SALA:")
        rows = conn.execute(text(
            "SELECT column_name FROM user_tab_columns "
            "WHERE table_name = :t ORDER BY column_id"
        ), {"t": TABLE}).fetchall()
        for (name,) in rows:
            print("   -", name)

    print("\nListo.")


if __name__ == "__main__":
    main()
