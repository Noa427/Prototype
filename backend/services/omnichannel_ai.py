import os
import json
import logging
import httpx
from datetime import date, timedelta, datetime
from sqlmodel import Session, select

from ..models import (
    Agency, ChannelAccount, ChannelConversation,
    Lead, CalendarConfig, Deal,
)
from .calendar_service import get_available_slots, get_blocked_ranges

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"


def _call_deepseek(agency_name: str, history: list, new_message: str) -> dict:
    system = f"""Tu es l'assistant virtuel de {agency_name}, une agence immobilière.
Objectif : qualifier le prospect (budget d'achat, apport disponible, délai d'achat).

Analyse l'historique et le nouveau message. Extrais les informations disponibles.
Retourne UNIQUEMENT un JSON valide, sans markdown ni texte autour :
{{
  "budget": <int euros ou null>,
  "apport": <int euros ou null>,
  "delai": <string ou null>,
  "score": <int 1-10>,
  "reply": "<ta réponse au prospect>"
}}

Règles :
- Si historique vide (premier message), commence la reply par "Bonjour, je suis l'assistant virtuel de {agency_name}. "
- Pose une seule question à la fois pour les informations manquantes
- Sois chaleureux et concis (max 3 phrases)
- score ≥ 7 = prospect chaud (a répondu à au moins 2 critères et semble motivé)
"""
    messages = [{"role": "system", "content": system}]
    for m in history[-10:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": new_message})

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                json={"model": MODEL, "messages": messages},
            )
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
        return json.loads(content)
    except Exception as e:
        logger.error(f"DeepSeek omnichannel error: {e}")
        return {"budget": None, "apport": None, "delai": None, "score": 1,
                "reply": "Je suis momentanément indisponible. Un agent vous contactera très vite !"}


def _format_slots(slots_by_date: dict) -> str:
    lines = [f"• {d} : {', '.join(s[:3])}" for d, s in slots_by_date.items() if s]
    return "\n".join(lines) if lines else ""


def _get_default_deal_id(session: Session, agency_id: int) -> int:
    deal = session.exec(
        select(Deal).where(Deal.agency_id == agency_id, Deal.is_active == True)
    ).first()
    return deal.id if deal else 1


def qualify_and_respond(
    message_text: str,
    channel_account: ChannelAccount,
    conversation: ChannelConversation,
    session: Session,
) -> str:
    agency = session.get(Agency, channel_account.agency_id)
    agency_name = agency.name if agency else "l'agence"
    history = list(conversation.messages or [])

    if not OPENROUTER_API_KEY:
        prefix = f"Bonjour, je suis l'assistant virtuel de {agency_name}. " if not history else ""
        reply = prefix + "Quel est votre budget d'achat ?"
        _save_messages(conversation, message_text, reply, session)
        return reply

    result = _call_deepseek(agency_name, history, message_text)
    reply = result.get("reply", "")
    score = result.get("score", 1)
    budget = result.get("budget")
    apport = result.get("apport")
    delai = result.get("delai")

    if score >= 7 and budget and delai:
        cfg = session.exec(
            select(CalendarConfig).where(CalendarConfig.user_id == channel_account.user_id)
        ).first()
        if cfg:
            work_days = [int(d) for d in cfg.work_days.split(",") if d]
            excluded = [d for d in cfg.excluded_dates.split(",") if d]
            slots_by_date = {}
            for delta in range(1, 8):
                target = date.today() + timedelta(days=delta)
                blocked = get_blocked_ranges(session, channel_account.user_id, channel_account.agency_id, target)
                day_slots = get_available_slots(
                    target_date=target, work_days=work_days,
                    start_time=cfg.start_time, end_time=cfg.end_time,
                    slot_duration=cfg.slot_duration, lunch_start=cfg.lunch_start,
                    lunch_end=cfg.lunch_end, excluded_dates=excluded,
                    calendar_url=cfg.calendar_url, blocked_ranges=blocked,
                )
                if day_slots:
                    slots_by_date[target.isoformat()] = day_slots
                if len(slots_by_date) >= 3:
                    break
            formatted = _format_slots(slots_by_date)
            if formatted:
                reply += f"\n\nVoici des créneaux disponibles :\n{formatted}\nLequel vous convient ?"

        if not conversation.lead_id:
            phone = conversation.sender_identity if channel_account.channel_type in ("whatsapp", "sms") else ""
            email = conversation.sender_identity if channel_account.channel_type == "email" else ""
            lead = Lead(
                full_name=conversation.sender_identity,
                email=email,
                phone=phone,
                budget=budget or 0,
                apport=apport or 0,
                delay=delai or "",
                status="qualified",
                score_chaleur=score,
                deal_id=_get_default_deal_id(session, channel_account.agency_id),
                assigned_to=channel_account.user_id,
            )
            session.add(lead)
            session.commit()
            session.refresh(lead)
            conversation.lead_id = lead.id
            conversation.status = "lead_created"

    _save_messages(conversation, message_text, reply, session)
    return reply


def _save_messages(
    conversation: ChannelConversation,
    user_msg: str,
    ai_reply: str,
    session: Session,
):
    now = datetime.utcnow().isoformat()
    msgs = list(conversation.messages or [])
    msgs.append({"role": "user", "content": user_msg, "ts": now})
    msgs.append({"role": "assistant", "content": ai_reply, "ts": now})
    conversation.messages = msgs
    conversation.last_message_at = datetime.utcnow()
    session.add(conversation)
    session.commit()
