from database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT sys_context('userenv', 'current_schema'), sysdate FROM dual")).fetchone()
        print("Connected successfully to Oracle:", res)
except Exception as e:
    print("Oracle connection error:", e)
