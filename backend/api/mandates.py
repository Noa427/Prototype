from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import csv
import io

from ..database import get_session
from ..models import Mandate, User
from ..auth import get_current_user
from ..services.mandate_service import generate_mandate_pdf

router = APIRouter(prefix="/mandates", tags=["mandates"])


class MandateCreate(BaseModel):
    mandate_type: str
    property_address: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    start_date: str  # ISO date
    end_date: str
    exclusive: bool = False
    commission_rate: float = 3.0


class MandateUpdate(BaseModel):
    mandate_type: Optional[str] = None
    property_address: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    exclusive: Optional[bool] = None
    commission_rate: Optional[float] = None
    status: Optional[str] = None


@router.post("/")
async def create_mandate(
    body: MandateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agency_id = current_user.agency_id
    if not agency_id:
        raise HTTPException(status_code=400, detail="Utilisateur sans agence")

    # Numéro séquentiel par agence
    max_num = session.exec(
        select(func.max(Mandate.mandate_number)).where(Mandate.agency_id == agency_id)
    ).first()
    next_num = (max_num or 0) + 1

    mandate = Mandate(
        agency_id=agency_id,
        mandate_number=next_num,
        mandate_type=body.mandate_type,
        property_address=body.property_address,
        owner_name=body.owner_name,
        owner_email=body.owner_email,
        owner_phone=body.owner_phone,
        start_date=datetime.fromisoformat(body.start_date),
        end_date=datetime.fromisoformat(body.end_date),
        exclusive=body.exclusive,
        commission_rate=body.commission_rate,
    )
    session.add(mandate)
    session.commit()
    session.refresh(mandate)
    return mandate


@router.get("/")
async def list_mandates(
    mandate_type: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agency_id = current_user.agency_id
    stmt = select(Mandate).where(Mandate.agency_id == agency_id)
    if mandate_type:
        stmt = stmt.where(Mandate.mandate_type == mandate_type)
    if status:
        stmt = stmt.where(Mandate.status == status)
    mandates = session.exec(stmt.order_by(Mandate.mandate_number)).all()
    return mandates


@router.get("/export")
async def export_mandates_csv(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Export CSV du registre des mandats (Loi Hoguet)."""
    agency_id = current_user.agency_id
    mandates = session.exec(
        select(Mandate).where(Mandate.agency_id == agency_id).order_by(Mandate.mandate_number)
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "N° Mandat", "Type", "Adresse du bien", "Nom propriétaire",
        "Email", "Téléphone", "Date début", "Date fin",
        "Exclusif", "Commission (%)", "Statut", "Créé le"
    ])
    for m in mandates:
        writer.writerow([
            m.mandate_number, m.mandate_type, m.property_address, m.owner_name,
            m.owner_email or "", m.owner_phone or "",
            m.start_date.date().isoformat(), m.end_date.date().isoformat(),
            "Oui" if m.exclusive else "Non",
            m.commission_rate, m.status,
            m.created_at.strftime("%d/%m/%Y"),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registre_mandats.csv"},
    )


@router.get("/{mandate_id}")
async def get_mandate(
    mandate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    mandate = session.get(Mandate, mandate_id)
    if not mandate or mandate.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")
    return mandate


@router.put("/{mandate_id}")
async def update_mandate(
    mandate_id: int,
    body: MandateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    mandate = session.get(Mandate, mandate_id)
    if not mandate or mandate.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")

    for field, value in body.model_dump(exclude_none=True).items():
        if field in ("start_date", "end_date") and value:
            setattr(mandate, field, datetime.fromisoformat(value))
        else:
            setattr(mandate, field, value)

    session.add(mandate)
    session.commit()
    session.refresh(mandate)
    return mandate


@router.delete("/{mandate_id}")
async def cancel_mandate(
    mandate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    mandate = session.get(Mandate, mandate_id)
    if not mandate or mandate.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")
    mandate.status = "annulé"
    session.add(mandate)
    session.commit()
    return {"message": "Mandat annulé"}


@router.post("/{mandate_id}/generate-pdf")
async def mandate_pdf(
    mandate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    mandate = session.get(Mandate, mandate_id)
    if not mandate or mandate.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")

    content = generate_mandate_pdf(mandate)
    filename = f"mandat_{mandate.mandate_number:04d}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
