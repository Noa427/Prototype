import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlmodel import Session, select
from pydantic import BaseModel
from sqlalchemy import or_

from ..database import get_session
from ..auth import get_current_user, get_gerant_user, User
from ..models import ChannelAccount, ChannelConversation
from ..services.fernet_utils import encrypt_credentials, decrypt_credentials
from ..services.omnichannel_ai import qualify_and_respond

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/channels", tags=["channels"])

_EMPTY_TML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'


def _twiml_reply(text: str) -> Response:
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{text}</Message></Response>'
    return Response(content=xml, media_type="text/xml")


def _get_or_create_conversation(
    session: Session, account: ChannelAccount, external_id: str, sender_identity: str
) -> ChannelConversation:
    conv = session.exec(
        select(ChannelConversation).where(
            ChannelConversation.channel_account_id == account.id,
            ChannelConversation.external_id == external_id,
        )
    ).first()
    if not conv:
        conv = ChannelConversation(
            agency_id=account.agency_id,
            channel_account_id=account.id,
            external_id=external_id,
            sender_identity=sender_identity,
        )
        session.add(conv)
        session.commit()
        session.refresh(conv)
    return conv


# ── Webhooks ──────────────────────────────────────────────────────────────────

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request, session: Session = Depends(get_session)):
    form = await request.form()
    from_number = str(form.get("From", ""))
    body = str(form.get("Body", "")).strip()
    to_number = str(form.get("To", "")).replace("whatsapp:", "")

    account = session.exec(
        select(ChannelAccount).where(
            ChannelAccount.channel_type == "whatsapp",
            ChannelAccount.is_active == True,
            or_(
                ChannelAccount.phone_number == to_number,
                ChannelAccount.phone_number == f"whatsapp:{to_number}",
            ),
        )
    ).first()
    if not account:
        return Response(content=_EMPTY_TML, media_type="text/xml")

    conv = _get_or_create_conversation(session, account, from_number, from_number)
    if conv.agent_takeover:
        return Response(content=_EMPTY_TML, media_type="text/xml")

    reply = qualify_and_respond(body, account, conv, session)
    return _twiml_reply(reply)


@router.post("/sms/webhook")
async def sms_webhook(request: Request, session: Session = Depends(get_session)):
    form = await request.form()
    from_number = str(form.get("From", ""))
    body = str(form.get("Body", "")).strip()
    to_number = str(form.get("To", ""))

    account = session.exec(
        select(ChannelAccount).where(
            ChannelAccount.phone_number == to_number,
            ChannelAccount.channel_type == "sms",
            ChannelAccount.is_active == True,
        )
    ).first()
    if not account:
        return Response(content=_EMPTY_TML, media_type="text/xml")

    conv = _get_or_create_conversation(session, account, from_number, from_number)
    if conv.agent_takeover:
        return Response(content=_EMPTY_TML, media_type="text/xml")

    reply = qualify_and_respond(body, account, conv, session)
    return _twiml_reply(reply)


# ── Conversations ─────────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(
    channel: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    convs = session.exec(
        select(ChannelConversation).where(
            ChannelConversation.agency_id == current_user.agency_id
        ).order_by(ChannelConversation.last_message_at.desc())
    ).all()

    result = []
    for c in convs:
        acc = session.get(ChannelAccount, c.channel_account_id)
        channel_type = acc.channel_type if acc else "unknown"
        if channel and channel_type != channel:
            continue
        if status and c.status != status:
            continue
        last_msg = c.messages[-1]["content"] if c.messages else ""
        result.append({
            "id": c.id,
            "channel": channel_type,
            "sender_identity": c.sender_identity,
            "status": c.status,
            "agent_takeover": c.agent_takeover,
            "last_message_at": c.last_message_at.isoformat(),
            "lead_id": c.lead_id,
            "last_message": last_msg[:120],
        })
    return result


@router.get("/conversations/{conv_id}")
async def get_conversation(
    conv_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    conv = session.get(ChannelConversation, conv_id)
    if not conv or conv.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    acc = session.get(ChannelAccount, conv.channel_account_id)
    return {
        "id": conv.id,
        "channel": acc.channel_type if acc else "unknown",
        "sender_identity": conv.sender_identity,
        "status": conv.status,
        "agent_takeover": conv.agent_takeover,
        "messages": conv.messages,
        "lead_id": conv.lead_id,
        "last_message_at": conv.last_message_at.isoformat(),
    }


class ConvPatch(BaseModel):
    agent_takeover: Optional[bool] = None
    status: Optional[str] = None


@router.patch("/conversations/{conv_id}")
async def patch_conversation(
    conv_id: int,
    body: ConvPatch,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    conv = session.get(ChannelConversation, conv_id)
    if not conv or conv.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    if body.agent_takeover is not None:
        conv.agent_takeover = body.agent_takeover
    if body.status is not None:
        conv.status = body.status
    session.add(conv)
    session.commit()
    return {"id": conv.id, "agent_takeover": conv.agent_takeover, "status": conv.status}


# ── ChannelAccount CRUD ───────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    channel_type: str
    user_id: int
    credentials: dict
    phone_number: Optional[str] = None
    email_address: Optional[str] = None


@router.post("/accounts")
async def create_account(
    body: AccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
    acc = ChannelAccount(
        agency_id=current_user.agency_id,
        user_id=body.user_id,
        channel_type=body.channel_type,
        credentials_encrypted=encrypt_credentials(body.credentials),
        phone_number=body.phone_number,
        email_address=body.email_address,
    )
    session.add(acc)
    session.commit()
    session.refresh(acc)
    return {"id": acc.id, "channel_type": acc.channel_type, "is_active": acc.is_active}


@router.get("/accounts")
async def list_accounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
    accounts = session.exec(
        select(ChannelAccount).where(
            ChannelAccount.agency_id == current_user.agency_id,
            ChannelAccount.is_active == True,
        )
    ).all()
    return [
        {
            "id": a.id, "channel_type": a.channel_type,
            "phone_number": a.phone_number, "email_address": a.email_address,
            "user_id": a.user_id,
            "last_sync": a.last_sync.isoformat() if a.last_sync else None,
        }
        for a in accounts
    ]


@router.delete("/accounts/{acc_id}")
async def delete_account(
    acc_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
    acc = session.get(ChannelAccount, acc_id)
    if not acc or acc.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    acc.is_active = False
    session.add(acc)
    session.commit()
    return {"message": "Désactivé"}


@router.post("/accounts/{acc_id}/test")
async def test_account(
    acc_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
    acc = session.get(ChannelAccount, acc_id)
    if not acc or acc.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    creds = decrypt_credentials(acc.credentials_encrypted)

    if acc.channel_type in ("whatsapp", "sms"):
        try:
            from twilio.rest import Client
            Client(creds["account_sid"], creds["auth_token"]).api.accounts(creds["account_sid"]).fetch()
            return {"status": "ok", "message": "Connexion Twilio réussie"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    if acc.channel_type == "email":
        try:
            import imaplib
            imap = imaplib.IMAP4_SSL(creds["imap_host"], int(creds.get("imap_port", 993)))
            imap.login(creds["imap_user"], creds["imap_pass"])
            imap.logout()
            return {"status": "ok", "message": "Connexion IMAP réussie"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    return {"status": "error", "message": "Type de canal inconnu"}
