import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_columns():
    with engine.connect() as conn:
        print("=== Columnas de APELACIONES_DB.APELACIONES ===")
        sql = """
            SELECT column_name, data_type, nullable
            FROM all_tab_columns
            WHERE owner = 'APELACIONES_DB' AND table_name = 'APELACIONES'
            ORDER BY column_id
        """
        try:
            result = conn.execute(text(sql)).fetchall()
            for r in result:
                print(f"  {r[0]:30s} {r[1]:15s} {r[2]}")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    check_columns()
