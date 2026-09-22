from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    tables = conn.execute(text("SELECT table_name FROM all_tables WHERE owner = 'GESTION_DATOS_DB' ORDER BY table_name")).fetchall()
    print("TABLES IN GESTION_DATOS_DB:")
    for t in tables:
        print(" -", t[0])
        
    all_schemas = conn.execute(text("""
        SELECT owner, count(*) 
        FROM all_tables 
        WHERE owner IN ('AUTH_DB', 'APELACIONES_DB', 'SALA_DB', 'SUSTRACION_DB', 'TRANSPARENCIA_DB', 'PROYECTOS_LEY_DB', 'POI_DB', 'MAPA_DB', 'PREVENIR_DB', 'GESTION_DATOS_DB')
        GROUP BY owner
        ORDER BY owner
    """)).fetchall()
    print("\nALL RELEVANT SCHEMAS AND TABLE COUNTS:")
    for s in all_schemas:
        print(f" - {s[0]}: {s[1]} tables")
