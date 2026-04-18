from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any, List, Optional
from datetime import date as date_type
from pydantic import BaseModel

from ..database import get_session
from ..models import CalendarConfig, Lead, Deal, Agency
from ..auth import get_current_user, User
from ..services.calendar_service import get_available_slots
from ..services.email_service import send_email

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _config_to_dict(cfg: CalendarConfig) -> Dict[str, Any]:
    return {
        "work_days": [int(d) for d in cfg.work_days.split(",") if d],
        "start_time": cfg.start_time,
        "end_time": cfg.end_time,
        "slot_duration": cfg.slot_duration,
        "lunch_start": cfg.lunch_start,
        "lunch_end": cfg.lunch_end,
        "excluded_dates": [d for d in cfg.excluded_dates.split(",") if d],
        "calendar_url": cfg.calendar_url,
    }


@router.get("/config")
async def get_calendar_config(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    cfg = session.exec(
        select(CalendarConfig).where(CalendarConfig.user_id == current_user.id)
    ).first()
    if not cfg:
        # Retourne les valeurs par défaut
        return {
            "work_days": [1, 2, 3, 4, 5],
            "start_time": "09:00",
            "end_time": "18:00",
            "slot_duration": 30,
            "lunch_start": "12:00",
            "lunch_end": "13:00",
            "excluded_dates": [],
            "calendar_url": None,
        }
    return _config_to_dict(cfg)


@router.put("/config")
async def save_calendar_config(
    body: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    cfg = session.exec(
        select(CalendarConfig).where(CalendarConfig.user_id == current_user.id)
    ).first()
    if not cfg:
        cfg = CalendarConfig(user_id=current_user.id)

    work_days = body.get("work_days", [1, 2, 3, 4, 5])
    cfg.work_days = ",".join(str(d) for d in work_days)
    cfg.start_time = body.get("start_time", "09:00")
    cfg.end_time = body.get("end_time", "18:00")
    cfg.slot_duration = int(body.get("slot_duration", 30))
    cfg.lunch_start = body.get("lunch_start", "12:00")
    cfg.lunch_end = body.get("lunch_end", "13:00")
    excluded = body.get("excluded_dates", [])
    cfg.excluded_dates = ",".join(excluded)
    cfg.calendar_url = body.get("calendar_url") or None

    session.add(cfg)
    session.commit()
    session.refresh(cfg)
    return _config_to_dict(cfg)


@router.get("/slots")
async def get_slots(
    date: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retourne les créneaux disponibles pour une date YYYY-MM-DD."""
    try:
        target = date_type.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format date invalide (YYYY-MM-DD)")

    cfg = session.exec(
        select(CalendarConfig).where(CalendarConfig.user_id == current_user.id)
    ).first()
    if not cfg:
        return {"date": date, "slots": []}

    work_days = [int(d) for d in cfg.work_days.split(",") if d]
    excluded = [d for d in cfg.excluded_dates.split(",") if d]

    slots = get_available_slots(
        target_date=target,
        work_days=work_days,
        start_time=cfg.start_time,
        end_time=cfg.end_time,
        slot_duration=cfg.slot_duration,
        lunch_start=cfg.lunch_start,
        lunch_end=cfg.lunch_end,
        excluded_dates=excluded,
        calendar_url=cfg.calendar_url,
    )
    return {"date": date, "slots": slots}


class BookRequest(BaseModel):
    prospect_name: str
    email: str
    phone: str = ""
    slot_datetime: str
    deal_id: Optional[int] = None


@router.post("/book")
async def book_slot(
    body: BookRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Réserve un créneau : crée un Lead + envoie email de confirmation."""
    deal_id = body.deal_id
    if not deal_id:
        deal = session.exec(
            select(Deal).where(Deal.agency_id == current_user.agency_id, Deal.is_active == True)
        ).first()
        deal_id = deal.id if deal else 1

    lead = Lead(
        full_name=body.prospect_name,
        email=body.email,
        phone=body.phone,
        budget=0,
        apport=0,
        delay="RDV",
        status="visit_scheduled",
        deal_id=deal_id,
        assigned_to=current_user.id,
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)

    send_email(
        body.email,
        "Confirmation de rendez-vous — AEVUM",
        f"Bonjour {body.prospect_name},\n\nVotre rendez-vous est confirmé pour le {body.slot_datetime}.\n\nÀ bientôt !",
    )

    return {"lead_id": lead.id, "slot": body.slot_datetime, "message": "Rendez-vous confirmé"}
