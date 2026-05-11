from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import Dict, Any

from ..database import get_session
from ..models import Agency, User
from ..auth import get_current_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/complete")
async def complete_onboarding(
    body: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Sauvegarde les données d'onboarding et marque l'agence comme configurée."""
    if current_user.agency_id:
        agency = session.get(Agency, current_user.agency_id)
        if agency:
            if body.get("agency_name"):
                agency.name = body["agency_name"]
            if body.get("agency_location"):
                agency.location = body["agency_location"]
            session.add(agency)

    session.commit()
    return {"detail": "Onboarding enregistré"}
