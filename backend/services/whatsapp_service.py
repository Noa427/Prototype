import logging
from ..models import ChannelAccount
from .fernet_utils import decrypt_credentials

logger = logging.getLogger(__name__)


def send_whatsapp(to: str, text: str, account: ChannelAccount) -> bool:
    from twilio.rest import Client
    creds = decrypt_credentials(account.credentials_encrypted)
    client = Client(creds["account_sid"], creds["auth_token"])
    from_wa = f"whatsapp:{account.phone_number}"
    to_wa = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
    try:
        client.messages.create(body=text, from_=from_wa, to=to_wa)
        return True
    except Exception as e:
        logger.error(f"WhatsApp send error to {to}: {e}")
        return False
