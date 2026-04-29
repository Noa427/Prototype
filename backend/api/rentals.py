# backend/api/rentals.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import io
import os
import shutil

from ..database import get_session
from ..models import Rental, RentalPayment, RentalDocument, User, Notification
from ..auth import get_current_user
from ..services.rental_service import (
    generate_receipt_pdf,
    generate_owner_report,
    send_payment_reminder,
)

router = APIRouter(prefix="/rentals", tags=["rentals"])

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads", "rentals")


class RentalCreate(BaseModel):
    deal_id: Optional[int] = None
    tenant_name: str
    tenant_email: str
    tenant_phone: Optional[str] = None
    monthly_rent: float
    charges: float = 0.0
    deposit: float = 0.0
    start_date: str  # ISO date YYYY-MM-DD
    end_date: Optional[str] = None
    notice_period_days: int = 90


class RentalUpdate(BaseModel):
    tenant_name: Optional[str] = None
    tenant_email: Optional[str] = None
    tenant_phone: Optional[str] = None
    monthly_rent: Optional[float] = None
    charges: Optional[float] = None
    deposit: Optional[float] = None
    end_date: Optional[str] = None
    notice_period_days: Optional[int] = None
    status: Optional[str] = None


class MarkPaidBody(BaseModel):
    paid_date: Optional[str] = None  # ISO date, défaut = aujourd'hui


class SendReminderBody(BaseModel):
    reminder_type: int  # 5, 10, ou 15


def _get_rental(rental_id: int, current_user: User, session: Session) -> Rental:
    rental = session.get(Rental, rental_id)
    if not rental or rental.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Location not found")
    return rental


@router.get("/")
async def list_rentals(
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Rental).where(Rental.agency_id == current_user.agency_id)
    if status:
        stmt = stmt.where(Rental.status == status)
    return session.exec(stmt.order_by(Rental.created_at.desc())).all()


@router.post("/")
async def create_rental(
    body: RentalCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.agency_id:
        raise HTTPException(status_code=400, detail="Utilisateur sans agence")
    rental = Rental(
        agency_id=current_user.agency_id,
        deal_id=body.deal_id,
        tenant_name=body.tenant_name,
        tenant_email=body.tenant_email,
        tenant_phone=body.tenant_phone,
        monthly_rent=body.monthly_rent,
        charges=body.charges,
        deposit=body.deposit,
        start_date=datetime.fromisoformat(body.start_date),
        end_date=datetime.fromisoformat(body.end_date) if body.end_date else None,
        notice_period_days=body.notice_period_days,
    )
    session.add(rental)
    session.commit()
    session.refresh(rental)
    # Générer la ligne de paiement du mois en cours
    today = datetime.utcnow()
    first_of_month = datetime(today.year, today.month, 1)
    payment = RentalPayment(
        rental_id=rental.id,
        month=first_of_month,
        amount=rental.monthly_rent + rental.charges,
    )
    session.add(payment)
    session.commit()
    return rental


@router.get("/{rental_id}")
async def get_rental(
    rental_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return _get_rental(rental_id, current_user, session)


@router.put("/{rental_id}")
async def update_rental(
    rental_id: int,
    body: RentalUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rental = _get_rental(rental_id, current_user, session)
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "end_date" and value:
            setattr(rental, field, datetime.fromisoformat(value))
        else:
            setattr(rental, field, value)
    session.add(rental)
    session.commit()
    session.refresh(rental)
    return rental


@router.delete("/{rental_id}")
async def terminate_rental(
    rental_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rental = _get_rental(rental_id, current_user, session)
    rental.status = "terminated"
    session.add(rental)
    session.commit()
    return {"message": "Bail terminé"}


@router.get("/{rental_id}/payments")
async def list_payments(
    rental_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _get_rental(rental_id, current_user, session)
    payments = session.exec(
        select(RentalPayment)
        .where(RentalPayment.rental_id == rental_id)
        .order_by(RentalPayment.month.desc())
    ).all()
    return payments


@router.post("/{rental_id}/payments/{payment_id}/mark-paid")
async def mark_payment_paid(
    rental_id: int,
    payment_id: int,
    body: MarkPaidBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _get_rental(rental_id, current_user, session)
    payment = session.get(RentalPayment, payment_id)
    if not payment or payment.rental_id != rental_id:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = "paid"
    payment.paid_date = (
        datetime.fromisoformat(body.paid_date) if body.paid_date else datetime.utcnow()
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


@router.post("/{rental_id}/generate-receipt/{month}")
async def generate_receipt(
    rental_id: int,
    month: str,  # format YYYY-MM
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rental = _get_rental(rental_id, current_user, session)
    try:
        year, mon = month.split("-")
        month_dt = datetime(int(year), int(mon), 1)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Format mois invalide (attendu: YYYY-MM)")
    content = generate_receipt_pdf(rental, month_dt)
    filename = f"quittance_{rental.tenant_name.replace(' ', '_')}_{month}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/{rental_id}/send-reminder/{payment_id}")
async def send_reminder(
    rental_id: int,
    payment_id: int,
    body: SendReminderBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rental = _get_rental(rental_id, current_user, session)
    payment = session.get(RentalPayment, payment_id)
    if not payment or payment.rental_id != rental_id:
        raise HTTPException(status_code=404, detail="Payment not found")
    ok = send_payment_reminder(rental, payment, body.reminder_type)
    # Enregistrer la date de relance dans l'historique
    dates = list(payment.reminder_sent_dates or [])
    dates.append(datetime.utcnow().isoformat())
    payment.reminder_sent_dates = dates
    if payment.status == "pending":
        payment.status = "late"
    session.add(payment)
    session.commit()
    return {"sent": ok, "reminder_type": body.reminder_type}


@router.get("/{rental_id}/report/{year}/{month}")
async def get_owner_report(
    rental_id: int,
    year: int,
    month: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rental = _get_rental(rental_id, current_user, session)
    month_dt = datetime(year, month, 1)
    payments = session.exec(
        select(RentalPayment).where(
            RentalPayment.rental_id == rental_id,
            RentalPayment.month >= month_dt,
            RentalPayment.month < datetime(year + (month // 12), (month % 12) + 1, 1),
        )
    ).all()
    content = generate_owner_report(rental, year, month, payments)
    filename = f"rapport_{rental.tenant_name.replace(' ', '_')}_{year}_{month:02d}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/{rental_id}/documents")
async def upload_document(
    rental_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rental = _get_rental(rental_id, current_user, session)
    upload_dir = os.path.join(UPLOADS_DIR, str(rental_id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    relative_path = f"uploads/rentals/{rental_id}/{file.filename}"
    doc = RentalDocument(
        rental_id=rental_id,
        doc_type=doc_type,
        file_path=relative_path,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


@router.get("/{rental_id}/documents")
async def list_documents(
    rental_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _get_rental(rental_id, current_user, session)
    return session.exec(
        select(RentalDocument)
        .where(RentalDocument.rental_id == rental_id)
        .order_by(RentalDocument.uploaded_at.desc())
    ).all()
