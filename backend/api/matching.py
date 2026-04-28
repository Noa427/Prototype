from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import logging

from ..database import get_session
from ..models import Deal, Lead
from ..auth import get_current_user, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/deals/{deal_id}/leads")
async def get_matching_leads(
    deal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retourne les leads dont le budget couvre le prix du bien."""
    try:
        logger.info(f"GET /matching/deals/{deal_id}/leads called by user={current_user.username}")
        deal = session.get(Deal, deal_id)
        if not deal:
            raise HTTPException(status_code=404, detail="Bien introuvable")

        leads = session.exec(select(Lead)).all()

        matched = []
        for lead in leads:
            # Matching : budget suffisant
            if deal.price and lead.budget < deal.price:
                continue
            score = 0
            reasons = []

            if deal.price and lead.budget >= deal.price:
                score += 2
                reasons.append(f"Budget {lead.budget:,} € ≥ prix {deal.price:,} €")
            if lead.delay in ("immediate", "1_month", "3_months", "immédiat"):
                score += 1
                reasons.append(f"Délai : {lead.delay}")

            matched.append({
                "id": lead.id,
                "full_name": lead.full_name,
                "email": lead.email,
                "phone": lead.phone,
                "budget": lead.budget,
                "apport": lead.apport,
                "delay": lead.delay,
                "status": lead.status,
                "match_score": score,
                "match_reasons": reasons,
            })

        matched.sort(key=lambda x: x["match_score"], reverse=True)
        return {"deal_id": deal_id, "deal_price": deal.price, "deal_city": deal.city, "matches": matched}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in GET /matching/deals/{deal_id}/leads: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
