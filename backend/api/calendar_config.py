from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any

from ..database import get_session
from ..models import CalendarConfig
from ..auth import get_current_user, User

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
