import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from backend.main import app
from backend.database import get_session
from backend.auth import get_current_user
from backend.models import Agency, User
from backend.auth import get_password_hash


TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.fixture(name="session", scope="function")
def session_fixture():
    SQLModel.metadata.create_all(TEST_ENGINE)
    with Session(TEST_ENGINE) as session:
        yield session
    SQLModel.metadata.drop_all(TEST_ENGINE)


@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session):
    def _get_session():
        return session

    agency = Agency(name="Test Agence", location="Paris", status="active", license_key="test-key-123")
    session.add(agency)
    session.commit()
    session.refresh(agency)

    user = User(
        username="test_gerant",
        full_name="Gérant Test",
        email="gerant@test.com",
        hashed_password=get_password_hash("password"),
        role="gérant",
        agency_id=agency.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    def _get_current_user():
        return user

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_current_user] = _get_current_user

    yield TestClient(app), user, agency

    app.dependency_overrides.clear()


@pytest.fixture(name="client_agent", scope="function")
def client_agent_fixture(session: Session):
    def _get_session():
        return session

    agency = Agency(name="Test Agence Agent", location="Lyon", status="active", license_key="agent-key-456")
    session.add(agency)
    session.commit()
    session.refresh(agency)

    user = User(
        username="test_agent_role",
        full_name="Agent Employé",
        email="agent_role@test.com",
        hashed_password=get_password_hash("password"),
        role="agent",
        agency_id=agency.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    def _get_current_user():
        return user

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_current_user] = _get_current_user

    yield TestClient(app), user, agency

    app.dependency_overrides.clear()
