# Chat IA Multi-Canal + Calendrier Blocks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre le chat IA d'AEVUM pour répondre sur WhatsApp, SMS et Email entrant avec qualification free-form DeepSeek, créneaux RDV réels depuis CalendarConfig, et gestion des indisponibilités CalendarBlock.

**Architecture:** Service central `omnichannel_ai.py` + router `channels.py` + adaptateurs `whatsapp_service.py / sms_service.py / email_inbox.py`. Trois nouveaux modèles SQLModel : `CalendarBlock`, `ChannelAccount`, `ChannelConversation`. Frontend : page `/conversations`, page `/settings/canaux`, section Indisponibilités dans CalendarSettings.

**Tech Stack:** FastAPI · SQLModel · Alembic · cryptography (Fernet) · twilio · imaplib · APScheduler · React 18 · TailwindCSS · lucide-react

**Spec:** `docs/superpowers/specs/2026-05-01-omnichannel-chat-design.md`

---

## File Map

| Action | Fichier |
|--------|---------|
| Modify | `requirements.txt` |
| Modify | `backend/models.py` |
| Create | `alembic/versions/<hash>_add_calendar_blocks_channels.py` |
| Create | `backend/services/fernet_utils.py` |
| Modify | `backend/services/calendar_service.py` |
| Modify | `backend/api/calendar_config.py` |
| Modify | `backend/api/chat_public.py` |
| Create | `backend/services/whatsapp_service.py` |
| Create | `backend/services/sms_service.py` |
| Create | `backend/services/email_inbox.py` |
| Create | `backend/services/omnichannel_ai.py` |
| Create | `backend/api/channels.py` |
| Modify | `backend/main.py` |
| Modify | `backend/scheduler.py` |
| Create | `tests/conftest.py` |
| Create | `tests/test_calendar_service.py` |
| Create | `tests/test_channels_basic.py` |
| Modify | `src/App.jsx` |
| Modify | `src/components/Sidebar.jsx` |
| Create | `src/pages/Conversations.jsx` |
| Create | `src/pages/ChannelSettings.jsx` |
| Modify | `src/pages/CalendarSettings.jsx` |

---

## Task 1 — Dépendances

**Files:**
- Modify: `requirements.txt`

- [ ] **Ajouter les deux packages**

Après la ligne `requests==...`, ajouter :

```
cryptography==44.0.2
twilio==9.4.5
```

- [ ] **Installer**

```bash
pip install cryptography==44.0.2 twilio==9.4.5
```

Expected: installation sans erreur.

- [ ] **Commit**

```bash
git add requirements.txt
git commit -m "chore: add cryptography + twilio dependencies"
```

---

## Task 2 — Modèles DB

**Files:**
- Modify: `backend/models.py` (après la classe `CalendarConfig`, ligne ~147)

- [ ] **Ajouter les trois modèles à la fin du bloc existant**

Après la définition de `CalendarConfig`, ajouter :

```python
class CalendarBlock(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    block_type: str  # "vacation" | "appointment" | "personal"
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelAccount(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    channel_type: str  # "whatsapp" | "sms" | "email"
    credentials_encrypted: str
    phone_number: Optional[str] = None
    email_address: Optional[str] = None
    is_active: bool = Field(default=True)
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelConversation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    channel_account_id: int = Field(foreign_key="channelaccount.id")
    external_id: str = Field(index=True)
    sender_identity: str
    lead_id: Optional[int] = Field(default=None, foreign_key="lead.id")
    messages: List[dict] = Field(default=[], sa_column=Column(JSON))
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active")  # "active" | "lead_created" | "closed"
    agent_takeover: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

- [ ] **Commit**

```bash
git add backend/models.py
git commit -m "feat(models): CalendarBlock + ChannelAccount + ChannelConversation"
```

---

## Task 3 — Migration Alembic

**Files:**
- Create: `alembic/versions/<hash>_add_calendar_blocks_channels.py`

- [ ] **Générer la migration**

```bash
cd C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto
alembic revision --autogenerate -m "add_calendar_blocks_channels"
```

Expected: fichier créé dans `alembic/versions/`.

- [ ] **Vérifier le fichier généré**

Ouvrir le fichier et vérifier que `upgrade()` contient `op.create_table` pour `calendarblock`, `channelaccount`, `channelconversation`. Si des colonnes manquent ou si des ForeignKey sont incorrectes, corriger manuellement.

- [ ] **Appliquer**

```bash
alembic upgrade head
```

Expected: `INFO  [alembic.runtime.migration] Running upgrade ... -> <hash>, add_calendar_blocks_channels`

- [ ] **Commit**

```bash
git add alembic/versions/
git commit -m "feat(db): migration add_calendar_blocks_channels"
```

---

## Task 4 — Fernet Utils

**Files:**
- Create: `backend/services/fernet_utils.py`

- [ ] **Créer le fichier**

```python
import os
import json
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    key = os.getenv("FERNET_KEY", "")
    if not key:
        key = Fernet.generate_key().decode()
        os.environ["FERNET_KEY"] = key
        logger.warning(f"FERNET_KEY non défini — clé générée (ajouter à .env) : {key}")
    raw = key.encode() if isinstance(key, str) else key
    return Fernet(raw)


def encrypt_credentials(data: dict) -> str:
    return _get_fernet().encrypt(json.dumps(data).encode()).decode()


def decrypt_credentials(encrypted: str) -> dict:
    return json.loads(_get_fernet().decrypt(encrypted.encode()).decode())
```

- [ ] **Commit**

```bash
git add backend/services/fernet_utils.py
git commit -m "feat(services): fernet_utils encrypt/decrypt credentials"
```

---

## Task 5 — calendar_service.py — get_blocked_ranges + blocked_ranges param

**Files:**
- Modify: `backend/services/calendar_service.py`

- [ ] **Écrire le test unitaire (tests/test_calendar_service.py)**

Créer le fichier `tests/__init__.py` (vide) et `tests/test_calendar_service.py` :

```python
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
```

- [ ] **Lancer le test pour vérifier qu'il échoue**

```bash
pytest tests/test_calendar_service.py -v
```

Expected: FAILED — `blocked_ranges` n'existe pas encore.

- [ ] **Modifier get_available_slots dans calendar_service.py**

En haut du fichier, ajouter les imports manquants après les imports existants :

```python
from sqlmodel import Session, select
from sqlalchemy import or_
from datetime import time as time_type
```

Changer la signature de la fonction (ajouter le paramètre à la fin) :

```python
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
```

Dans le corps de la fonction, après le bloc `if calendar_url:` qui construit `busy_ranges`, ajouter :

```python
    if blocked_ranges:
        busy_ranges.extend(blocked_ranges)
```

- [ ] **Ajouter get_blocked_ranges après get_available_slots**

```python
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
```

- [ ] **Lancer les tests**

```bash
pytest tests/test_calendar_service.py -v
```

Expected: PASSED (2 tests).

- [ ] **Commit**

```bash
git add backend/services/calendar_service.py tests/
git commit -m "feat(calendar): blocked_ranges param + get_blocked_ranges helper"
```

---

## Task 6 — CalendarBlock CRUD routes + /slots corrigé

**Files:**
- Modify: `backend/api/calendar_config.py`

- [ ] **Ajouter les imports nécessaires en tête du fichier**

Après les imports existants, ajouter :

```python
from datetime import time as time_type, datetime as dt_type
from sqlalchemy import or_
from ..models import CalendarBlock
from ..services.calendar_service import get_blocked_ranges
```

- [ ] **Ajouter les schémas Pydantic**

Avant le premier `@router`, ajouter :

```python
class BlockCreate(BaseModel):
    block_type: str  # "vacation" | "appointment" | "personal"
    start_datetime: str  # ISO 8601
    end_datetime: str
    reason: Optional[str] = None
    user_id: Optional[int] = None  # None = toute l'agence


class BlockOut(BaseModel):
    id: int
    block_type: str
    start_datetime: str
    end_datetime: str
    reason: Optional[str]
    user_id: Optional[int]
```

- [ ] **Ajouter les routes CalendarBlock après /book**

```python
@router.post("/blocks")
async def create_block(
    body: BlockCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    block = CalendarBlock(
        agency_id=current_user.agency_id,
        user_id=body.user_id,
        block_type=body.block_type,
        start_datetime=dt_type.fromisoformat(body.start_datetime),
        end_datetime=dt_type.fromisoformat(body.end_datetime),
        reason=body.reason,
    )
    session.add(block)
    session.commit()
    session.refresh(block)
    return BlockOut(
        id=block.id, block_type=block.block_type,
        start_datetime=block.start_datetime.isoformat(),
        end_datetime=block.end_datetime.isoformat(),
        reason=block.reason, user_id=block.user_id,
    )


@router.get("/blocks")
async def list_blocks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    blocks = session.exec(
        select(CalendarBlock).where(
            CalendarBlock.agency_id == current_user.agency_id,
            or_(CalendarBlock.user_id == current_user.id, CalendarBlock.user_id == None),
        ).order_by(CalendarBlock.start_datetime)
    ).all()
    return [
        BlockOut(
            id=b.id, block_type=b.block_type,
            start_datetime=b.start_datetime.isoformat(),
            end_datetime=b.end_datetime.isoformat(),
            reason=b.reason, user_id=b.user_id,
        )
        for b in blocks
    ]


@router.delete("/blocks/{block_id}")
async def delete_block(
    block_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    block = session.get(CalendarBlock, block_id)
    if not block or block.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Block introuvable")
    session.delete(block)
    session.commit()
    return {"message": "Supprimé"}
```

- [ ] **Modifier GET /slots pour filtrer les CalendarBlocks**

Remplacer le corps de `get_slots` (après la récupération de `cfg`) :

```python
    work_days = [int(d) for d in cfg.work_days.split(",") if d]
    excluded = [d for d in cfg.excluded_dates.split(",") if d]
    blocked = get_blocked_ranges(session, current_user.id, current_user.agency_id, target)

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
        blocked_ranges=blocked,
    )
    return {"date": date, "slots": slots}
```

- [ ] **Commit**

```bash
git add backend/api/calendar_config.py
git commit -m "feat(calendar): CalendarBlock CRUD + /slots filtre les blocks"
```

---

## Task 7 — chat_public.py — route publique /slots

**Files:**
- Modify: `backend/api/chat_public.py`

- [ ] **Ajouter les imports manquants en tête du fichier**

```python
from .database import get_session           # déjà présent via engine
from ..models import CalendarConfig, User
from ..services.calendar_service import get_available_slots, get_blocked_ranges
```

Vérifier si `get_session` est déjà importé. S'il ne l'est pas, ajouter :
```python
from ..database import get_session
```

- [ ] **Ajouter la route GET /chat/slots/{license_key}**

Après la route `widget_config`, ajouter :

```python
@router.get("/slots/{license_key}")
async def public_slots(
    license_key: str,
    date: str,
    session: Session = Depends(get_session),
):
    """Créneaux disponibles pour le widget public (sans JWT)."""
    agency = _get_agency(license_key)
    try:
        target = date_type.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format date invalide (YYYY-MM-DD)")

    # Premier agent actif de l'agence
    user = session.exec(
        select(User).where(User.agency_id == agency.id, User.is_active == True)
    ).first()
    if not user:
        return {"date": date, "slots": []}

    cfg = session.exec(
        select(CalendarConfig).where(CalendarConfig.user_id == user.id)
    ).first()
    if not cfg:
        return {"date": date, "slots": []}

    work_days = [int(d) for d in cfg.work_days.split(",") if d]
    excluded = [d for d in cfg.excluded_dates.split(",") if d]
    blocked = get_blocked_ranges(session, user.id, agency.id, target)

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
        blocked_ranges=blocked,
    )
    return {"date": date, "slots": slots}
```

- [ ] **Commit**

```bash
git add backend/api/chat_public.py
git commit -m "feat(chat-public): route GET /chat/slots/{license_key} sans JWT"
```

---

## Task 8 — whatsapp_service.py + sms_service.py

**Files:**
- Create: `backend/services/whatsapp_service.py`
- Create: `backend/services/sms_service.py`

- [ ] **Créer whatsapp_service.py**

```python
import logging
from ..models import ChannelAccount
from .fernet_utils import decrypt_credentials

logger = logging.getLogger(__name__)


def send_whatsapp(to: str, text: str, account: ChannelAccount) -> bool:
    from twilio.rest import Client
    creds = decrypt_credentials(account.credentials_encrypted)
    client = Client(creds["account_sid"], creds["auth_token"])
    from_wa = f"whatsapp:{account.phone_number}"
    to_wa = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
    try:
        client.messages.create(body=text, from_=from_wa, to=to_wa)
        return True
    except Exception as e:
        logger.error(f"WhatsApp send error to {to}: {e}")
        return False
```

- [ ] **Créer sms_service.py**

```python
import logging
from ..models import ChannelAccount
from .fernet_utils import decrypt_credentials

logger = logging.getLogger(__name__)


def send_sms(to: str, text: str, account: ChannelAccount) -> bool:
    from twilio.rest import Client
    creds = decrypt_credentials(account.credentials_encrypted)
    client = Client(creds["account_sid"], creds["auth_token"])
    try:
        client.messages.create(body=text, from_=account.phone_number, to=to)
        return True
    except Exception as e:
        logger.error(f"SMS send error to {to}: {e}")
        return False
```

- [ ] **Commit**

```bash
git add backend/services/whatsapp_service.py backend/services/sms_service.py
git commit -m "feat(services): whatsapp_service + sms_service via Twilio"
```

---

## Task 9 — email_inbox.py

**Files:**
- Create: `backend/services/email_inbox.py`

- [ ] **Créer email_inbox.py**

```python
import imaplib
import smtplib
import email as email_lib
import re
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from ..models import ChannelAccount
from .fernet_utils import decrypt_credentials

logger = logging.getLogger(__name__)


def fetch_new_emails(account: ChannelAccount) -> List[dict]:
    """Retourne les emails UNSEEN de la boîte INBOX. Les marque lus après lecture."""
    creds = decrypt_credentials(account.credentials_encrypted)
    results = []
    try:
        imap = imaplib.IMAP4_SSL(creds["imap_host"], int(creds.get("imap_port", 993)))
        imap.login(creds["imap_user"], creds["imap_pass"])
        imap.select("INBOX")
        _, data = imap.search(None, "UNSEEN")
        for num in (data[0].split() if data[0] else []):
            _, msg_data = imap.fetch(num, "(RFC822)")
            raw = msg_data[0][1] if msg_data and msg_data[0] else b""
            msg = email_lib.message_from_bytes(raw)
            body = _extract_body(msg)
            results.append({
                "from": msg.get("From", ""),
                "subject": msg.get("Subject", ""),
                "body": body.strip(),
                "message_id": msg.get("Message-ID", ""),
            })
            imap.store(num, "+FLAGS", "\\Seen")
        imap.logout()
    except Exception as e:
        logger.error(f"IMAP error for account {account.id} ({account.email_address}): {e}")
    return results


def send_reply(account: ChannelAccount, to: str, subject: str, body: str) -> bool:
    """Envoie une réponse email via SMTP."""
    creds = decrypt_credentials(account.credentials_encrypted)
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = account.email_address
        msg["To"] = to
        msg.attach(MIMEText(body, "plain", "utf-8"))
        with smtplib.SMTP(creds["smtp_host"], int(creds.get("smtp_port", 587))) as server:
            server.starttls()
            server.login(creds["smtp_user"], creds["smtp_pass"])
            server.sendmail(account.email_address, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"SMTP reply error to {to}: {e}")
        return False


def extract_email_address(raw: str) -> str:
    """Extrait l'adresse email d'un champ 'From: Name <email>'."""
    match = re.search(r"<(.+?)>", raw)
    return match.group(1) if match else raw.strip()


def _extract_body(msg) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
                return part.get_payload(decode=True).decode(errors="replace")
    return msg.get_payload(decode=True).decode(errors="replace") if not msg.is_multipart() else ""
```

- [ ] **Commit**

```bash
git add backend/services/email_inbox.py
git commit -m "feat(services): email_inbox IMAP fetch + SMTP reply"
```

---

## Task 10 — omnichannel_ai.py

**Files:**
- Create: `backend/services/omnichannel_ai.py`

- [ ] **Créer omnichannel_ai.py**

```python
import os
import json
import logging
import httpx
from datetime import date, timedelta, datetime
from sqlmodel import Session, select

from ..models import (
    Agency, ChannelAccount, ChannelConversation,
    Lead, CalendarConfig, Deal,
)
from .calendar_service import get_available_slots, get_blocked_ranges

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"


def _call_deepseek(agency_name: str, history: list, new_message: str) -> dict:
    system = f"""Tu es l'assistant virtuel de {agency_name}, une agence immobilière.
Objectif : qualifier le prospect (budget d'achat, apport disponible, délai d'achat).

Analyse l'historique et le nouveau message. Extrais les informations disponibles.
Retourne UNIQUEMENT un JSON valide, sans markdown ni texte autour :
{{
  "budget": <int euros ou null>,
  "apport": <int euros ou null>,
  "delai": <string ou null>,
  "score": <int 1-10>,
  "reply": "<ta réponse au prospect>"
}}

Règles :
- Si historique vide (premier message), commence la reply par "Bonjour, je suis l'assistant virtuel de {agency_name}. "
- Pose une seule question à la fois pour les informations manquantes
- Sois chaleureux et concis (max 3 phrases)
- score ≥ 7 = prospect chaud (a répondu à au moins 2 critères et semble motivé)
"""
    messages = [{"role": "system", "content": system}]
    for m in history[-10:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": new_message})

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                json={"model": MODEL, "messages": messages},
            )
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
        return json.loads(content)
    except Exception as e:
        logger.error(f"DeepSeek omnichannel error: {e}")
        return {"budget": None, "apport": None, "delai": None, "score": 1,
                "reply": "Je suis momentanément indisponible. Un agent vous contactera très vite !"}


def _format_slots(slots_by_date: dict) -> str:
    lines = [f"• {d} : {', '.join(s[:3])}" for d, s in slots_by_date.items() if s]
    return "\n".join(lines) if lines else ""


def _get_default_deal_id(session: Session, agency_id: int) -> int:
    deal = session.exec(
        select(Deal).where(Deal.agency_id == agency_id, Deal.is_active == True)
    ).first()
    return deal.id if deal else 1


def qualify_and_respond(
    message_text: str,
    channel_account: ChannelAccount,
    conversation: ChannelConversation,
    session: Session,
) -> str:
    agency = session.get(Agency, channel_account.agency_id)
    agency_name = agency.name if agency else "l'agence"
    history = list(conversation.messages or [])

    if not OPENROUTER_API_KEY:
        prefix = f"Bonjour, je suis l'assistant virtuel de {agency_name}. " if not history else ""
        reply = prefix + "Quel est votre budget d'achat ?"
        _save_messages(conversation, message_text, reply, session)
        return reply

    result = _call_deepseek(agency_name, history, message_text)
    reply = result.get("reply", "")
    score = result.get("score", 1)
    budget = result.get("budget")
    apport = result.get("apport")
    delai = result.get("delai")

    if score >= 7 and budget and delai:
        cfg = session.exec(
            select(CalendarConfig).where(CalendarConfig.user_id == channel_account.user_id)
        ).first()
        if cfg:
            work_days = [int(d) for d in cfg.work_days.split(",") if d]
            excluded = [d for d in cfg.excluded_dates.split(",") if d]
            slots_by_date = {}
            for delta in range(1, 8):
                target = date.today() + timedelta(days=delta)
                blocked = get_blocked_ranges(session, channel_account.user_id, channel_account.agency_id, target)
                day_slots = get_available_slots(
                    target_date=target, work_days=work_days,
                    start_time=cfg.start_time, end_time=cfg.end_time,
                    slot_duration=cfg.slot_duration, lunch_start=cfg.lunch_start,
                    lunch_end=cfg.lunch_end, excluded_dates=excluded,
                    calendar_url=cfg.calendar_url, blocked_ranges=blocked,
                )
                if day_slots:
                    slots_by_date[target.isoformat()] = day_slots
                if len(slots_by_date) >= 3:
                    break
            formatted = _format_slots(slots_by_date)
            if formatted:
                reply += f"\n\nVoici des créneaux disponibles :\n{formatted}\nLequel vous convient ?"

        if not conversation.lead_id:
            phone = conversation.sender_identity if channel_account.channel_type in ("whatsapp", "sms") else ""
            email = conversation.sender_identity if channel_account.channel_type == "email" else ""
            lead = Lead(
                full_name=conversation.sender_identity,
                email=email,
                phone=phone,
                budget=budget or 0,
                apport=apport or 0,
                delay=delai or "",
                status="qualified",
                score_chaleur=score,
                deal_id=_get_default_deal_id(session, channel_account.agency_id),
                assigned_to=channel_account.user_id,
            )
            session.add(lead)
            session.commit()
            session.refresh(lead)
            conversation.lead_id = lead.id
            conversation.status = "lead_created"

    _save_messages(conversation, message_text, reply, session)
    return reply


def _save_messages(
    conversation: ChannelConversation,
    user_msg: str,
    ai_reply: str,
    session: Session,
):
    now = datetime.utcnow().isoformat()
    msgs = list(conversation.messages or [])
    msgs.append({"role": "user", "content": user_msg, "ts": now})
    msgs.append({"role": "assistant", "content": ai_reply, "ts": now})
    conversation.messages = msgs
    conversation.last_message_at = datetime.utcnow()
    session.add(conversation)
    session.commit()
```

- [ ] **Commit**

```bash
git add backend/services/omnichannel_ai.py
git commit -m "feat(services): omnichannel_ai qualification free-form DeepSeek + slots RDV"
```

---

## Task 11 — channels.py router

**Files:**
- Create: `backend/api/channels.py`

- [ ] **Créer channels.py**

```python
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlmodel import Session, select
from pydantic import BaseModel

from ..database import get_session
from ..auth import get_current_user, User
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
```

- [ ] **Commit**

```bash
git add backend/api/channels.py
git commit -m "feat(api): channels router WhatsApp/SMS webhooks + conversations + accounts"
```

---

## Task 12 — main.py + scheduler.py

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/scheduler.py`

- [ ] **Enregistrer le router dans main.py**

Après la ligne `from .api.rentals import router as rentals_router`, ajouter :

```python
from .api.channels import router as channels_router
```

Après la ligne `app.include_router(rentals_router, prefix="/api")`, ajouter :

```python
app.include_router(channels_router, prefix="/api")
```

- [ ] **Ajouter poll_email_inboxes dans scheduler.py**

En tête du fichier, après les imports existants, ajouter :

```python
from .models import ChannelAccount, ChannelConversation
```

Après la fonction `post_sale_alerts_job`, ajouter :

```python
def poll_email_inboxes():
    """Toutes les 5 min : traite les emails entrants UNSEEN pour tous les ChannelAccount email actifs."""
    logger.info("[SCHEDULER] Polling boîtes email...")
    from datetime import datetime
    import re
    from .services.email_inbox import fetch_new_emails, send_reply, extract_email_address
    from .services.omnichannel_ai import qualify_and_respond

    with Session(engine) as session:
        accounts = session.exec(
            select(ChannelAccount).where(
                ChannelAccount.channel_type == "email",
                ChannelAccount.is_active == True,
            )
        ).all()
        for account in accounts:
            try:
                emails = fetch_new_emails(account)
                for em in emails:
                    email_addr = extract_email_address(em["from"])
                    conv = session.exec(
                        select(ChannelConversation).where(
                            ChannelConversation.channel_account_id == account.id,
                            ChannelConversation.external_id == email_addr,
                        )
                    ).first()
                    if not conv:
                        conv = ChannelConversation(
                            agency_id=account.agency_id,
                            channel_account_id=account.id,
                            external_id=email_addr,
                            sender_identity=email_addr,
                        )
                        session.add(conv)
                        session.commit()
                        session.refresh(conv)
                    if conv.agent_takeover:
                        continue
                    reply_text = qualify_and_respond(em["body"], account, conv, session)
                    subject = f"Re: {em['subject']}" if em["subject"] else "Votre demande"
                    send_reply(account, email_addr, subject, reply_text)
                account.last_sync = datetime.utcnow()
                session.add(account)
                session.commit()
            except Exception as e:
                logger.error(f"[SCHEDULER] Email poll error account {account.id}: {e}")
```

Dans `start_scheduler()`, avant `scheduler.start()`, ajouter :

```python
        scheduler.add_job(
            poll_email_inboxes,
            trigger=IntervalTrigger(minutes=5),
            id="email_poll_job",
            replace_existing=True,
        )
```

- [ ] **Vérifier le démarrage**

```bash
python -c "from backend.main import app; print('OK')"
```

Expected: `OK` sans erreur d'import.

- [ ] **Commit**

```bash
git add backend/main.py backend/scheduler.py
git commit -m "feat: register channels router + IMAP polling job scheduler"
```

---

## Task 13 — Tests

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`
- Modify: `tests/test_calendar_service.py` (déjà créé à Task 5)
- Create: `tests/test_channels_basic.py`

- [ ] **Créer tests/conftest.py**

```python
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
        username="test_agent",
        full_name="Agent Test",
        email="agent@test.com",
        hashed_password=get_password_hash("password"),
        role="client",
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
```

- [ ] **Créer tests/test_channels_basic.py**

```python
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
```

- [ ] **Lancer tous les tests**

```bash
pytest tests/ -v
```

Expected: tous PASSED.

- [ ] **Commit**

```bash
git add tests/
git commit -m "test: conftest + test_calendar_service + test_channels_basic"
```

---

## Task 14 — Frontend : App.jsx + Sidebar.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Ajouter les imports et routes dans App.jsx**

Après `import Rentals from './pages/Rentals';`, ajouter :

```jsx
import Conversations from './pages/Conversations';
import ChannelSettings from './pages/ChannelSettings';
```

Dans le bloc `<Routes>`, après la route `/rentals`, ajouter :

```jsx
<Route path="/conversations" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
<Route path="/settings/canaux" element={<ProtectedRoute><ChannelSettings /></ProtectedRoute>} />
```

- [ ] **Ajouter les entrées dans Sidebar.jsx**

En haut du fichier, modifier l'import lucide-react pour ajouter `MessageSquare` et `Plug` :

```jsx
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, Home, ChevronDown, MessageSquare, Plug } from 'lucide-react';
```

Dans `clientSections`, après la section `gestion`, ajouter une nouvelle section :

```jsx
  {
    id: 'omnichannel',
    label: 'Chat IA',
    emoji: '💬',
    items: [
      { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
      { icon: Plug, label: 'Canaux', path: '/settings/canaux' },
    ],
  },
```

- [ ] **Commit**

```bash
git add src/App.jsx src/components/Sidebar.jsx
git commit -m "feat(frontend): routes Conversations + ChannelSettings + sidebar Chat IA section"
```

---

## Task 15 — Frontend : Conversations.jsx

**Files:**
- Create: `src/pages/Conversations.jsx`

- [ ] **Créer Conversations.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Mail, RefreshCw, UserCheck } from 'lucide-react';
import api from '../services/api';

const CHANNEL_BADGE = {
  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  sms: { label: 'SMS', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  email: { label: 'Email', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  unknown: { label: '?', cls: 'bg-white/10 text-white/50 border-white/20' },
};

const STATUS_BADGE = {
  active: 'bg-yellow-500/20 text-yellow-400',
  lead_created: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-white/10 text-white/40',
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

export default function Conversations() {
  const [convs, setConvs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchConvs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterChannel) params.channel = filterChannel;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/api/channels/conversations', { params });
      setConvs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    const { data } = await api.get(`/api/channels/conversations/${id}`);
    setDetail(data);
  };

  useEffect(() => { fetchConvs(); }, [filterChannel, filterStatus]);

  const handleSelect = (c) => {
    setSelected(c.id);
    fetchDetail(c.id);
  };

  const handleTakeover = async (convId, value) => {
    await api.patch(`/api/channels/conversations/${convId}`, { agent_takeover: value });
    fetchDetail(convId);
    fetchConvs();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Liste ── */}
      <div className="w-80 flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-white text-sm">Conversations</h1>
            <button onClick={fetchConvs} className="p-1.5 rounded hover:bg-white/10 text-accent-steel hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
            >
              <option value="">Tous canaux</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
            >
              <option value="">Tous statuts</option>
              <option value="active">Actif</option>
              <option value="lead_created">Lead créé</option>
              <option value="closed">Fermé</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-4 text-center text-accent-steel text-xs">Chargement...</div>}
          {!loading && convs.length === 0 && (
            <div className="p-8 text-center text-accent-steel text-xs">Aucune conversation</div>
          )}
          {convs.map(c => {
            const badge = CHANNEL_BADGE[c.channel] || CHANNEL_BADGE.unknown;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${selected === c.id ? 'bg-white/8' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                  <span className="text-[10px] text-accent-steel">{timeAgo(c.last_message_at)}</span>
                </div>
                <p className="text-xs font-medium text-white truncate">{c.sender_identity}</p>
                <p className="text-[11px] text-accent-steel truncate mt-0.5">{c.last_message}</p>
                <div className="flex gap-1 mt-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] || ''}`}>
                    {c.status === 'active' ? 'Actif' : c.status === 'lead_created' ? 'Lead créé' : 'Fermé'}
                  </span>
                  {c.agent_takeover && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">Agent</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Détail ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!detail ? (
          <div className="flex-1 flex items-center justify-center text-accent-steel text-sm">
            <MessageSquare className="w-8 h-8 mr-3 opacity-30" />
            Sélectionnez une conversation
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{detail.sender_identity}</p>
                <p className="text-[11px] text-accent-steel capitalize">{detail.channel} · {detail.status}</p>
              </div>
              <div className="flex gap-2">
                {detail.lead_id && (
                  <a href={`/leads`} className="text-xs px-3 py-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors">
                    Voir le lead #{detail.lead_id}
                  </a>
                )}
                {detail.agent_takeover ? (
                  <button
                    onClick={() => handleTakeover(detail.id, false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    Rendre à l'IA
                  </button>
                ) : (
                  <button
                    onClick={() => handleTakeover(detail.id, true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />Reprendre la main
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(detail.messages || []).map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-accent/20 text-white rounded-br-md'
                      : 'bg-white/8 text-white/90 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.ts && (
                      <p className="text-[10px] mt-1 opacity-40 text-right">
                        {new Date(m.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/pages/Conversations.jsx
git commit -m "feat(frontend): page Conversations liste + détail + agent takeover"
```

---

## Task 16 — Frontend : ChannelSettings.jsx

**Files:**
- Create: `src/pages/ChannelSettings.jsx`

- [ ] **Créer ChannelSettings.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wifi, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const CHANNEL_LABEL = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };
const CHANNEL_COLOR = {
  whatsapp: 'text-emerald-400',
  sms: 'text-blue-400',
  email: 'text-slate-300',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-accent-steel">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-accent-steel uppercase tracking-wider">{label}</label>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50"
        {...props}
      />
    </div>
  );
}

export default function ChannelSettings() {
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(null); // 'whatsapp' | 'sms' | 'email' | null
  const [form, setForm] = useState({});
  const [testResult, setTestResult] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    const { data } = await api.get('/api/channels/accounts');
    setAccounts(data);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openModal = (type) => {
    setForm({});
    setModal(type);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload = { channel_type: modal, user_id: form.user_id || 1 };
      if (modal === 'whatsapp' || modal === 'sms') {
        payload.phone_number = form.phone_number;
        payload.credentials = { account_sid: form.account_sid, auth_token: form.auth_token };
      } else {
        payload.email_address = form.email_address;
        payload.credentials = {
          imap_host: form.imap_host, imap_port: form.imap_port || '993',
          imap_user: form.imap_user, imap_pass: form.imap_pass,
          smtp_host: form.smtp_host, smtp_port: form.smtp_port || '587',
          smtp_user: form.smtp_user, smtp_pass: form.smtp_pass,
        };
      }
      await api.post('/api/channels/accounts', payload);
      setModal(null);
      fetchAccounts();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Désactiver ce canal ?')) return;
    await api.delete(`/api/channels/accounts/${id}`);
    fetchAccounts();
  };

  const handleTest = async (id) => {
    setTestResult(r => ({ ...r, [id]: 'testing' }));
    const { data } = await api.post(`/api/channels/accounts/${id}/test`);
    setTestResult(r => ({ ...r, [id]: data.status }));
  };

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Canaux connectés</h1>
        <div className="flex gap-2">
          <button onClick={() => openModal('whatsapp')}
            className="text-xs px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />WhatsApp
          </button>
          <button onClick={() => openModal('sms')}
            className="text-xs px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />SMS
          </button>
          <button onClick={() => openModal('email')}
            className="text-xs px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Email
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="glass border border-white/10 rounded-xl p-12 text-center text-accent-steel text-sm">
          Aucun canal connecté — ajoutez WhatsApp, SMS ou Email pour démarrer.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(a => (
            <div key={a.id} className="glass border border-white/10 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className={`font-bold text-sm ${CHANNEL_COLOR[a.channel_type]}`}>
                  {CHANNEL_LABEL[a.channel_type]}
                </span>
                <div>
                  <p className="text-sm text-white font-medium">
                    {a.phone_number || a.email_address || '—'}
                  </p>
                  {a.last_sync && (
                    <p className="text-[11px] text-accent-steel">
                      Sync : {new Date(a.last_sync).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testResult[a.id] === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {testResult[a.id] === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                <button
                  onClick={() => handleTest(a.id)}
                  disabled={testResult[a.id] === 'testing'}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-accent-steel hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  <Wifi className="w-3 h-3" />
                  {testResult[a.id] === 'testing' ? 'Test...' : 'Tester'}
                </button>
                <button onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-accent-steel hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'whatsapp' || modal === 'sms' ? (
        <Modal title={`Connecter ${CHANNEL_LABEL[modal]}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Twilio Account SID" value={form.account_sid || ''} onChange={f('account_sid')} placeholder="ACxxxxxxxxxx" />
            <Field label="Twilio Auth Token" type="password" value={form.auth_token || ''} onChange={f('auth_token')} />
            <Field label="Numéro Twilio" value={form.phone_number || ''} onChange={f('phone_number')}
              placeholder={modal === 'whatsapp' ? '+14155238886' : '+33600000000'} />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:bg-accent/80 transition-colors mt-2">
            {saving ? 'Enregistrement...' : 'Connecter'}
          </button>
        </Modal>
      ) : null}

      {modal === 'email' && (
        <Modal title="Connecter Email (IMAP/SMTP)" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-[11px] text-accent-steel font-bold uppercase tracking-wider">Réception (IMAP)</p>
            <Field label="Hôte IMAP" value={form.imap_host || ''} onChange={f('imap_host')} placeholder="imap.gmail.com" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Port" value={form.imap_port || '993'} onChange={f('imap_port')} />
              <Field label="Email" value={form.imap_user || ''} onChange={f('imap_user')} placeholder="agent@agence.fr" />
            </div>
            <Field label="Mot de passe / App password" type="password" value={form.imap_pass || ''} onChange={f('imap_pass')} />
            <p className="text-[11px] text-accent-steel font-bold uppercase tracking-wider pt-2">Envoi (SMTP)</p>
            <Field label="Hôte SMTP" value={form.smtp_host || ''} onChange={f('smtp_host')} placeholder="smtp.gmail.com" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Port" value={form.smtp_port || '587'} onChange={f('smtp_port')} />
              <Field label="Login" value={form.smtp_user || ''} onChange={f('smtp_user')} />
            </div>
            <Field label="Mot de passe SMTP" type="password" value={form.smtp_pass || ''} onChange={f('smtp_pass')} />
            <Field label="Adresse email du compte" value={form.email_address || ''} onChange={f('email_address')} placeholder="agent@agence.fr" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:bg-accent/80 transition-colors mt-2">
            {saving ? 'Enregistrement...' : 'Connecter'}
          </button>
        </Modal>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/pages/ChannelSettings.jsx
git commit -m "feat(frontend): ChannelSettings page CRUD comptes canaux + modals"
```

---

## Task 17 — Frontend : CalendarSettings.jsx — section Indisponibilités

**Files:**
- Modify: `src/pages/CalendarSettings.jsx`

- [ ] **Ajouter les imports en tête du fichier**

Modifier la ligne d'import lucide-react pour ajouter `Ban` et `PlusCircle` :

```jsx
import { Calendar, Clock, Save, CheckCircle, Link2, ChevronLeft, ChevronRight, X, Ban, PlusCircle } from 'lucide-react';
```

- [ ] **Ajouter l'état blocks et la modale dans le composant principal**

Dans le corps de `CalendarSettings` (avant le `if (loading) return ...`), ajouter :

```jsx
  const [blocks, setBlocks] = useState([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlock, setNewBlock] = useState({ block_type: 'vacation', start_datetime: '', end_datetime: '', reason: '' });
  const [savingBlock, setSavingBlock] = useState(false);

  useEffect(() => {
    api.get('/api/calendar/blocks').then(r => setBlocks(r.data)).catch(() => {});
  }, []);

  const handleCreateBlock = async () => {
    setSavingBlock(true);
    try {
      await api.post('/api/calendar/blocks', newBlock);
      const r = await api.get('/api/calendar/blocks');
      setBlocks(r.data);
      setShowBlockModal(false);
      setNewBlock({ block_type: 'vacation', start_datetime: '', end_datetime: '', reason: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (id) => {
    if (!window.confirm('Supprimer cette indisponibilité ?')) return;
    await api.delete(`/api/calendar/blocks/${id}`);
    setBlocks(b => b.filter(x => x.id !== id));
  };

  const BLOCK_LABELS = { vacation: 'Congés', appointment: 'RDV perso', personal: 'Autre' };
```

- [ ] **Ajouter la section Indisponibilités dans le JSX**

Localiser la ligne `</div>` qui ferme la `<div className="grid ...">` (avant le dernier `</div>` et `};` / `export default`).

Après le grid, ajouter :

```jsx
      {/* ── Indisponibilités ── */}
      <div className="glass rounded-xl border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Ban className="w-4 h-4 text-accent" />Indisponibilités
          </h2>
          <button
            onClick={() => setShowBlockModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />Ajouter
          </button>
        </div>

        {blocks.length === 0 ? (
          <p className="text-[11px] text-accent-steel">Aucune indisponibilité configurée.</p>
        ) : (
          <div className="space-y-2">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                <div>
                  <span className="text-xs font-medium text-white">{BLOCK_LABELS[b.block_type] || b.block_type}</span>
                  <p className="text-[11px] text-accent-steel">
                    {new Date(b.start_datetime).toLocaleDateString('fr-FR')} →{' '}
                    {new Date(b.end_datetime).toLocaleDateString('fr-FR')}
                    {b.reason && ` — ${b.reason}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteBlock(b.id)}
                  className="p-1.5 rounded hover:bg-red-500/20 text-accent-steel hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ajout block ── */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Ajouter une indisponibilité</h3>
              <button onClick={() => setShowBlockModal(false)} className="p-1.5 rounded hover:bg-white/10 text-accent-steel">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Type</label>
                <select
                  value={newBlock.block_type}
                  onChange={e => setNewBlock(v => ({ ...v, block_type: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                >
                  <option value="vacation">Congés</option>
                  <option value="appointment">RDV perso</option>
                  <option value="personal">Autre</option>
                </select>
              </div>
              {[['start_datetime', 'Début'], ['end_datetime', 'Fin']].map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">{label}</label>
                  <input
                    type="datetime-local"
                    value={newBlock[k]}
                    onChange={e => setNewBlock(v => ({ ...v, [k]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Raison (optionnel)</label>
                <input
                  type="text"
                  value={newBlock.reason}
                  onChange={e => setNewBlock(v => ({ ...v, reason: e.target.value }))}
                  placeholder="Ex: Séminaire, médecin..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleCreateBlock}
              disabled={savingBlock || !newBlock.start_datetime || !newBlock.end_datetime}
              className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:bg-accent/80 transition-colors disabled:opacity-40"
            >
              {savingBlock ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
```

- [ ] **Commit**

```bash
git add src/pages/CalendarSettings.jsx
git commit -m "feat(frontend): CalendarSettings section Indisponibilités + modal"
```

---

## Task 18 — Validation finale

**Files:** aucun

- [ ] **Lancer pytest**

```bash
pytest tests/ -v
```

Expected: tous PASSED. Si un test échoue, corriger avant de continuer.

- [ ] **Lancer le build frontend**

```bash
npm run build
```

Expected: `✓ built in X.Xs` — 0 erreur TypeScript/Vite.

Si erreur : lire le message, corriger l'import ou le JSX incriminé.

- [ ] **Vérifier les imports Python**

```bash
python -c "from backend.api.channels import router; from backend.services.omnichannel_ai import qualify_and_respond; print('OK')"
```

Expected: `OK`

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: chat IA multi-canal (WhatsApp/SMS/Email) + CalendarBlock indisponibilités"
```

---

## Checklist de validation spec

- [ ] CalendarBlock créé + routes GET/POST/DELETE fonctionnelles
- [ ] CalendarSettings.jsx a la section Indisponibilités
- [ ] GET /api/calendar/slots exclut les CalendarBlocks actifs
- [ ] GET /chat/slots/{license_key} accessible sans JWT
- [ ] ChannelAccount + ChannelConversation créés en DB
- [ ] WhatsApp webhook POST /api/channels/whatsapp/webhook retourne TwiML
- [ ] SMS webhook POST /api/channels/sms/webhook retourne TwiML
- [ ] Email IMAP polling dans APScheduler toutes les 5 min
- [ ] omnichannel_ai.py extrait budget/apport/délai free-form + propose créneaux réels si score ≥ 7
- [ ] IA se présente comme "assistant virtuel" au premier message
- [ ] Page /conversations accessible (liste + détail + takeover)
- [ ] Page /settings/canaux accessible (liste + modals WhatsApp/SMS/Email)
- [ ] pytest → 0 erreur
- [ ] npm run build → 0 erreur
