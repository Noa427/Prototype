from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from typing import List, Dict, Any
import io

from ..database import get_session
from ..models import User, Lead, Deal, Agency
from ..auth import get_admin_user
from ..services.rental_yield import update_all_yields
from ..services.scoring import update_all_scores_deepseek
from ..services.report_service import generate_monthly_report

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

@router.get("/agencies/stats")
async def get_agencies_stats(
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Super-admin : liste des agences avec volumes deals/leads."""
    agencies = session.exec(select(Agency)).all()
    result = []
    for agency in agencies:
        deal_count = session.exec(
            select(func.count(Deal.id)).where(Deal.agency_id == agency.id)
        ).one()
        lead_count = session.exec(
            select(func.count(Lead.id))
            .join(Deal, Lead.deal_id == Deal.id)
            .where(Deal.agency_id == agency.id)
        ).one()
        user_count = session.exec(
            select(func.count(User.id)).where(User.agency_id == agency.id)
        ).one()
        avg_score = session.exec(
            select(func.avg(Deal.aevum_score)).where(Deal.agency_id == agency.id)
        ).one()
        result.append({
            "id": agency.id,
            "name": agency.name,
            "location": agency.location,
            "status": agency.status,
            "license_key": agency.license_key,
            "last_heartbeat": agency.last_heartbeat.isoformat() if agency.last_heartbeat else None,
            "expires_at": agency.expires_at.isoformat() if agency.expires_at else None,
            "deal_count": deal_count,
            "lead_count": lead_count,
            "user_count": user_count,
            "avg_score": round(float(avg_score or 0), 1),
        })
    # Agences sans agency_id (deals non rattachés)
    unassigned_deals = session.exec(
        select(func.count(Deal.id)).where(Deal.agency_id == None)
    ).one()
    result.append({
        "id": None,
        "name": "Non rattachés",
        "location": "—",
        "status": "active",
        "deal_count": unassigned_deals,
        "lead_count": 0,
        "user_count": 0,
        "avg_score": 0,
    })
    return result


@router.post("/agencies")
async def create_agency(
    body: Dict[str, Any],
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Super-admin : crée une nouvelle agence."""
    name = (body.get("name") or "").strip()
    location = (body.get("location") or "").strip()
    if not name or not location:
        raise HTTPException(status_code=400, detail="Nom et localisation requis")
    agency = Agency(name=name, location=location)
    session.add(agency)
    session.commit()
    session.refresh(agency)
    return {"id": agency.id, "name": agency.name, "location": agency.location, "status": agency.status}


@router.put("/agencies/{agency_id}/status")
async def update_agency_status(
    agency_id: int,
    body: Dict[str, Any],
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Super-admin : change le statut d'une agence (active/suspended/revoked)."""
    agency = session.get(Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    new_status = body.get("status")
    if new_status not in ("active", "suspended", "revoked"):
        raise HTTPException(status_code=400, detail="Statut invalide")
    agency.status = new_status
    session.add(agency)
    session.commit()
    session.refresh(agency)
    return {"id": agency.id, "name": agency.name, "status": agency.status}


@router.delete("/agencies/{agency_id}")
async def delete_agency(
    agency_id: int,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Super-admin : supprime une agence."""
    agency = session.get(Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    session.delete(agency)
    session.commit()
    return {"detail": "Agence supprimée"}


@router.get("/agencies/{agency_id}/users")
async def get_agency_users(
    agency_id: int,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Super-admin : liste des utilisateurs d'une agence."""
    agency = session.get(Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agence introuvable")
    users = session.exec(select(User).where(User.agency_id == agency_id)).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
        }
        for u in users
    ]


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
    count = await update_all_scores_deepseek(session)
    return {"message": f"Updated scores (DeepSeek) for {count} deals"}


@router.get("/agencies/{agency_id}/report")
async def download_agency_report(
    agency_id: int,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    agency = session.get(Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    leads = session.exec(
        select(Lead).join(Deal).where(Deal.agency_id == agency_id).order_by(Lead.created_at.desc())
    ).all()

    total = len(leads)
    par_statut: Dict[str, int] = {}
    for l in leads:
        par_statut[l.status] = par_statut.get(l.status, 0) + 1
    converted = par_statut.get("converted", 0)
    stats = {
        "total": total,
        "par_statut": par_statut,
        "taux_conversion": round(converted / total * 100, 1) if total else 0,
    }

    doc_bytes = generate_monthly_report(agency.name, stats, leads)
    filename = f"rapport_{agency.name.replace(' ', '_')}.docx"
    return StreamingResponse(
        io.BytesIO(doc_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/config")
async def get_admin_config(
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Retourne la config API keys de la première agence (super-admin)."""
    agency = session.exec(select(Agency)).first()
    if not agency:
        return {"sms_api_key": "", "email_api_key": ""}
    return {
        "sms_api_key": agency.sms_api_key or "",
        "email_api_key": agency.email_api_key or "",
    }


@router.put("/config")
async def update_admin_config(
    body: Dict[str, Any],
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Met à jour les clés API de la première agence."""
    agency = session.exec(select(Agency)).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Aucune agence configurée")
    if "sms_api_key" in body:
        agency.sms_api_key = body["sms_api_key"] or None
    if "email_api_key" in body:
        agency.email_api_key = body["email_api_key"] or None
    session.add(agency)
    session.commit()
    return {"detail": "Configuration sauvegardée"}
