from database import engine
from sqlalchemy import text
import sys
sys.path.insert(0, r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\servicios\servicio-gestion-datos")
from domain.services.car_crypto import compute_blind_index, decrypt_text

with engine.connect() as conn:
    conn.execute(text("ALTER SESSION SET CURRENT_SCHEMA = GESTION_DATOS_DB"))
    
    # 1. Tomamos un registro cualquiera con documento
    sample = conn.execute(text("SELECT id, cod_usu, nro_doc_enc, nro_doc_hash FROM car_nna_cortes WHERE nro_doc_enc IS NOT NULL AND rownum = 1")).fetchone()
    
    print("Muestra tomada de Oracle:")
    print(" ID:", sample[0])
    print(" COD_USU:", sample[1])
    print(" NRO_DOC_ENC:", sample[2])
    print(" NRO_DOC_HASH:", sample[3])
    
    # Desciframos el documento con la clave secreta
    doc_en_claro = decrypt_text(sample[2])
    print(" Documento descifrado:", doc_en_claro)
    
    # Ahora buscamos en Oracle usando el documento en claro calculando su HMAC (Blind Index)
    blind_search = compute_blind_index(doc_en_claro)
    print(" Buscando en Oracle por Blind Index:", blind_search)
    
    found = conn.execute(text("SELECT id, cod_usu, nro_doc_enc, cod_cen, tipo_car FROM car_nna_cortes WHERE nro_doc_hash = :h"), {"h": blind_search}).fetchone()
    print(" Resultado de la búsqueda por Blind Index en Oracle:", found)
    assert found is not None
    print("¡TEST EXITOSO! Búsqueda exacta comprobada sin descifrar la base de datos.")
