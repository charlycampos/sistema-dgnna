import sys
from database import engine, SessionLocal
from sqlalchemy import text
from models import CasoSustracion
from schemas import CasoSustracionUpdate

def inspect_table():
    print("=== INSPECTING COLUMNS OF SUSTRACION_DB.CASOS_SUSTRACION ===")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'CASOS_SUSTRACION' AND OWNER = 'SUSTRACION_DB' ORDER BY COLUMN_ID"))
        for row in result:
            print(f"Col: {row[0]:<25} Type: {row[1]:<10} Length: {row[2]:<5} Nullable: {row[3]}")

if __name__ == "__main__":
    inspect_table()
