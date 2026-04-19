"""Smoke test — vérifie que seed_demo a bien créé les données attendues."""
import pytest
from sqlmodel import Session, select, func
from backend.database import engine
from backend.models import Agency, User, Deal, Lead, Notification, Campaign, Alert

DEMO_AGENCY_NAME = "Agence Dupont Immobilier"


@pytest.fixture(scope="module")
def session():
    with Session(engine) as s:
        yield s


def test_agency_exists(session):
    agency = session.exec(
        select(Agency).where(Agency.name == DEMO_AGENCY_NAME)
    ).first()
    assert agency is not None
    assert agency.status == "active"
    assert agency.location == "Lyon"


def test_agent_user_exists(session):
    user = session.exec(
        select(User).where(User.email == "agent@demo-aevum.fr")
    ).first()
    assert user is not None
    assert user.role == "client"
    assert user.is_active is True


def test_twenty_deals(session):
    agency = session.exec(
        select(Agency).where(Agency.name == DEMO_AGENCY_NAME)
    ).first()
    count = session.exec(
        select(func.count(Deal.id)).where(Deal.agency_id == agency.id)
    ).one()
    assert count == 20


def test_three_pepites(session):
    agency = session.exec(
        select(Agency).where(Agency.name == DEMO_AGENCY_NAME)
    ).first()
    pepites = session.exec(
        select(func.count(Deal.id)).where(
            Deal.agency_id == agency.id,
            Deal.aevum_score >= 9
        )
    ).one()
    assert pepites == 3


def test_fifteen_leads(session):
    user = session.exec(
        select(User).where(User.email == "agent@demo-aevum.fr")
    ).first()
    count = session.exec(
        select(func.count(Lead.id)).where(Lead.assigned_to == user.id)
    ).one()
    assert count == 15


def test_lead_distribution(session):
    user = session.exec(
        select(User).where(User.email == "agent@demo-aevum.fr")
    ).first()
    chauds = session.exec(
        select(func.count(Lead.id)).where(
            Lead.assigned_to == user.id,
            Lead.score_chaleur >= 8
        )
    ).one()
    froids = session.exec(
        select(func.count(Lead.id)).where(
            Lead.assigned_to == user.id,
            Lead.score_chaleur <= 3
        )
    ).one()
    assert chauds == 5
    assert froids == 5


def test_eight_notifications(session):
    user = session.exec(
        select(User).where(User.email == "agent@demo-aevum.fr")
    ).first()
    total = session.exec(
        select(func.count(Notification.id)).where(Notification.user_id == user.id)
    ).one()
    unread = session.exec(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.is_read == False
        )
    ).one()
    assert total == 8
    assert unread == 3


def test_three_campaigns(session):
    count = session.exec(select(func.count(Campaign.id))).one()
    assert count >= 3


def test_five_alerts(session):
    user = session.exec(
        select(User).where(User.email == "agent@demo-aevum.fr")
    ).first()
    count = session.exec(
        select(func.count(Alert.id)).where(Alert.user_id == user.id)
    ).one()
    assert count == 5
