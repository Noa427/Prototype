from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Dict, Any
from ..database import get_session
from ..models import Deal, DealHistory, User
from ..auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/trends", tags=["trends"])

@router.get("/price_by_zipcode")
async def get_price_trends(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a time series of average prices per month for each postal code.
    """
    try:
        # PostgreSQL specific: date_trunc
        statement = select(
            Deal.postal_code,
            func.date_trunc('month', DealHistory.created_at).label('month'),
            func.avg(DealHistory.price).label('avg_price')
        ).join(Deal).where(
            DealHistory.price != None
        ).group_by(
            Deal.postal_code,
            func.date_trunc('month', DealHistory.created_at)
        ).order_by('month')
        
        results = session.exec(statement).all()
        
        # Format results for frontend (e.g. Recharts)
        # Expected format: [{ month: '2024-01', '75012': 850000, '75015': 920000 }, ...]
        
        formatted_data = {}
        for postal_code, month, avg_price in results:
            month_str = month.strftime('%Y-%m')
            if month_str not in formatted_data:
                formatted_data[month_str] = {"month": month_str}
            formatted_data[month_str][postal_code] = round(float(avg_price), 2)
            
        return sorted(list(formatted_data.values()), key=lambda x: x['month'])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trends: {e}")

@router.get("/price_by_zone")
async def get_price_by_zone(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Prix moyen par code postal depuis les deals actifs (pas besoin d'historique)."""
    base = select(Deal.postal_code, func.avg(Deal.price_per_m2).label('avg_pm2'), func.count(Deal.id).label('count'))
    if current_user.role != "admin" and current_user.agency_id:
        base = base.where(Deal.agency_id == current_user.agency_id)
    base = base.where(Deal.postal_code != None, Deal.price_per_m2 != None, Deal.price_per_m2 > 0)
    base = base.group_by(Deal.postal_code).order_by(func.avg(Deal.price_per_m2).desc())
    rows = session.exec(base).all()
    return [{"zone": r.postal_code or "?", "avg_pm2": round(float(r.avg_pm2), 0), "count": r.count} for r in rows]


@router.get("/top_deals")
async def get_top_deals(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Top 5 deals par score pour le dashboard."""
    base = select(Deal).where(Deal.is_active == True, Deal.aevum_score != None)
    if current_user.role != "admin" and current_user.agency_id:
        base = base.where(Deal.agency_id == current_user.agency_id)
    base = base.order_by(Deal.aevum_score.desc()).limit(5)
    deals = session.exec(base).all()
    return [{"id": d.id, "city": d.city, "postal_code": d.postal_code, "price": d.price,
             "surface": d.surface, "gross_yield": d.gross_yield, "score": d.aevum_score, "url": d.url} for d in deals]


@router.get("/stats")
async def get_global_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns global stats filtered by tenant (agency_id) for non-admins."""
    base = select(Deal)
    if current_user.role != "admin" and current_user.agency_id:
        base = base.where(Deal.agency_id == current_user.agency_id)

    total_deals = session.exec(select(func.count(Deal.id)).select_from(base.subquery())).one()
    avg_price = session.exec(select(func.avg(Deal.price)).select_from(base.subquery())).one()
    avg_yield = session.exec(select(func.avg(Deal.gross_yield)).select_from(base.subquery())).one()

    return {
        "total_deals": total_deals,
        "avg_price": round(float(avg_price or 0), 2),
        "avg_yield": round(float(avg_yield or 0), 2)
    }
