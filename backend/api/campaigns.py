from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_session
from ..models import Campaign, Lead, User
from ..auth import get_current_user
from ..services.email_service import send_bulk

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class CampaignCreate(BaseModel):
    name: str
    type: str = "email"  # "email" | "sms"
    message: str
    leads_ids: List[int] = []
    scheduled_at: Optional[datetime] = None


@router.post("/")
async def create_campaign(
    payload: CampaignCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    camp = Campaign(
        name=payload.name,
        type=payload.type,
        status="draft",
        scheduled_at=payload.scheduled_at,
    )
    # Stocker message + leads_ids dans name (hack compact car pas de champs dédiés)
    # On préfixe le nom avec les métadonnées JSON pour éviter une migration alembic
    import json
    camp.name = json.dumps({
        "label": payload.name,
        "message": payload.message,
        "leads_ids": payload.leads_ids,
    })
    session.add(camp)
    session.commit()
    session.refresh(camp)
    return _serialize(camp)


@router.get("/")
async def list_campaigns(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    camps = session.exec(select(Campaign).order_by(Campaign.created_at.desc())).all()
    return [_serialize(c) for c in camps]


@router.put("/{campaign_id}/send")
async def send_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    import json
    camp = session.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        meta = json.loads(camp.name)
    except Exception:
        raise HTTPException(status_code=400, detail="Données campagne invalides")

    leads_ids = meta.get("leads_ids", [])
    message = meta.get("message", "")
    label = meta.get("label", camp.name)

    leads = session.exec(select(Lead).where(Lead.id.in_(leads_ids))).all() if leads_ids else []
    emails = [l.email for l in leads if l.email]

    if camp.type == "email":
        result = send_bulk(emails, f"Message de {label}", message)
    else:
        # SMS simulation
        result = {"sent": len(emails), "failed": 0, "mode": "simulation_sms"}

    camp.status = "sent"
    session.add(camp)
    session.commit()
    return {"campaign": label, "result": result}


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "gérant"):
        raise HTTPException(status_code=403, detail="Forbidden")
    camp = session.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(camp)
    session.commit()
    return {"deleted": True}


def _serialize(c: Campaign):
    import json
    try:
        meta = json.loads(c.name)
    except Exception:
        meta = {"label": c.name, "message": "", "leads_ids": []}
    return {
        "id": c.id,
        "name": meta.get("label", c.name),
        "message": meta.get("message", ""),
        "leads_ids": meta.get("leads_ids", []),
        "type": c.type,
        "status": c.status,
        "scheduled_at": c.scheduled_at,
        "created_at": c.created_at,
    }
