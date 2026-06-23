
from backend.core.config import get_settings
from cryptography.fernet import Fernet as FernetCipher
from loguru import logger


def _get_fernet_key() -> bytes | None:
    settings = get_settings()
    key = settings.fernet_key
    if not key:
        return None
    try:
        return key.encode() if isinstance(key, str) else key
    except Exception:
        return None


_fernet: FernetCipher | None = None


def _get_fernet() -> FernetCipher | None:
    global _fernet
    if _fernet is None:
        key = _get_fernet_key()
        if key:
            _fernet = FernetCipher(key)
    return _fernet


def encrypt_credentials(credentials: dict) -> str:
    cipher = _get_fernet()
    if cipher is None:
        logger.warning("FERNET_KEY not set — credentials stored in plaintext")
        import json
        return json.dumps(credentials)
    import json
    return cipher.encrypt(json.dumps(credentials).encode()).decode()


def decrypt_credentials(encrypted: str) -> dict:
    cipher = _get_fernet()
    if cipher is None:
        logger.warning("FERNET_KEY not set — reading credentials as plaintext")
        import json
        return json.loads(encrypted)
    import json
    try:
        return json.loads(cipher.decrypt(encrypted.encode()).decode())
    except Exception as e:
        logger.error(f"Failed to decrypt credentials: {e}")
        return {}
