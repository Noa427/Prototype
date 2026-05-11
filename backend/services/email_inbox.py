import imaplib
import smtplib
import email as email_lib
import re
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from ..models import ChannelAccount
from .fernet_utils import decrypt_credentials

logger = logging.getLogger(__name__)


def fetch_new_emails(account: ChannelAccount) -> List[dict]:
    """Retourne les emails UNSEEN de la boîte INBOX. Les marque lus après lecture."""
    creds = decrypt_credentials(account.credentials_encrypted)
    results = []
    try:
        imap = imaplib.IMAP4_SSL(creds["imap_host"], int(creds.get("imap_port", 993)))
        imap.login(creds["imap_user"], creds["imap_pass"])
        imap.select("INBOX")
        _, data = imap.search(None, "UNSEEN")
        for num in (data[0].split() if data[0] else []):
            _, msg_data = imap.fetch(num, "(RFC822)")
            raw = msg_data[0][1] if msg_data and msg_data[0] else b""
            msg = email_lib.message_from_bytes(raw)
            body = _extract_body(msg)
            results.append({
                "from": msg.get("From", ""),
                "subject": msg.get("Subject", ""),
                "body": body.strip(),
                "message_id": msg.get("Message-ID", ""),
            })
            imap.store(num, "+FLAGS", "\\Seen")
        imap.logout()
    except Exception as e:
        logger.error(f"IMAP error for account {account.id} ({account.email_address}): {e}")
    return results


def send_reply(account: ChannelAccount, to: str, subject: str, body: str) -> bool:
    """Envoie une réponse email via SMTP."""
    creds = decrypt_credentials(account.credentials_encrypted)
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = account.email_address
        msg["To"] = to
        msg.attach(MIMEText(body, "plain", "utf-8"))
        with smtplib.SMTP(creds["smtp_host"], int(creds.get("smtp_port", 587))) as server:
            server.starttls()
            server.login(creds["smtp_user"], creds["smtp_pass"])
            server.sendmail(account.email_address, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP reply error to {to}: {e}")
        return False


def extract_email_address(raw: str) -> str:
    """Extrait l'adresse email d'un champ 'From: Name <email>'."""
    match = re.search(r"<(.+?)>", raw)
    return match.group(1) if match else raw.strip()


def _extract_body(msg) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
                return part.get_payload(decode=True).decode(errors="replace")
    return msg.get_payload(decode=True).decode(errors="replace") if not msg.is_multipart() else ""
