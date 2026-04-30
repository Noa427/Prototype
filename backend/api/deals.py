from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from typing import List, Optional
import csv
import io
from datetime import datetime, timedelta

from ..database import get_session
from ..models import Deal, User, PostSaleStep
from ..auth import get_current_user

router = APIRouter(prefix="/deals", tags=["deals"])

# ── helpers ──────────────────────────────────────────────────────────────────

POST_SALE_TEMPLATE = [
    (1, "Délai rétractation acheteur",      10),
    (2, "Diagnostics techniques validés",   30),
    (3, "Obtention financement acheteur",   45),
    (4, "Levée conditions suspensives",     60),
    (5, "Dépôt garantie chez notaire",      70),
    (6, "Convocation signature définitive", 75),
    (7, "Signature acte authentique",       90),
]


def compute_post_sale_steps(compromise_date: datetime) -> list[dict]:
    return [
        {
            "step_order": order,
            "step_name": name,
            "due_date": compromise_date + timedelta(days=days),
            "status": "pending",
        }
        for order, name, days in POST_SALE_TEMPLATE
    ]


def get_deals_statement(
    current_user: User,
    city: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_surface: Optional[float] = None,
    property_type: Optional[str] = None,
):
    statement = select(Deal)
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


# ── routes existantes ─────────────────────────────────────────────────────────

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
    writer.writerow(["ID", "Titre", "Ville", "Prix", "Surface", "Prix/m2", "DPE", "Rendement", "Score", "URL", "Date"])
    for deal in deals:
        writer.writerow([
            deal.id, deal.map_query, deal.city, deal.price, deal.surface,
            deal.price_per_m2, deal.dpe, deal.gross_yield, deal.aevum_score,
            deal.url, deal.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=deals_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


# ── routes post-sale ──────────────────────────────────────────────────────────

@router.get("/post-sale-active-ids")
async def get_post_sale_active_ids(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retourne les deal_id ayant au moins une étape post-sale."""
    stmt = select(PostSaleStep.deal_id).distinct()
    if current_user.role != "admin" and current_user.agency_id:
        agency_deal_ids = [
            d.id for d in session.exec(
                select(Deal.id).where(Deal.agency_id == current_user.agency_id)
            ).all()
        ]
        stmt = stmt.where(PostSaleStep.deal_id.in_(agency_deal_ids))
    rows = session.exec(stmt).all()
    return {"deal_ids": list(rows)}


@router.post("/{deal_id}/start-post-sale")
async def start_post_sale(
    deal_id: int,
    body: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Crée les 7 étapes post-sale. Body: {compromise_date: 'YYYY-MM-DD'}"""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal introuvable")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    existing = session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Suivi post-sale déjà démarré pour ce deal")
    try:
        compromise_date = datetime.strptime(body["compromise_date"], "%Y-%m-%d")
    except (KeyError, ValueError):
        raise HTTPException(status_code=422, detail="compromise_date requis au format YYYY-MM-DD")
    now = datetime.utcnow()
    for s in compute_post_sale_steps(compromise_date):
        session.add(PostSaleStep(
            deal_id=deal_id,
            step_name=s["step_name"],
            step_order=s["step_order"],
            due_date=s["due_date"],
            status=s["status"],
            created_at=now,
            updated_at=now,
        ))
    session.commit()
    return session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id).order_by(PostSaleStep.step_order)
    ).all()


@router.get("/{deal_id}/post-sale-steps")
async def get_post_sale_steps(
    deal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal introuvable")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    return session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id).order_by(PostSaleStep.step_order)
    ).all()


@router.put("/{deal_id}/post-sale-steps/{step_id}/complete")
async def complete_post_sale_step(
    deal_id: int,
    step_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    step = session.get(PostSaleStep, step_id)
    if not step or step.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Étape introuvable")
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal introuvable")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    now = datetime.utcnow()
    step.status = "completed"
    step.completed_date = now
    step.updated_at = now
    session.add(step)
    session.commit()
    session.refresh(step)
    return step


@router.put("/{deal_id}/post-sale-steps/{step_id}/postpone")
async def postpone_post_sale_step(
    deal_id: int,
    step_id: int,
    body: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Body: {new_due_date: 'YYYY-MM-DD', reason: str}"""
    step = session.get(PostSaleStep, step_id)
    if not step or step.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Étape introuvable")
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal introuvable")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    try:
        new_due = datetime.strptime(body["new_due_date"], "%Y-%m-%d")
    except (KeyError, ValueError):
        raise HTTPException(status_code=422, detail="new_due_date requis au format YYYY-MM-DD")
    reason = body.get("reason", "")
    now = datetime.utcnow()
    step.due_date = new_due
    step.notes = f"{step.notes or ''}\n[Report {now.strftime('%d/%m/%Y')}] {reason}".strip()
    step.updated_at = now
    session.add(step)
    session.commit()
    session.refresh(step)
    return step


@router.get("/{deal_id}/post-sale-timeline")
async def get_post_sale_timeline(
    deal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal introuvable")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Accès interdit")
    steps = session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id).order_by(PostSaleStep.step_order)
    ).all()
    if not steps:
        return {"steps": [], "progress_pct": 0, "total": 0, "completed": 0}
    now = datetime.utcnow()
    result = []
    for s in steps:
        days_remaining = (s.due_date - now).days if s.status != "completed" else None
        result.append({
            "id": s.id,
            "step_order": s.step_order,
            "step_name": s.step_name,
            "due_date": s.due_date.isoformat(),
            "completed_date": s.completed_date.isoformat() if s.completed_date else None,
            "status": s.status,
            "notes": s.notes,
            "days_remaining": days_remaining,
        })
    completed = sum(1 for s in steps if s.status == "completed")
    return {
        "steps": result,
        "progress_pct": round(completed / len(steps) * 100),
        "total": len(steps),
        "completed": completed,
    }
