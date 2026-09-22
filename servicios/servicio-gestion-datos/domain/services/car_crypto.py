import base64
import hashlib
import hmac
import os
import unicodedata
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Clave de cifrado AES-256 (32 bytes) y sal para Blind Index (HMAC-SHA256)
# Por defecto se toman de variables de entorno o valores seguros del sistema
DEFAULT_AES_KEY = os.getenv(
    "CAR_ENCRYPTION_KEY",
    "dgnna_car_secure_aes_key_2026_32b!"  # Exactamente 32 chars/bytes
).encode("utf-8")[:32]

DEFAULT_SALT = os.getenv(
    "CAR_BLIND_INDEX_SALT",
    "dgnna_car_blind_index_salt_2026_safe"
).encode("utf-8")


def normalize_text_for_index(text: str | None) -> str:
    """Normaliza texto: trim, mayúsculas y remoción de tildes para búsqueda y blind index."""
    if not text:
        return ""
    text = str(text).strip().upper()
    # Eliminar acentos
    normalized = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    # Reemplazar múltiples espacios por uno solo
    return " ".join(normalized.split())


def compute_blind_index(text: str | None, salt: bytes = DEFAULT_SALT) -> str | None:
    """Genera un Blind Index (HMAC-SHA256 determinista) para búsquedas exactas sin desencriptar."""
    norm = normalize_text_for_index(text)
    if not norm:
        return None
    return hmac.new(salt, norm.encode("utf-8"), hashlib.sha256).hexdigest()


def encrypt_text(plaintext: str | None, key: bytes = DEFAULT_AES_KEY) -> str | None:
    """Encripta texto reversiblemente usando AES-256-GCM.
    Retorna cadena codificada en Base64 con Nonce (12 bytes) + Tag + Ciphertext.
    """
    if plaintext is None or str(plaintext).strip() == "":
        return None
    
    plaintext_bytes = str(plaintext).strip().encode("utf-8")
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce estándar para GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext_bytes, None)
    
    # Combinamos nonce + ciphertext y lo representamos en base64
    combined = nonce + ciphertext
    return base64.b64encode(combined).decode("utf-8")


def decrypt_text(encrypted_b64: str | None, key: bytes = DEFAULT_AES_KEY) -> str | None:
    """Desencripta texto cifrado con AES-256-GCM."""
    if not encrypted_b64:
        return None
    try:
        combined = base64.b64decode(encrypted_b64.encode("utf-8"))
        if len(combined) < 13:
            return None
        nonce = combined[:12]
        ciphertext = combined[12:]
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
    except Exception:
        return "[ERROR_DESCIFRADO]"


def mask_name(full_name: str | None) -> str:
    """Enmascara nombres para visualización segura en la interfaz (ej. 'J*** P***')."""
    if not full_name:
        return "---"
    parts = full_name.strip().split()
    masked_parts = []
    for p in parts:
        if len(p) <= 2:
            masked_parts.append(p[0] + "*")
        else:
            masked_parts.append(p[0] + "*" * (len(p) - 1))
    return " ".join(masked_parts)
