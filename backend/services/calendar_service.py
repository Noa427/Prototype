"""
Parse un calendrier iCal depuis une URL et retourne les créneaux occupés.
Cache en mémoire de 15 minutes.
"""
import time
import logging
from datetime import datetime, date, timedelta, time as time_type
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy import or_

logger = logging.getLogger(__name__)

# Cache: {url: (timestamp, [events])}
_cache: dict = {}
CACHE_TTL = 900  # 15 min


def _fetch_ical(url: str) -> List[dict]:
    """Télécharge et parse un fichier iCal. Retourne une liste de {start, end, summary}."""
    try:
        import httpx
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        return _parse_ical(resp.text)
    except Exception as e:
        logger.warning(f"iCal fetch error ({url}): {e}")
        return []


def _parse_ical(text: str) -> List[dict]:
    events = []
    in_event = False
    ev: dict = {}
    for line in text.splitlines():
        line = line.strip()
        if line == "BEGIN:VEVENT":
            in_event = True
            ev = {}
        elif line == "END:VEVENT":
            if "start" in ev and "end" in ev:
                events.append(ev)
            in_event = False
        elif in_event:
            if line.startswith("DTSTART"):
                ev["start"] = _parse_dt(line.split(":", 1)[1])
            elif line.startswith("DTEND"):
                ev["end"] = _parse_dt(line.split(":", 1)[1])
            elif line.startswith("SUMMARY"):
                ev["summary"] = line.split(":", 1)[1] if ":" in line else ""
    return events


def _parse_dt(raw: str) -> Optional[datetime]:
    raw = raw.strip()
    for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%dT%H%M%S", "%Y%m%d"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def get_busy_slots(calendar_url: str) -> List[dict]:
    """Retourne les événements iCal (avec cache 15 min)."""
    now = time.time()
    if calendar_url in _cache:
        ts, events = _cache[calendar_url]
        if now - ts < CACHE_TTL:
            return events
    events = _fetch_ical(calendar_url)
    _cache[calendar_url] = (now, events)
    return events


def get_available_slots(
    target_date: date,
    work_days: List[int],
    start_time: str,
    end_time: str,
    slot_duration: int,
    lunch_start: str,
    lunch_end: str,
    excluded_dates: List[str],
    calendar_url: Optional[str] = None,
    blocked_ranges: Optional[List[tuple]] = None,
) -> List[str]:
    """
    Retourne les créneaux disponibles pour une date donnée (format HH:MM).
    Exclut : jours non ouvrés, pauses déjeuner, dates exclues, événements iCal.
    """
    # Jour de la semaine (1=lun, 7=dim)
    weekday = target_date.isoweekday()
    if weekday not in work_days:
        return []
    if target_date.isoformat() in excluded_dates:
        return []

    # Générer tous les créneaux de la journée
    h_start = int(start_time.split(":")[0])
    m_start = int(start_time.split(":")[1])
    h_end = int(end_time.split(":")[0])
    m_end = int(end_time.split(":")[1])
    h_lunch_s = int(lunch_start.split(":")[0])
    m_lunch_s = int(lunch_start.split(":")[1])
    h_lunch_e = int(lunch_end.split(":")[0])
    m_lunch_e = int(lunch_end.split(":")[1])

    lunch_s_min = h_lunch_s * 60 + m_lunch_s
    lunch_e_min = h_lunch_e * 60 + m_lunch_e
    day_start_min = h_start * 60 + m_start
    day_end_min = h_end * 60 + m_end

    # Créneaux occupés par iCal
    busy_ranges = []
    if calendar_url:
        for ev in get_busy_slots(calendar_url):
            if ev["start"] and ev["end"]:
                ev_date = ev["start"].date()
                if ev_date == target_date:
                    s = ev["start"].hour * 60 + ev["start"].minute
                    e = ev["end"].hour * 60 + ev["end"].minute
                    busy_ranges.append((s, e))

    if blocked_ranges:
        busy_ranges.extend(blocked_ranges)

    slots = []
    cur = day_start_min
    while cur + slot_duration <= day_end_min:
        slot_end = cur + slot_duration
        # Pause déjeuner
        if cur < lunch_e_min and slot_end > lunch_s_min:
            cur = lunch_e_min
            continue
        # iCal busy
        overlaps = any(s < slot_end and e > cur for s, e in busy_ranges)
        if not overlaps:
            slots.append(f"{cur // 60:02d}:{cur % 60:02d}")
        cur += slot_duration

    return slots


def get_blocked_ranges(
    session: Session,
    user_id: int,
    agency_id: int,
    target_date: date,
) -> List[tuple]:
    """Retourne les plages bloquées (start_min, end_min) pour un agent et une date."""
    from ..models import CalendarBlock  # pas de cycle : models.py n'importe pas calendar_service

    day_start = datetime.combine(target_date, time_type(0, 0, 0))
    day_end = datetime.combine(target_date, time_type(23, 59, 59))

    blocks = session.exec(
        select(CalendarBlock).where(
            CalendarBlock.agency_id == agency_id,
            or_(CalendarBlock.user_id == user_id, CalendarBlock.user_id == None),
            CalendarBlock.start_datetime <= day_end,
            CalendarBlock.end_datetime >= day_start,
        )
    ).all()

    ranges = []
    for b in blocks:
        s = max(b.start_datetime, day_start)
        e = min(b.end_datetime, day_end)
        start_min = s.hour * 60 + s.minute
        end_min = e.hour * 60 + e.minute
        ranges.append((start_min, end_min if end_min > start_min else 24 * 60))
    return ranges
