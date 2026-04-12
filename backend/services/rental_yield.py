import json
import os
import logging
from sqlmodel import Session, select
from ..models import Deal

logger = logging.getLogger(__name__)

# Load rent reference data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RENT_REF_PATH = os.path.join(BASE_DIR, "data", "rent_reference.json")

def load_rent_reference():
    try:
        with open(RENT_REF_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading rent reference: {e}")
        return {"default": 20.0}

RENT_REFERENCE = load_rent_reference()

def estimate_rent(deal: Deal = None, lat: float = None, lon: float = None, surface: float = None, postal_code: str = None) -> float:
    """
    Estimates monthly rent based on postal code and surface.
    """
    if deal:
        surface = deal.surface
        postal_code = deal.postal_code
        
    if not surface or not postal_code:
        return 0.0
    
    price_per_m2 = RENT_REFERENCE.get(postal_code, RENT_REFERENCE.get("default", 20.0))
    
    # Simple estimation: surface * price_per_m2
    estimated_monthly_rent = surface * price_per_m2
    
    return round(estimated_monthly_rent, 2)

def update_yield_for_deal(deal: Deal, session: Session):
    """
    Calculates and updates estimated_rent and gross_yield for a deal.
    """
    if not deal.price or deal.price == 0:
        return
    
    deal.estimated_rent = estimate_rent(deal)
    
    # Annual gross yield: (monthly_rent * 12) / price * 100
    if deal.estimated_rent > 0:
        annual_rent = deal.estimated_rent * 12
        deal.gross_yield = round((annual_rent / deal.price) * 100, 2)
    else:
        deal.gross_yield = 0.0
    
    session.add(deal)
    # session.commit() is usually called by the caller

def update_all_yields(session: Session):
    """
    Updates estimated_rent and gross_yield for all deals in the database.
    """
    statement = select(Deal)
    deals = session.exec(statement).all()
    
    count = 0
    for deal in deals:
        update_yield_for_deal(deal, session)
        count += 1
    
    session.commit()
    logger.info(f"Updated yields for {count} deals.")
    return count
