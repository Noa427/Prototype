from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Dict, Any

from ..database import get_session
from ..models import User, Lead, Deal
from ..auth import get_admin_user
from ..services.rental_yield import update_all_yields
from ..services.scoring import update_all_scores_deepseek

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/kpi")
async def get_sales_kpis(
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """
    Returns KPIs for each commercial:
    - nombre de leads créés
    - nombre de visites programmées (visit_scheduled)
    - nombre de conversions (converted)
    - taux de conversion (converted / total leads)
    """
    # Récupérer tous les commerciaux
    statement = select(User).where(User.role == "commercial")
    commerciaux = session.exec(statement).all()
    
    kpis = []
    for comm in commerciaux:
        # Total leads
        total_leads = session.exec(
            select(func.count(Lead.id)).where(Lead.assigned_to == comm.id)
        ).one()
        
        # Visites programmées
        visits = session.exec(
            select(func.count(Lead.id)).where(
                Lead.assigned_to == comm.id, 
                Lead.status == "visit_scheduled"
            )
        ).one()
        
        # Conversions
        conversions = session.exec(
            select(func.count(Lead.id)).where(
                Lead.assigned_to == comm.id, 
                Lead.status == "converted"
            )
        ).one()
        
        # Taux de conversion
        conversion_rate = (conversions / total_leads * 100) if total_leads > 0 else 0
        
        kpis.append({
            "id": comm.id,
            "full_name": comm.full_name,
            "total_leads": total_leads,
            "visits": visits,
            "conversions": conversions,
            "conversion_rate": round(conversion_rate, 2)
        })
        
    return kpis

@router.post("/update_yield")
async def trigger_update_yields(
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    count = update_all_yields(session)
    return {"message": f"Updated yields for {count} deals"}

@router.post("/update_scores")
async def trigger_update_scores(
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    # Use DeepSeek scoring by default if possible
    count = await update_all_scores_deepseek(session)
    return {"message": f"Updated scores (DeepSeek) for {count} deals"}
