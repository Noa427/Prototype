from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, or_
from typing import List, Optional
import csv
import io
from datetime import datetime

from ..database import get_session
from ..models import Deal, User
from ..auth import get_current_user

router = APIRouter(prefix="/deals", tags=["deals"])

def get_deals_statement(
    current_user: User,
    city: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_surface: Optional[float] = None,
    property_type: Optional[str] = None,
):
    statement = select(Deal)
    
    # Isolation par agence (sauf pour les admins)
    if current_user.role != "admin" and current_user.agency_id:
        statement = statement.where(Deal.agency_id == current_user.agency_id)
    
    if city:
        statement = statement.where(Deal.city.ilike(f"%{city}%"))
    if min_price:
        statement = statement.where(Deal.price >= min_price)
    if max_price:
        statement = statement.where(Deal.price <= max_price)
    if min_surface:
        statement = statement.where(Deal.surface >= min_surface)
    if property_type:
        statement = statement.where(Deal.property_type == property_type)
        
    return statement.order_by(Deal.timestamp.desc())

@router.get("/", response_model=List[Deal])
async def read_deals(
    city: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_surface: Optional[float] = None,
    property_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = get_deals_statement(current_user, city, min_price, max_price, min_surface, property_type)
    deals = session.exec(statement).all()
    return deals

@router.get("/export")
async def export_deals(
    city: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_surface: Optional[float] = None,
    property_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = get_deals_statement(current_user, city, min_price, max_price, min_surface, property_type)
    deals = session.exec(statement).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Titre", "Ville", "Prix", "Surface", "Prix/m2", "DPE", "Rendement", "Score", "URL", "Date"])
    
    for deal in deals:
        writer.writerow([
            deal.id,
            deal.map_query, # Titre ou description courte
            deal.city,
            deal.price,
            deal.surface,
            deal.price_per_m2,
            deal.dpe,
            deal.gross_yield,
            deal.aevum_score,
            deal.url,
            deal.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=deals_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
