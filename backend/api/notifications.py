from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List

from ..database import get_session
from ..models import Notification, User
from ..auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=List[Notification])
async def get_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    return session.exec(stmt).all()


@router.put("/{notif_id}/read")
async def mark_read(
    notif_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    notif = session.get(Notification, notif_id)
    if not notif or notif.user_id != current_user.id:
        return {"ok": False}
    notif.is_read = True
    session.add(notif)
    session.commit()
    return {"ok": True}


@router.delete("/clear")
async def clear_all(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    notifs = session.exec(stmt).all()
    for n in notifs:
        session.delete(n)
    session.commit()
    return {"deleted": len(notifs)}
