from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session
import io

from ..database import get_session
from ..models import Deal, Lead, User
from ..auth import get_current_user
from ..services.pdf_service import generate_compromis, generate_mandat

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
