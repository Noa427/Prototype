import os
import json
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    key = os.getenv("FERNET_KEY", "")
    if not key:
        key = Fernet.generate_key().decode()
        os.environ["FERNET_KEY"] = key
        logger.warning("FERNET_KEY non défini — clé auto-générée. Ajouter à .env pour persistance.")
    raw = key.encode() if isinstance(key, str) else key
    return Fernet(raw)


def encrypt_credentials(data: dict) -> str:
    return _get_fernet().encrypt(json.dumps(data).encode()).decode()


def decrypt_credentials(encrypted: str) -> dict:
    return json.loads(_get_fernet().decrypt(encrypted.encode()).decode())
