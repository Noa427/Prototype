"""
Routes publiques du chat widget (pas de JWT).
Authentification via license_key uniquement.
"""
import os
import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlmodel import Session, select
from datetime import datetime

from ..database import engine
from ..models import Agency, Lead, Deal
from ..services.email_service import send_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat-public"])

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"

_SIM_REPLIES = [
    "Merci ! Quel est votre budget d'achat approximatif ?",
    "Parfait. Quel apport avez-vous disponible ?",
    "Très bien. Dans quel délai souhaitez-vous acheter ?",
    "Super ! Un agent va vous contacter très vite pour fixer un rendez-vous.",
]
_sim_counter: dict = {}


def _get_agency(license_key: str) -> Agency:
    with Session(engine) as s:
        agency = s.exec(select(Agency).where(Agency.license_key == license_key)).first()
    if not agency:
        raise HTTPException(status_code=403, detail="Licence invalide")
    if agency.status not in ("active",):
        raise HTTPException(status_code=403, detail="Licence suspendue ou révoquée")
    return agency


class WidgetMessage(BaseModel):
    message: str
    license_key: str
    context: dict = {}


class BookSlotPayload(BaseModel):
    name: str
    email: str
    phone: str = ""
    license_key: str
    budget: str = ""
    apport: str = ""
    delai: str = ""
    slot_datetime: Optional[str] = None


@router.get("/widget-config/{license_key}")
async def widget_config(license_key: str):
    agency = _get_agency(license_key)
    return {
        "agency_name": agency.name,
        "bot_name": f"Agent {agency.name}",
        "welcome_message": f"Bonjour, je suis l'assistant de {agency.name} !",
    }


@router.post("/widget")
async def chat_widget(payload: WidgetMessage):
    agency = _get_agency(payload.license_key)

    if not OPENROUTER_API_KEY:
        # Mode simulation
        count = _sim_counter.get(payload.license_key, 0)
        reply = _SIM_REPLIES[min(count, len(_SIM_REPLIES) - 1)]
        _sim_counter[payload.license_key] = count + 1
        return {"reply": reply, "simulation": True}

    system = f"""Tu es l'assistant de qualification de l'agence immobilière {agency.name}.
Pose ces 3 questions une par une :
1. Budget d'achat ?
2. Apport disponible ?
3. Délai d'achat ?
Sois chaleureux et concis (max 2 phrases par réponse)."""

    messages = [{"role": "system", "content": system}]
    ctx = payload.context
    if ctx.get("budget"):
        messages.append({"role": "assistant", "content": "Quel est votre budget ?"})
        messages.append({"role": "user", "content": ctx["budget"]})
    if ctx.get("apport"):
        messages.append({"role": "assistant", "content": "Quel est votre apport ?"})
        messages.append({"role": "user", "content": ctx["apport"]})
    if ctx.get("delai"):
        messages.append({"role": "assistant", "content": "Quel est votre délai ?"})
        messages.append({"role": "user", "content": ctx["delai"]})
    messages.append({"role": "user", "content": payload.message})

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                json={"model": MODEL, "messages": messages},
            )
        data = resp.json()
        reply = data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"OpenRouter error: {e}")
        reply = "Je suis momentanément indisponible. Un agent vous contactera très vite !"

    return {"reply": reply}


@router.post("/book-slot")
async def book_slot(payload: BookSlotPayload):
    agency = _get_agency(payload.license_key)

    # Récupérer un deal placeholder de l'agence (premier actif)
    with Session(engine) as s:
        deal = s.exec(select(Deal).where(Deal.agency_id == agency.id, Deal.is_active == True)).first()
        deal_id = deal.id if deal else 1

        budget_int = 0
        apport_int = 0
        try:
            budget_int = int("".join(filter(str.isdigit, payload.budget or "0")) or "0")
            apport_int = int("".join(filter(str.isdigit, payload.apport or "0")) or "0")
        except Exception:
            pass

        lead = Lead(
            full_name=payload.name,
            email=payload.email,
            phone=payload.phone or "",
            budget=budget_int,
            apport=apport_int,
            delay=payload.delai or "non précisé",
            status="new",
            deal_id=deal_id,
            created_at=datetime.utcnow(),
        )
        s.add(lead)
        s.commit()
        s.refresh(lead)
        lead_id = lead.id

    # Email de confirmation
    send_email(
        payload.email,
        f"Confirmation de contact — {agency.name}",
        f"Bonjour {payload.name},\n\nVotre demande de contact auprès de {agency.name} a bien été enregistrée.\n"
        f"Budget : {payload.budget}\nApport : {payload.apport}\nDélai : {payload.delai}\n\n"
        f"Un agent vous contactera très prochainement.\n\nL'équipe {agency.name}",
    )

    return {"lead_id": lead_id, "message": "Demande enregistrée, confirmation envoyée par email."}
