import logging
import os
import json
import httpx
from sqlmodel import Session, select
from ..models import Deal

logger = logging.getLogger(__name__)

# Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"

# Simple file-based cache
CACHE_FILE = "data/scoring_cache.json"

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f)

SCORING_CACHE = load_cache()

async def score_deal_deepseek(deal: Deal) -> int:
    """
    Calculates a score from 1 to 10 for a deal using DeepSeek AI.
    """
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not set, falling back to heuristic scoring.")
        from .scoring_heuristic import score_deal as heuristic_score
        return heuristic_score(deal)

    # Check cache
    cache_key = f"{deal.url}_{deal.price}_{deal.surface}"
    if cache_key in SCORING_CACHE:
        return SCORING_CACHE[cache_key]

    prompt = f"""
    En tant qu'expert en investissement immobilier à Paris, évalue ce bien et donne une note de 1 à 10 (10 étant une opportunité exceptionnelle).
    
    Détails du bien :
    - Type : {deal.property_type}
    - Prix : {deal.price} €
    - Surface : {deal.surface} m²
    - Code Postal : {deal.postal_code}
    - DPE : {deal.dpe}
    - Travaux : {"Oui" if deal.need_work else "Non"}
    - Rendement Brut : {deal.gross_yield}%
    - Commodités : {deal.amenities}
    
    Critères :
    - Prix au m² par rapport au secteur.
    - Potentiel de rendement.
    - Qualité de l'emplacement (métro, etc.).
    - État du bien (DPE, travaux).
    
    Réponds uniquement avec un chiffre entier entre 1 et 10.
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aevum.io",
                    "X-Title": "AEVUM"
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                # Extract digits only
                score_str = "".join(filter(str.isdigit, content))
                if score_str:
                    score = int(score_str)
                    score = max(1, min(10, score))
                    
                    # Update cache
                    SCORING_CACHE[cache_key] = score
                    save_cache(SCORING_CACHE)
                    
                    return score
            
            logger.error(f"Error from OpenRouter: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Exception during DeepSeek scoring: {e}")

    # Fallback to heuristic
    from .scoring_heuristic import score_deal as heuristic_score
    return heuristic_score(deal)

# Move old heuristic scoring to a separate file for fallback
def score_deal_heuristic(deal: Deal) -> int:
    score = 5.0
    if deal.gross_yield:
        if deal.gross_yield >= 8.0: score += 2.0
        elif deal.gross_yield >= 6.0: score += 1.0
    if deal.amenities and isinstance(deal.amenities, dict):
        if deal.amenities.get("metros"): score += 1.0
    if deal.dpe:
        if deal.dpe.upper() in ['A', 'B']: score += 1.5
        elif deal.dpe.upper() in ['F', 'G']: score -= 1.5
    if deal.need_work is True: score -= 1.0
    return max(1, min(10, int(round(score))))

async def score_deal(deal: Deal) -> int:
    """
    Main entry point for scoring a deal.
    Uses DeepSeek AI if available, otherwise falls back to heuristic.
    """
    return await score_deal_deepseek(deal)

async def update_score_for_deal_deepseek(deal: Deal, session: Session):
    deal.aevum_score = await score_deal(deal)
    session.add(deal)

async def update_all_scores_deepseek(session: Session):
    statement = select(Deal)
    deals = session.exec(statement).all()
    
    count = 0
    for deal in deals:
        await update_score_for_deal_deepseek(deal, session)
        count += 1
    
    session.commit()
    logger.info(f"Updated scores (DeepSeek) for {count} deals.")
    return count
