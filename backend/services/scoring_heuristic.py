import logging
from ..models import Deal

logger = logging.getLogger(__name__)

def score_deal(deal: Deal) -> int:
    """
    Calculates a score from 1 to 10 for a deal using simple heuristics.
    """
    score = 5.0 # Base score
    
    # 1. Yield (Weight: 30%)
    if deal.gross_yield:
        if deal.gross_yield >= 8.0: score += 2.0
        elif deal.gross_yield >= 6.0: score += 1.0
        elif deal.gross_yield < 4.0: score -= 1.0
    
    # 2. Amenities - Metro (Weight: 20%)
    if deal.amenities and isinstance(deal.amenities, dict):
        metros = deal.amenities.get("metros", [])
        if metros:
            score += 1.0
            if len(metros) > 2: score += 0.5
    
    # 3. DPE (Weight: 20%)
    if deal.dpe:
        dpe = deal.dpe.upper()
        if dpe in ['A', 'B']: score += 1.5
        elif dpe == 'C': score += 0.5
        elif dpe in ['F', 'G']: score -= 1.5
    
    # 4. Need work (Weight: 10%)
    if deal.need_work is True:
        score -= 1.0
    
    # 5. Price per m2 (Weight: 20%)
    if deal.price_per_m2 and deal.postal_code and deal.postal_code.startswith("75"):
        if deal.price_per_m2 < 9000: score += 1.5
        elif deal.price_per_m2 > 13000: score -= 1.0
    
    # Clamp score between 1 and 10
    final_score = max(1, min(10, int(round(score))))
    
    return final_score
