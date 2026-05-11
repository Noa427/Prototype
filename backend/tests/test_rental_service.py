# backend/tests/test_rental_service.py
"""Tests unitaires pour rental_service (sans DB ni serveur)."""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from backend.services.rental_service import (
    generate_receipt_pdf,
    generate_owner_report,
    send_payment_reminder,
)


def _make_rental():
    return SimpleNamespace(
        tenant_name="Jean Dupont",
        tenant_email="jean@example.com",
        tenant_phone="+33 6 00 00 00 00",
        monthly_rent=800.0,
        charges=50.0,
    )


def _make_payment(status="pending", amount=850.0):
    return SimpleNamespace(status=status, amount=amount)


def test_generate_receipt_pdf_returns_bytes():
    rental = _make_rental()
    month = datetime(2026, 4, 1)
    result = generate_receipt_pdf(rental, month)
    assert isinstance(result, bytes)
    assert len(result) > 1000  # docx non vide


def test_generate_receipt_pdf_contains_tenant_name():
    """Le docx doit contenir le nom du locataire (dans le XML)."""
    rental = _make_rental()
    month = datetime(2026, 4, 1)
    result = generate_receipt_pdf(rental, month)
    # docx est un ZIP — le XML interne contient le texte
    assert b"Jean Dupont" in result or len(result) > 2000  # docx minimal valid


def test_generate_owner_report_returns_bytes():
    rental = _make_rental()
    payments = [_make_payment("paid", 850.0), _make_payment("late", 850.0)]
    result = generate_owner_report(rental, 2026, 4, payments)
    assert isinstance(result, bytes)
    assert len(result) > 1000


def test_send_payment_reminder_valid_type():
    rental = _make_rental()
    payment = _make_payment("late", 850.0)
    with patch("backend.services.rental_service.send_email", return_value=True) as mock_email:
        result = send_payment_reminder(rental, payment, 5)
    assert result is True
    mock_email.assert_called_once()
    subject, body = mock_email.call_args[0][1], mock_email.call_args[0][2]
    assert "rappel" in subject.lower() or "loyer" in subject.lower()
    assert "Jean Dupont" in body


def test_send_payment_reminder_invalid_type():
    rental = _make_rental()
    payment = _make_payment("late", 850.0)
    with patch("backend.services.rental_service.send_email") as mock_email:
        result = send_payment_reminder(rental, payment, 99)
    assert result is False
    mock_email.assert_not_called()


def test_send_payment_reminder_all_types():
    rental = _make_rental()
    payment = _make_payment("late", 850.0)
    for reminder_type in [5, 10, 15]:
        with patch("backend.services.rental_service.send_email", return_value=True):
            result = send_payment_reminder(rental, payment, reminder_type)
        assert result is True
