from backend.models import ChannelAccount, ChannelConversation
from backend.services.fernet_utils import encrypt_credentials, decrypt_credentials
import os

os.environ.setdefault("FERNET_KEY", "")  # génère une clé auto


def test_fernet_roundtrip():
    data = {"account_sid": "ACxxx", "auth_token": "secret123"}
    encrypted = encrypt_credentials(data)
    assert encrypted != str(data)
    decrypted = decrypt_credentials(encrypted)
    assert decrypted == data


def test_list_accounts_empty(client):
    tc, user, agency = client
    resp = tc.get("/api/channels/accounts")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_and_list_account(client):
    tc, user, agency = client
    payload = {
        "channel_type": "whatsapp",
        "user_id": user.id,
        "credentials": {"account_sid": "ACtest", "auth_token": "tok"},
        "phone_number": "+33600000000",
    }
    resp = tc.post("/api/channels/accounts", json=payload)
    assert resp.status_code == 200
    assert resp.json()["channel_type"] == "whatsapp"

    resp2 = tc.get("/api/channels/accounts")
    assert len(resp2.json()) == 1
    assert resp2.json()[0]["phone_number"] == "+33600000000"


def test_list_conversations_empty(client):
    tc, user, agency = client
    resp = tc.get("/api/channels/conversations")
    assert resp.status_code == 200
    assert resp.json() == []


def test_agent_cannot_create_account(client_agent):
    tc, user, agency = client_agent
    payload = {
        "channel_type": "whatsapp",
        "user_id": user.id,
        "credentials": {"account_sid": "ACtest", "auth_token": "tok"},
        "phone_number": "+33600000000",
    }
    resp = tc.post("/api/channels/accounts", json=payload)
    assert resp.status_code == 403


def test_agent_cannot_list_accounts(client_agent):
    tc, user, agency = client_agent
    resp = tc.get("/api/channels/accounts")
    assert resp.status_code == 403


def test_agent_can_read_conversations(client_agent):
    tc, user, agency = client_agent
    resp = tc.get("/api/channels/conversations")
    assert resp.status_code == 200


def test_gerant_can_create_account(client):
    tc, user, agency = client
    payload = {
        "channel_type": "sms",
        "user_id": user.id,
        "credentials": {"account_sid": "ACtest2", "auth_token": "tok2"},
        "phone_number": "+33700000001",
    }
    resp = tc.post("/api/channels/accounts", json=payload)
    assert resp.status_code == 200
    assert resp.json()["channel_type"] == "sms"
