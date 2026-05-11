from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models import Alert, User
from ..auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/", response_model=List[Alert])
async def read_alerts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Alert).where(Alert.user_id == current_user.id)
    
    # Si on veut filtrer par agence aussi (si les alertes sont liées à l'agence)
    # Mais ici Alert est lié à User, et User est lié à Agency.
    # Donc filtrer par user_id est déjà une forme d'isolation.
    
    alerts = session.exec(statement).all()
    return alerts
