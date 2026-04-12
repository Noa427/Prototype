from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from ..database import get_session
from ..models import Lead, Deal, User
from ..auth import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])

@router.get("/", response_model=List[Lead])
async def read_leads(
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Lead)
    
    # Isolation : les commerciaux ne voient que leurs leads, les admins voient tout
    if current_user.role == "commercial":
        statement = statement.where(Lead.assigned_to == current_user.id)
    elif current_user.role == "client":
        # Les clients ne devraient probablement pas voir les leads CRM, 
        # mais si nécessaire, on filtre par leur agence via le deal
        statement = statement.join(Deal).where(Deal.agency_id == current_user.agency_id)
    
    if status:
        statement = statement.where(Lead.status == status)
        
    leads = session.exec(statement.order_by(Lead.created_at.desc())).all()
    return leads

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
    
    # Attribution automatique au commercial courant si c'est un commercial qui crée
    if current_user.role == "commercial":
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
    if current_user.role == "commercial" and lead.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this lead")
    
    for key, value in lead_data.items():
        if hasattr(lead, key):
            setattr(lead, key, value)
            
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return lead

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
