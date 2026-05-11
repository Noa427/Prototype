"""
Chatbot de qualification de leads via DeepSeek (OpenRouter).
Le chatbot collecte les informations nécessaires à la création d'un Lead,
puis crée l'enregistrement en base quand toutes les infos sont disponibles.
"""
import os
import json
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session
from datetime import datetime

from ..database import get_session
from ..models import Lead, Deal, User
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"

SYSTEM_PROMPT = """Tu es un assistant de qualification immobilière pour l'agence AEVUM.
Ton rôle est de collecter les informations suivantes en conversant naturellement avec le client :
- Nom complet (full_name)
- Email (email)
- Téléphone (phone)
- Budget maximum en euros (budget)
- Apport disponible en euros (apport)
- Délai d'acquisition (delay) : ex "3 mois", "6 mois", "1 an"
- Créneau RDV souhaité (rdv_slot) : jour et heure préférés

Pose une question à la fois. Sois chaleureux et professionnel.
Quand tu as collecté toutes les informations, réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ni après) :
{
  "action": "create_lead",
  "full_name": "...",
  "email": "...",
  "phone": "...",
  "budget": 000000,
  "apport": 000000,
  "delay": "...",
  "rdv_slot": "...",
  "message": "Merci ! Votre dossier a bien été enregistré. Nous vous contacterons à [rdv_slot]."
}
Tant que tu n'as pas toutes les infos, réponds normalement en texte."""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    deal_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    lead_created: bool = False
    lead_id: Optional[int] = None


async def _call_deepseek(messages: list) -> str:
    if not OPENROUTER_API_KEY:
        return "Je suis désolé, le service de chat n'est pas configuré. Veuillez contacter l'agence directement."

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aevum.io",
                    "X-Title": "AEVUM Chat",
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                },
            )
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            logger.error(f"OpenRouter error {response.status_code}: {response.text[:200]}")
    except Exception as e:
        logger.error(f"Chat DeepSeek exception: {e}")

    return "Désolé, une erreur est survenue. Veuillez réessayer."


@router.post("/qualify", response_model=ChatResponse)
async def qualify_lead(
    req: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Construire l'historique pour DeepSeek
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    reply = await _call_deepseek(messages)

    # Détecter si DeepSeek retourne un JSON de création de lead
    lead_created = False
    lead_id = None

    if '"action": "create_lead"' in reply or '"action":"create_lead"' in reply:
        try:
            # Extraire le JSON de la réponse
            start = reply.find("{")
            end = reply.rfind("}") + 1
            data = json.loads(reply[start:end])

            if data.get("action") == "create_lead":
                deal_id = req.deal_id
                if deal_id is None:
                    # Prendre le deal le plus récent si non spécifié
                    from sqlmodel import select
                    deal = session.exec(
                        select(Deal).where(Deal.is_active == True).order_by(Deal.timestamp.desc())
                    ).first()
                    deal_id = deal.id if deal else 1

                lead = Lead(
                    full_name=data.get("full_name", "Inconnu"),
                    email=data.get("email", ""),
                    phone=data.get("phone"),
                    budget=int(data.get("budget", 0)),
                    apport=int(data.get("apport", 0)),
                    delay=data.get("delay", ""),
                    status="new",
                    deal_id=deal_id,
                    assigned_to=current_user.id,
                    created_at=datetime.utcnow(),
                )
                session.add(lead)
                session.commit()
                session.refresh(lead)

                lead_created = True
                lead_id = lead.id
                reply = data.get("message", "Votre dossier a été enregistré avec succès !")
        except Exception as e:
            logger.error(f"Failed to parse lead JSON from chat: {e}")

    return ChatResponse(reply=reply, lead_created=lead_created, lead_id=lead_id)
