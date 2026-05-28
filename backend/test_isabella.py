"""
Test PUT nnaSexo específicamente para Isabella Paredes Núñez
"""
import os, sys
sys.path.insert(0, '.')

from models import CasoSustracion
from sqlalchemy.orm import Session
from database import engine

with Session(engine) as session:
    casos = session.query(CasoSustracion).all()
    print("=== Todos los casos con nnaSexo ===")
    for c in casos:
        print(f"  {c.id[:8]}... {c.nnaNombre[:25]:25s} | nnaSexo={c.nnaSexo!r}")
    
    # Buscar Isabella
    isabella = next((c for c in casos if 'Isabella' in c.nnaNombre), None)
    if isabella:
        print(f"\n=== Actualizando Isabella ({isabella.id[:8]}...) ===")
        print(f"  Antes: nnaSexo={isabella.nnaSexo!r}")
        isabella.nnaSexo = 'Mujer'
        session.commit()
        session.refresh(isabella)
        print(f"  Después: nnaSexo={isabella.nnaSexo!r}")
        
        # Verificar con una nueva sesión
        with Session(engine) as session2:
            fresco = session2.get(CasoSustracion, isabella.id)
            print(f"  Nueva sesión: nnaSexo={fresco.nnaSexo!r}")
