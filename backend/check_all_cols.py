import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_all_columns():
    with engine.connect() as conn:
        print("Obteniendo todas las columnas de CASOS_SUSTRACION...")
        # En Oracle, las tablas están en mayúsculas a menos que se hayan citado,
        # pero las columnas citadas mantienen su case.
        sql_cols = "SELECT column_name FROM all_tab_columns WHERE table_name = 'CASOS_SUSTRACION'"
        cols = conn.execute(text(sql_cols)).fetchall()
        
        for c in cols:
            col_name = c[0]
            try:
                # Contar no nulos
                sql_count = text(f"SELECT COUNT(\"{col_name}\") FROM \"CASOS_SUSTRACION\" WHERE \"{col_name}\" IS NOT NULL")
                count = conn.execute(sql_count).scalar()
                if count > 0:
                    print(f"Columna con datos: {col_name} ({count} registros)")
                else:
                    print(f"Columna vacía: {col_name}")
            except Exception as e:
                print(f"Error consultando {col_name}: {e}")

if __name__ == "__main__":
    check_all_columns()
