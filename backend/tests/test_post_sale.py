# backend/tests/test_post_sale.py
"""Tests unitaires pour le calcul des dates post-sale (sans DB)."""
from datetime import datetime, timedelta
from backend.api.deals import compute_post_sale_steps


def test_compute_returns_7_steps():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert len(steps) == 7


def test_step_order_sequential():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    orders = [s["step_order"] for s in steps]
    assert orders == list(range(1, 8))


def test_step_1_due_date_j10():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert steps[0]["due_date"] == compromise + timedelta(days=10)


def test_step_7_due_date_j90():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert steps[6]["due_date"] == compromise + timedelta(days=90)


def test_all_steps_have_pending_status():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert all(s["status"] == "pending" for s in steps)
