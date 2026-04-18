import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@aevum.app")

_simulation = not (SMTP_HOST and SMTP_USER and SMTP_PASS)


def send_email(to: str, subject: str, body: str) -> bool:
    if _simulation:
        logger.info(f"[EMAIL SIMULATION] To={to} | Subject={subject} | Body={body[:80]}...")
        return True
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(body, "plain", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP error sending to {to}: {e}")
        return False


def send_bulk(recipients: List[str], subject: str, body: str) -> dict:
    results = {"sent": 0, "failed": 0}
    for addr in recipients:
        if send_email(addr, subject, body):
            results["sent"] += 1
        else:
            results["failed"] += 1
    return results
