from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check all schemas/users in Oracle
    schemas = conn.execute(text("SELECT username FROM all_users ORDER BY username")).fetchall()
    print("ALL USERS/SCHEMAS IN ORACLE:")
    for s in schemas:
        if any(keyword in s[0] for keyword in ["GESTION", "DATOS", "DPNNA", "CAR", "APELACIONES", "AUTH"]):
            print(" -", s[0])
            
    # Check if GESTION_DATOS_DB or similar exists
    exact = conn.execute(text("SELECT username FROM all_users WHERE username LIKE '%GESTION%' OR username LIKE '%DPNNA%'")).fetchall()
    print("Exact matches:", exact)
