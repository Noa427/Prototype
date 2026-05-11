from datetime import date
from backend.services.calendar_service import get_available_slots


def test_slots_full_day_blocked():
    slots = get_available_slots(
        target_date=date(2026, 5, 5),  # lundi
        work_days=[1, 2, 3, 4, 5],
        start_time="09:00",
        end_time="18:00",
        slot_duration=60,
        lunch_start="12:00",
        lunch_end="13:00",
        excluded_dates=[],
        blocked_ranges=[(0, 24 * 60)],  # journée entière bloquée
    )
    assert slots == []


def test_slots_partial_block():
    slots = get_available_slots(
        target_date=date(2026, 5, 5),
        work_days=[1, 2, 3, 4, 5],
        start_time="09:00",
        end_time="18:00",
        slot_duration=60,
        lunch_start="12:00",
        lunch_end="13:00",
        excluded_dates=[],
        blocked_ranges=[(9 * 60, 12 * 60)],  # 09:00–12:00 bloqué
    )
    # Créneaux disponibles : 13:00, 14:00, 15:00, 16:00, 17:00
    assert "09:00" not in slots
    assert "13:00" in slots
