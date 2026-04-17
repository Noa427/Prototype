from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any
from datetime import datetime

from ..database import get_session
from ..models import Agency

router = APIRouter(prefix="/license", tags=["license"])


@router.post("/heartbeat")
async def heartbeat(body: Dict[str, Any], session: Session = Depends(get_session)):
    """Client app envoie son license_key → serveur retourne status + config."""
    license_key = body.get("license_key")
    if not license_key:
        raise HTTPException(status_code=400, detail="license_key requis")

    agency = session.exec(
        select(Agency).where(Agency.license_key == license_key)
    ).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Licence inconnue")

    agency.last_heartbeat = datetime.utcnow()
    session.add(agency)
    session.commit()
    session.refresh(agency)

    return {
        "status": agency.status,
        "agency_id": agency.id,
        "agency_name": agency.name,
        "expires_at": agency.expires_at.isoformat() if agency.expires_at else None,
        "config": {
            "name": agency.name,
            "location": agency.location,
        },
    }


@router.get("/info/{license_key}")
async def get_license_info(license_key: str, session: Session = Depends(get_session)):
    """Retourne les informations de licence sans mise à jour du heartbeat."""
    agency = session.exec(
        select(Agency).where(Agency.license_key == license_key)
    ).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Licence inconnue")
    return {
        "status": agency.status,
        "agency_id": agency.id,
        "agency_name": agency.name,
        "last_heartbeat": agency.last_heartbeat.isoformat() if agency.last_heartbeat else None,
        "expires_at": agency.expires_at.isoformat() if agency.expires_at else None,
    }
