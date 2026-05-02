import logging
from ..models import ChannelAccount
from .fernet_utils import decrypt_credentials

logger = logging.getLogger(__name__)


def send_sms(to: str, text: str, account: ChannelAccount) -> bool:
    from twilio.rest import Client
    creds = decrypt_credentials(account.credentials_encrypted)
    client = Client(creds["account_sid"], creds["auth_token"])
    try:
        client.messages.create(body=text, from_=account.phone_number, to=to)
        return True
    except Exception as e:
        logger.error(f"SMS send error to {to}: {e}")
        return False
