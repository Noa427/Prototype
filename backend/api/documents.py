from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from typing import List
from pydantic import BaseModel
import io
import os
import json

from ..database import get_session
from ..models import Deal, Lead, User, Notification
from ..auth import get_current_user
from ..services.pdf_service import generate_compromis, generate_mandat
from ..services.yousign_service import send_for_signature, get_signature_status, verify_webhook

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/deals/{deal_id}/pdf/compromis")
async def pdf_compromis(
    deal_id: int,
    lead_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    content = generate_compromis(deal, lead)
    filename = f"compromis_deal{deal_id}_lead{lead_id}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/leads/{lead_id}/pdf/mandat")
async def pdf_mandat(
    lead_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    agent_name = current_user.full_name or "Agent AEVUM"
    content = generate_mandat(lead, agent_name)
    filename = f"mandat_lead{lead_id}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/deals/{deal_id}/listing")
async def generate_listing(
    deal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Génère un texte d'annonce formaté pour multipostage."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    city = deal.city or "—"
    surface = f"{deal.surface} m²" if deal.surface else "—"
    price = f"{deal.price:,} €".replace(",", " ") if deal.price else "—"
    ppm2 = f"{deal.price_per_m2:,} €/m²".replace(",", " ") if deal.price_per_m2 else "—"
    dpe = deal.dpe or "—"
    ptype = deal.property_type or "Bien immobilier"
    desc = deal.description or "Beau bien à découvrir."

    listing_generic = f"""{ptype} — {city}
Surface : {surface} | Prix : {price} ({ppm2}) | DPE : {dpe}

{desc}

Contact : agence AEVUM — contact@aevum.io"""

    listing_leboncoin = f"""🏠 {ptype} à vendre — {city}
📐 Surface : {surface}
💶 Prix : {price}
⚡ DPE : {dpe}

{desc}

→ Contactez-nous pour une visite !"""

    listing_pap = f"""Vente {ptype.lower()} {city} — {surface} — {price}

{desc}

DPE : {dpe} | Référence : DEAL{deal_id}
Agence AEVUM | contact@aevum.io"""

    return {
        "deal_id": deal_id,
        "formats": {
            "generic": listing_generic,
            "leboncoin": listing_leboncoin,
            "pap": listing_pap,
        }
    }


# ── Signature électronique (Yousign) ─────────────────────────────────────────

class SignRequestBody(BaseModel):
    lead_id: int
    signers: List[dict]


@router.post("/deals/{deal_id}/sign")
async def sign_document(
    deal_id: int,
    body: SignRequestBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Génère le compromis et l'envoie à Yousign pour signature."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    lead = session.get(Lead, body.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    pdf_bytes = generate_compromis(deal, lead)
    filename = f"compromis_deal{deal_id}_lead{body.lead_id}.pdf"

    result = send_for_signature(pdf_bytes, filename, body.signers)

    lead.signature_request_id = result["signature_request_id"]
    lead.signature_status = "pending"
    session.add(lead)
    session.commit()

    return result


@router.get("/sign/{signature_request_id}/status")
async def sign_status(
    signature_request_id: str,
    current_user: User = Depends(get_current_user),
):
    """Consulte le statut d'une demande de signature chez Yousign."""
    return get_signature_status(signature_request_id)


@router.delete("/sign/{signature_request_id}")
async def cancel_signature(
    signature_request_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Annule une demande de signature."""
    lead = session.exec(
        select(Lead).where(Lead.signature_request_id == signature_request_id)
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Signature request not found")
    lead.signature_status = "cancelled"
    lead.signature_request_id = None
    session.add(lead)
    session.commit()
    return {"message": "Signature annulée"}


@router.post("/sign/webhook")
async def sign_webhook(
    request: Request,
    session: Session = Depends(get_session),
):
    """Reçoit les webhooks Yousign et met à jour le statut en DB."""
    payload = await request.body()
    sig_header = request.headers.get("X-Yousign-Signature-256", "")
    if not verify_webhook(payload, sig_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    data = json.loads(payload)
    event_name = data.get("event_name", "")
    sig_req_id = data.get("data", {}).get("signature_request", {}).get("id", "")

    if not sig_req_id:
        return {"received": True}

    lead = session.exec(
        select(Lead).where(Lead.signature_request_id == sig_req_id)
    ).first()
    if not lead:
        return {"received": True}

    status_map = {
        "signature_request.done": "signed",
        "signature_request.expired": "expired",
        "signer.declined": "refused",
    }
    new_status = status_map.get(event_name, "pending")
    lead.signature_status = new_status
    session.add(lead)

    notif = Notification(
        user_id=lead.assigned_to or 1,
        deal_id=lead.deal_id,
        message=f"Document {new_status} par {lead.full_name}",
    )
    session.add(notif)
    session.commit()
    return {"received": True}


@router.get("/signatures")
async def list_signatures(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Liste tous les leads avec une demande de signature."""
    leads = session.exec(
        select(Lead).where(Lead.signature_request_id != None)  # noqa: E711
    ).all()
    return [
        {
            "lead_id": l.id,
            "lead_name": l.full_name,
            "email": l.email,
            "deal_id": l.deal_id,
            "signature_request_id": l.signature_request_id,
            "signature_status": l.signature_status,
            "created_at": l.created_at,
        }
        for l in leads
    ]
