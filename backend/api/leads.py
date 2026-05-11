from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import logging

from ..database import get_session
from ..models import Lead, Deal, User, Notification
from ..auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["leads"])

@router.get("/", response_model=List[Lead])
async def read_leads(
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"GET /leads/ called by user={current_user.username} role={current_user.role}")
        statement = select(Lead)

        # Isolation par rôle
        if current_user.role == "agent":
            statement = statement.where(Lead.assigned_to == current_user.id)
        elif current_user.role == "gérant":
            statement = statement.join(Deal).where(Deal.agency_id == current_user.agency_id)

        if status:
            statement = statement.where(Lead.status == status)

        leads = session.exec(statement.order_by(Lead.created_at.desc())).all()
        return leads
    except Exception as e:
        logger.error(f"Error in GET /leads/: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Lead)
async def create_lead(
    lead: Lead,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Vérifier que le deal existe
    deal = session.get(Deal, lead.deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if current_user.role == "agent":
        lead.assigned_to = current_user.id
    
    lead.created_at = datetime.utcnow()
    session.add(lead)
    session.commit()
    session.refresh(lead)
    
    # Notification si score > 8
    if deal.aevum_score and deal.aevum_score > 8:
        print(f"NOTIFICATION: Nouveau lead sur un deal à haut score ({deal.aevum_score}) : {lead.full_name}")
        # Ici on pourrait envoyer un email ou une alerte temps réel
        
    return lead

@router.put("/{lead_id}", response_model=Lead)
async def update_lead(
    lead_id: int,
    lead_data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Vérification des permissions
    if current_user.role == "agent" and lead.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this lead")
    
    for key, value in lead_data.items():
        if hasattr(lead, key):
            setattr(lead, key, value)
            
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return lead

class NotifyPayload(BaseModel):
    lead_id: int
    deal_id: int
    message: str
    type: str = "matching"

@router.post("/notify")
async def notify_lead(
    payload: NotifyPayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    lead = session.get(Lead, payload.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    notif = Notification(
        user_id=current_user.id,
        deal_id=payload.deal_id,
        message=payload.message,
    )
    session.add(notif)
    session.commit()
    session.refresh(notif)
    return {"message": "Notification créée", "notification_id": notif.id}


@router.get("/stats")
async def get_leads_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"GET /leads/stats called by user={current_user.username} role={current_user.role}")
        base = select(Lead)
        if current_user.role == "agent":
            base = base.where(Lead.assigned_to == current_user.id)
        elif current_user.role == "gérant":
            base = base.join(Deal).where(Deal.agency_id == current_user.agency_id)

        leads = session.exec(base).all()
        total = len(leads)
        par_statut = {}
        for l in leads:
            par_statut[l.status] = par_statut.get(l.status, 0) + 1
        converted = par_statut.get("converted", 0)
        return {
            "total": total,
            "par_statut": par_statut,
            "taux_conversion": round(converted / total * 100, 1) if total else 0,
        }
    except Exception as e:
        logger.error(f"Error in GET /leads/stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_leads_csv(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"GET /leads/export called by user={current_user.username} role={current_user.role}")
        import csv, io
        from fastapi.responses import StreamingResponse
        stmt = select(Lead)
        if current_user.role == "agent":
            stmt = stmt.where(Lead.assigned_to == current_user.id)
        elif current_user.role == "gérant":
            stmt = stmt.join(Deal).where(Deal.agency_id == current_user.agency_id)
        leads = session.exec(stmt).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "full_name", "email", "phone", "budget", "apport", "delay", "status", "created_at", "deal_id"])
        for l in leads:
            writer.writerow([l.id, l.full_name, l.email, l.phone, l.budget, l.apport, l.delay, l.status, l.created_at, l.deal_id])
        output.seek(0)
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                                 headers={"Content-Disposition": "attachment; filename=leads.csv"})
    except Exception as e:
        logger.error(f"Error in GET /leads/export: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if current_user.role != "admin" and lead.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this lead")
        
    session.delete(lead)
    session.commit()
    return {"message": "Lead deleted"}
