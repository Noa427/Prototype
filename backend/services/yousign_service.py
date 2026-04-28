import os
import json
import hmac
import hashlib
import logging
import secrets
from typing import List

logger = logging.getLogger(__name__)

YOUSIGN_API_BASE = "https://api.yousign.app/v3"


def send_for_signature(pdf_bytes: bytes, filename: str, signers: List[dict]) -> dict:
    """
    Envoie un PDF pour signature via Yousign.
    signers: [{name: str, email: str}]
    Mode simulation si YOUSIGN_API_KEY absent.
    """
    api_key = os.getenv("YOUSIGN_API_KEY")

    if not api_key:
        for s in signers:
            logger.info(f"SIMULATION: document '{filename}' envoyé à {s['email']}")
        return {
            "signature_request_id": f"sim-{secrets.token_hex(8)}",
            "signing_url": f"https://simulation.yousign.app/sign/{secrets.token_hex(4)}",
            "status": "pending",
        }

    import requests

    auth = {"Authorization": f"Bearer {api_key}"}

    # 1. Upload du document
    upload = requests.post(
        f"{YOUSIGN_API_BASE}/documents",
        headers=auth,
        files={"file": (filename, pdf_bytes, "application/pdf")},
    )
    upload.raise_for_status()
    doc_id = upload.json()["id"]

    # 2. Construire les signataires
    signer_payloads = []
    for s in signers:
        parts = s["name"].strip().split(" ", 1)
        signer_payloads.append({
            "info": {
                "first_name": parts[0],
                "last_name": parts[1] if len(parts) > 1 else parts[0],
                "email": s["email"],
            },
            "fields": [{
                "document_id": doc_id,
                "type": "signature",
                "page": 1,
                "x": 200,
                "y": 600,
                "width": 200,
                "height": 50,
            }],
        })

    resp = requests.post(
        f"{YOUSIGN_API_BASE}/signature_requests",
        headers={**auth, "Content-Type": "application/json"},
        json={
            "name": filename,
            "delivery_mode": "email",
            "signers": signer_payloads,
            "documents": [{"document_id": doc_id}],
        },
    )
    resp.raise_for_status()
    data = resp.json()

    signing_url = ""
    if data.get("signers"):
        signing_url = data["signers"][0].get("signature_link", "")

    return {
        "signature_request_id": data["id"],
        "signing_url": signing_url,
        "status": data.get("status", "pending"),
    }


def get_signature_status(signature_request_id: str) -> dict:
    """Consulte le statut d'une demande de signature."""
    api_key = os.getenv("YOUSIGN_API_KEY")

    if not api_key or signature_request_id.startswith("sim-"):
        return {"id": signature_request_id, "status": "pending"}

    import requests

    resp = requests.get(
        f"{YOUSIGN_API_BASE}/signature_requests/{signature_request_id}",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    resp.raise_for_status()
    data = resp.json()
    return {"id": data["id"], "status": data.get("status", "unknown")}


def verify_webhook(payload: bytes, signature_header: str) -> bool:
    """Vérifie la signature HMAC du webhook Yousign."""
    secret = os.getenv("YOUSIGN_WEBHOOK_SECRET", "")
    if not secret:
        return True
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature_header, expected)
