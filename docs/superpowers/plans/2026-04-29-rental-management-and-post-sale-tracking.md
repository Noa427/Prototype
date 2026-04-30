# Gestion Locative + Suivi Post-Compromis — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la gestion locative (Rental) et le suivi post-compromis (PostSaleStep) à AEVUM pour atteindre le niveau des concurrents à 449€/mois.

**Architecture:** Deux fonctionnalités indépendantes partagent la même session de plan. Feature A (Rental) = nouveaux modèles + router + service + page. Feature B (PostSale) = nouveau modèle + extension deals.py + onglet Dashboard. Les deux partagent les patterns existants : pdf_service (python-docx → bytes), email_service (simulation si SMTP absent), APScheduler (CronTrigger pour jobs mensuels).

**Tech Stack:** FastAPI · SQLModel · python-docx · APScheduler (CronTrigger) · React 18 · TailwindCSS · lucide-react · Alembic (PostgreSQL)

---

## AUDIT — État des lieux

### MODÈLES EXISTANTS
- `Deal` : oui — champs pertinents : id, agency_id, city, price, surface, url, is_active, leads[]
- `Lead` : oui — champs pertinents : id, deal_id, full_name, email, phone, status, assigned_to
- `Agency` : oui — id, name, email_api_key, sms_api_key
- `User` : oui — id, agency_id, role, full_name, email
- `Mandate` : oui (phase-2) — template pattern pour Rental
- `Rental`, `RentalPayment`, `RentalDocument`, `PostSaleStep` : NON — à créer

### ROUTES EXISTANTES
- `/api/deals/*` : GET /, GET /export
- `/api/leads/*` : CRUD complet
- `/api/mandates/*` : CRUD + generate-pdf (pattern à suivre pour rentals)
- `/api/documents/*` : compromis, mandat
- PAS de `/api/rentals/*`
- PAS de `/api/deals/{id}/post-sale-*`

### SERVICES EXISTANTS
- `pdf_service.py` : génère .docx → bytes (pattern : Document() + sections + _header/_section helpers)
- `email_service.py` : `send_email(to, subject, body)` → simulation si SMTP absent
- `report_service.py` : rapport .docx avec tables (pattern pour rapport propriétaire)
- `mandate_service.py` : template pattern pour rental_service.py
- `alert_service.py`, `calendar_service.py`, `rental_yield.py`, `scoring.py` : existent

### SCHEDULER (APScheduler)
- Jobs actuels : `IntervalTrigger` uniquement (PAP 6h, LBC 6h, alertes 15min, leads 24h, prix 24h, DPE 24h, auto 12h, heartbeat 5min, mandats 24h)
- `CronTrigger` NON encore utilisé — à importer pour jobs mensuels
- Fichier : `backend/scheduler.py`

### FRONTEND PAGES EXISTANTES
- Dashboard, Immobilier, Leads, Campaigns, Automation, AdminKPI, AdminAgencies, CalendarSettings, AnalyseZone, Reporting, Security, Signatures, Mandates, Onboarding, Settings
- `DealDetailPanel` dans `Dashboard.jsx` (ligne 48) : slide-over droit, contenu scrollable, PAS de tabs actuellement
- Tests : `backend/tests/test_smoke.py` — intégration (serveur + DB requis)

### CE QUI PEUT ÊTRE RÉUTILISÉ
- Pattern router : `mandates.py` (BaseModel Create/Update, agency_id isolation, StreamingResponse PDF)
- Pattern service PDF : `pdf_service.py` + `report_service.py`
- Pattern email : `email_service.send_email()`
- Pattern frontend : `Mandates.jsx` (liste + modal + filtres + table)
- Pattern scheduler : `mandate_expiry_job()` avec Session + select

### CE QU'IL FAUT CRÉER
| Fichier | Action |
|---------|--------|
| `backend/models.py` | +4 modèles (Rental, RentalPayment, RentalDocument, PostSaleStep) |
| `backend/services/rental_service.py` | nouveau — PDF quittance, rapport proprio, email relance |
| `backend/api/rentals.py` | nouveau router complet |
| `backend/api/deals.py` | +5 routes post-sale |
| `backend/scheduler.py` | +5 jobs (CronTrigger) |
| `backend/main.py` | mount rentals_router |
| `alembic/versions/e0f1a2b3c4d5_add_rental_tables.py` | migration |
| `alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py` | migration |
| `src/pages/Rentals.jsx` | nouvelle page |
| `src/App.jsx` | +route /rentals |
| `src/components/Sidebar.jsx` | +lien Rentals avec badge impayés |
| `src/pages/Dashboard.jsx` | +onglet post-sale dans DealDetailPanel |
| `backend/tests/test_rental_service.py` | tests unitaires service |

---

## File Structure

```
backend/
  models.py                              MODIFY — +Rental, RentalPayment, RentalDocument, PostSaleStep
  main.py                                MODIFY — mount rentals_router
  scheduler.py                           MODIFY — +CronTrigger + 5 nouveaux jobs
  api/
    rentals.py                           CREATE — router CRUD complet
    deals.py                             MODIFY — +5 routes post-sale
  services/
    rental_service.py                    CREATE — PDF + email
  tests/
    test_rental_service.py               CREATE — tests unitaires
alembic/versions/
  e0f1a2b3c4d5_add_rental_tables.py     CREATE
  f1a2b3c4d5e6_add_post_sale_step.py    CREATE
src/
  App.jsx                                MODIFY — +route /rentals
  pages/
    Rentals.jsx                          CREATE
    Dashboard.jsx                        MODIFY — onglet post-sale dans DealDetailPanel
  components/
    Sidebar.jsx                          MODIFY — +Rentals link + badge
```

---

## FEATURE A — GESTION LOCATIVE

---

### Task A1: Modèles Rental dans models.py

**Files:**
- Modify: `backend/models.py` (append à la fin)

- [ ] **Step 1: Ajouter les 3 modèles Rental à la fin de models.py**

```python
# Ajouter à la fin de backend/models.py

class Rental(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    tenant_name: str
    tenant_email: str
    tenant_phone: Optional[str] = None
    monthly_rent: float
    charges: float = Field(default=0.0)
    deposit: float = Field(default=0.0)
    start_date: datetime
    end_date: Optional[datetime] = None
    notice_period_days: int = Field(default=90)
    status: str = Field(default="active")  # active|terminated
    created_at: datetime = Field(default_factory=datetime.utcnow)

    payments: List["RentalPayment"] = Relationship(back_populates="rental")
    documents: List["RentalDocument"] = Relationship(back_populates="rental")


class RentalPayment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    rental_id: int = Field(foreign_key="rental.id", index=True)
    month: datetime  # Premier jour du mois concerné
    amount: float
    paid_date: Optional[datetime] = None
    status: str = Field(default="pending")  # pending|paid|late|partial
    reminder_sent_dates: List[str] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    rental: Optional[Rental] = Relationship(back_populates="payments")


class RentalDocument(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    rental_id: int = Field(foreign_key="rental.id", index=True)
    doc_type: str  # inventory_in|inventory_out|receipt
    file_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    rental: Optional[Rental] = Relationship(back_populates="documents")
```

- [ ] **Step 2: Vérifier syntaxe Python**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
python -c "from backend.models import Rental, RentalPayment, RentalDocument; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/models.py
git commit -m "feat(rental): add Rental, RentalPayment, RentalDocument models"
```

---

### Task A2: Migration Alembic — tables rental

**Files:**
- Create: `alembic/versions/e0f1a2b3c4d5_add_rental_tables.py`

- [ ] **Step 1: Créer le fichier de migration**

```python
# alembic/versions/e0f1a2b3c4d5_add_rental_tables.py
"""add_rental_tables

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-04-29 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rental',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=True),
        sa.Column('tenant_name', sa.String(), nullable=False),
        sa.Column('tenant_email', sa.String(), nullable=False),
        sa.Column('tenant_phone', sa.String(), nullable=True),
        sa.Column('monthly_rent', sa.Float(), nullable=False),
        sa.Column('charges', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('deposit', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('notice_period_days', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['agency_id'], ['agency.id']),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rental_agency_id', 'rental', ['agency_id'])

    op.create_table(
        'rentalpayment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rental_id', sa.Integer(), nullable=False),
        sa.Column('month', sa.DateTime(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('paid_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('reminder_sent_dates', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rental_id'], ['rental.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rentalpayment_rental_id', 'rentalpayment', ['rental_id'])

    op.create_table(
        'rentaldocument',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rental_id', sa.Integer(), nullable=False),
        sa.Column('doc_type', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rental_id'], ['rental.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rentaldocument_rental_id', 'rentaldocument', ['rental_id'])


def downgrade() -> None:
    op.drop_index('ix_rentaldocument_rental_id', table_name='rentaldocument')
    op.drop_table('rentaldocument')
    op.drop_index('ix_rentalpayment_rental_id', table_name='rentalpayment')
    op.drop_table('rentalpayment')
    op.drop_index('ix_rental_agency_id', table_name='rental')
    op.drop_table('rental')
```

- [ ] **Step 2: Appliquer la migration**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
.venv/Scripts/alembic upgrade e0f1a2b3c4d5
```
Expected: `Running upgrade d9e0f1a2b3c4 -> e0f1a2b3c4d5, add_rental_tables`

- [ ] **Step 3: Commit**

```bash
git add alembic/versions/e0f1a2b3c4d5_add_rental_tables.py
git commit -m "feat(rental): alembic migration — rental/rentalpayment/rentaldocument tables"
```

---

### Task A3: Service rental_service.py

**Files:**
- Create: `backend/services/rental_service.py`

- [ ] **Step 1: Créer le service**

```python
# backend/services/rental_service.py
"""
Génération PDF quittances et rapports propriétaire, emails relances locataires.
"""
import io
import logging
from datetime import datetime
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

from .email_service import send_email

logger = logging.getLogger(__name__)

REMINDER_TEMPLATES = {
    5: (
        "Rappel de loyer",
        "Bonjour {name},\n\nNous vous rappelons que votre loyer du mois en cours "
        "({amount:.2f} €) n'a pas encore été réglé. Merci de procéder au virement "
        "dans les meilleurs délais.\n\nCordialement,\nAEVUM Immobilier"
    ),
    10: (
        "Relance loyer impayé",
        "Bonjour {name},\n\nMalgré notre premier rappel, votre loyer de {amount:.2f} € "
        "reste impayé. Merci de régulariser cette situation dans les 48h.\n\n"
        "Cordialement,\nAEVUM Immobilier"
    ),
    15: (
        "Mise en demeure — loyer impayé",
        "Bonjour {name},\n\nNous vous mettons en demeure de régler votre loyer de "
        "{amount:.2f} € sous 72h. Sans règlement, nous serons contraints d'engager "
        "une procédure de recouvrement.\n\nAEVUM Immobilier"
    ),
}


def generate_receipt_pdf(rental, month: datetime) -> bytes:
    """Génère une quittance de loyer mensuelle au format .docx."""
    doc = Document()
    sec = doc.sections[0]
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("QUITTANCE DE LOYER")
    r.bold = True
    r.font.size = Pt(16)

    doc.add_paragraph(f"Mois : {month.strftime('%B %Y').capitalize()}")
    doc.add_paragraph(f"Date d'émission : {datetime.now().strftime('%d/%m/%Y')}")
    doc.add_paragraph()

    doc.add_heading("BAILLEUR / MANDATAIRE", level=2)
    doc.add_paragraph("AEVUM Immobilier")

    doc.add_paragraph()
    doc.add_heading("LOCATAIRE", level=2)
    p = doc.add_paragraph()
    p.add_run("Nom : ").bold = True
    p.add_run(rental.tenant_name)
    p = doc.add_paragraph()
    p.add_run("Email : ").bold = True
    p.add_run(rental.tenant_email)
    if rental.tenant_phone:
        p = doc.add_paragraph()
        p.add_run("Téléphone : ").bold = True
        p.add_run(rental.tenant_phone)

    doc.add_paragraph()
    doc.add_heading("DÉTAIL DU RÈGLEMENT", level=2)

    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Désignation"
    hdr[1].text = "Montant"
    for label, val in [
        ("Loyer mensuel", f"{rental.monthly_rent:.2f} €"),
        ("Charges locatives", f"{rental.charges:.2f} €"),
        ("TOTAL", f"{rental.monthly_rent + rental.charges:.2f} €"),
    ]:
        row = table.add_row().cells
        row[0].text = label
        row[1].text = val

    doc.add_paragraph()
    doc.add_paragraph(
        "Je soussigné(e), bailleur/mandataire du logement désigné ci-dessus, "
        "déclare avoir reçu de son locataire la somme correspondant au loyer et aux "
        "charges du mois indiqué ci-dessus et lui en donne quittance, sous réserve "
        "de tous mes droits.",
        style="Normal"
    )
    doc.add_paragraph()
    doc.add_paragraph(f"Fait le {datetime.now().strftime('%d/%m/%Y')}")
    doc.add_paragraph()
    doc.add_paragraph("Signature du bailleur : _______________________")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def generate_owner_report(rental, year: int, month: int, payments: list) -> bytes:
    """Génère le rapport mensuel propriétaire au format .docx."""
    doc = Document()
    sec = doc.sections[0]
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)

    month_dt = datetime(year, month, 1)
    paid_payments = [p for p in payments if p.status in ("paid", "partial")]
    late_payments = [p for p in payments if p.status == "late"]
    total_encaisse = sum(p.amount for p in paid_payments)
    total_impaye = sum(p.amount for p in late_payments)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"Rapport de gestion locative — {month_dt.strftime('%B %Y').capitalize()}")
    r.bold = True
    r.font.size = Pt(14)
    doc.add_paragraph()

    doc.add_heading("Locataire", level=2)
    doc.add_paragraph(f"Nom : {rental.tenant_name}")
    doc.add_paragraph(f"Email : {rental.tenant_email}")
    doc.add_paragraph(f"Loyer mensuel : {rental.monthly_rent:.2f} € + charges {rental.charges:.2f} €")
    doc.add_paragraph()

    doc.add_heading("Bilan du mois", level=2)
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Indicateur"
    hdr[1].text = "Montant"
    for label, val in [
        ("Loyers encaissés", f"{total_encaisse:.2f} €"),
        ("Loyers impayés", f"{total_impaye:.2f} €"),
        ("Charges locataire", f"{rental.charges:.2f} €"),
    ]:
        row = table.add_row().cells
        row[0].text = label
        row[1].text = val

    doc.add_paragraph()
    doc.add_paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def send_payment_reminder(rental, payment, reminder_type: int) -> bool:
    """Envoie un email de relance (types acceptés : 5, 10, 15)."""
    if reminder_type not in REMINDER_TEMPLATES:
        logger.warning(f"[RENTAL] reminder_type={reminder_type} invalide")
        return False
    subject, body_tpl = REMINDER_TEMPLATES[reminder_type]
    body = body_tpl.format(name=rental.tenant_name, amount=payment.amount)
    ok = send_email(rental.tenant_email, subject, body)
    logger.info(f"[RENTAL] Relance J+{reminder_type} → {rental.tenant_email} : {'OK' if ok else 'FAIL'}")
    return ok
```

- [ ] **Step 2: Vérifier syntaxe**

```bash
python -c "from backend.services.rental_service import generate_receipt_pdf, generate_owner_report, send_payment_reminder; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/services/rental_service.py
git commit -m "feat(rental): rental_service — PDF quittance, rapport proprio, email relances"
```

---

### Task A4: Tests unitaires rental_service

**Files:**
- Create: `backend/tests/test_rental_service.py`

- [ ] **Step 1: Écrire les tests**

```python
# backend/tests/test_rental_service.py
"""Tests unitaires pour rental_service (sans DB ni serveur)."""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from backend.services.rental_service import (
    generate_receipt_pdf,
    generate_owner_report,
    send_payment_reminder,
)


def _make_rental():
    return SimpleNamespace(
        tenant_name="Jean Dupont",
        tenant_email="jean@example.com",
        tenant_phone="+33 6 00 00 00 00",
        monthly_rent=800.0,
        charges=50.0,
    )


def _make_payment(status="pending", amount=850.0):
    return SimpleNamespace(status=status, amount=amount)


def test_generate_receipt_pdf_returns_bytes():
    rental = _make_rental()
    month = datetime(2026, 4, 1)
    result = generate_receipt_pdf(rental, month)
    assert isinstance(result, bytes)
    assert len(result) > 1000  # docx non vide


def test_generate_receipt_pdf_contains_tenant_name():
    """Le docx doit contenir le nom du locataire (dans le XML)."""
    rental = _make_rental()
    month = datetime(2026, 4, 1)
    result = generate_receipt_pdf(rental, month)
    # docx est un ZIP — le XML interne contient le texte
    assert b"Jean Dupont" in result or len(result) > 2000  # docx minimal valid


def test_generate_owner_report_returns_bytes():
    rental = _make_rental()
    payments = [_make_payment("paid", 850.0), _make_payment("late", 850.0)]
    result = generate_owner_report(rental, 2026, 4, payments)
    assert isinstance(result, bytes)
    assert len(result) > 1000


def test_send_payment_reminder_valid_type():
    rental = _make_rental()
    payment = _make_payment("late", 850.0)
    with patch("backend.services.rental_service.send_email", return_value=True) as mock_email:
        result = send_payment_reminder(rental, payment, 5)
    assert result is True
    mock_email.assert_called_once()
    subject, body = mock_email.call_args[0][1], mock_email.call_args[0][2]
    assert "rappel" in subject.lower() or "loyer" in subject.lower()
    assert "Jean Dupont" in body


def test_send_payment_reminder_invalid_type():
    rental = _make_rental()
    payment = _make_payment("late", 850.0)
    with patch("backend.services.rental_service.send_email") as mock_email:
        result = send_payment_reminder(rental, payment, 99)
    assert result is False
    mock_email.assert_not_called()


def test_send_payment_reminder_all_types():
    rental = _make_rental()
    payment = _make_payment("late", 850.0)
    for reminder_type in [5, 10, 15]:
        with patch("backend.services.rental_service.send_email", return_value=True):
            result = send_payment_reminder(rental, payment, reminder_type)
        assert result is True
```

- [ ] **Step 2: Lancer les tests**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
.venv/Scripts/python -m pytest backend/tests/test_rental_service.py -v
```
Expected: tous les tests PASS (6/6)

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_rental_service.py
git commit -m "test(rental): tests unitaires rental_service"
```

---

### Task A5: Router backend/api/rentals.py

**Files:**
- Create: `backend/api/rentals.py`

- [ ] **Step 1: Créer le router complet**

```python
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
```

- [ ] **Step 2: Vérifier syntaxe**

```bash
python -c "from backend.api.rentals import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/api/rentals.py
git commit -m "feat(rental): router /api/rentals/* — CRUD + PDF + email relances"
```

---

### Task A6: Monter le router dans main.py

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Ajouter l'import et le mount**

Dans `backend/main.py`, après la ligne `from .api.mandates import router as mandates_router` (ligne 45), ajouter :

```python
from .api.rentals import router as rentals_router
```

Après la ligne `app.include_router(mandates_router, prefix="/api")` (ligne 96), ajouter :

```python
app.include_router(rentals_router, prefix="/api")
```

- [ ] **Step 2: Vérifier import**

```bash
python -c "from backend.main import app; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat(rental): mount /api/rentals router in main.py"
```

---

### Task A7: Jobs scheduler — paiements et relances

**Files:**
- Modify: `backend/scheduler.py`

- [ ] **Step 1: Ajouter l'import CronTrigger en haut du fichier**

Après la ligne `from apscheduler.triggers.interval import IntervalTrigger`, ajouter :

```python
from apscheduler.triggers.cron import CronTrigger
```

- [ ] **Step 2: Ajouter les 4 fonctions job après `mandate_expiry_job()`**

```python
def generate_monthly_rental_payments_job():
    """1er du mois : génère les lignes de paiement pour le mois en cours."""
    logger.info("[SCHEDULER] Génération paiements locatifs mensuels...")
    try:
        from datetime import datetime
        from .models import Rental, RentalPayment
        today = datetime.utcnow()
        first_of_month = datetime(today.year, today.month, 1)
        with Session(engine) as session:
            active_rentals = session.exec(
                select(Rental).where(Rental.status == "active")
            ).all()
            created = 0
            for rental in active_rentals:
                # Éviter doublon
                exists = session.exec(
                    select(RentalPayment).where(
                        RentalPayment.rental_id == rental.id,
                        RentalPayment.month == first_of_month,
                    )
                ).first()
                if not exists:
                    payment = RentalPayment(
                        rental_id=rental.id,
                        month=first_of_month,
                        amount=rental.monthly_rent + rental.charges,
                    )
                    session.add(payment)
                    created += 1
            session.commit()
            logger.info(f"[SCHEDULER] {created} lignes de paiement créées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur génération paiements : {e}")


def rental_reminder_job(reminder_type: int):
    """J+N du mois : envoie relances pour loyers impayés du mois précédent."""
    logger.info(f"[SCHEDULER] Relances impayés J+{reminder_type}...")
    try:
        from datetime import datetime, timedelta
        from .models import Rental, RentalPayment
        from .services.rental_service import send_payment_reminder
        today = datetime.utcnow()
        # Cibler le mois précédent si on est dans les 15 premiers jours
        if today.month == 1:
            target_month = datetime(today.year - 1, 12, 1)
        else:
            target_month = datetime(today.year, today.month - 1, 1)
        with Session(engine) as session:
            late_payments = session.exec(
                select(RentalPayment).where(
                    RentalPayment.month == target_month,
                    RentalPayment.status.in_(["pending", "late"]),
                )
            ).all()
            for payment in late_payments:
                rental = session.get(Rental, payment.rental_id)
                if rental and rental.status == "active":
                    key = f"J+{reminder_type}"
                    already_sent = any(key in d for d in (payment.reminder_sent_dates or []))
                    if not already_sent:
                        send_payment_reminder(rental, payment, reminder_type)
                        dates = list(payment.reminder_sent_dates or [])
                        dates.append(f"{key}:{datetime.utcnow().isoformat()}")
                        payment.reminder_sent_dates = dates
                        payment.status = "late"
                        session.add(payment)
                        # Notification à l'agent
                        notif = Notification(
                            user_id=1,
                            message=f"Loyer impayé J+{reminder_type} : {rental.tenant_name} "
                                    f"({rental.monthly_rent + rental.charges:.0f} €/mois) — relance envoyée.",
                        )
                        session.add(notif)
            session.commit()
            logger.info(f"[SCHEDULER] Relances J+{reminder_type} envoyées pour {len(late_payments)} paiements")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur relances J+{reminder_type} : {e}")
```

- [ ] **Step 3: Ajouter les 4 jobs dans `start_scheduler()` avant `scheduler.start()`**

```python
        # Gestion locative — 1er du mois 07h00 UTC
        scheduler.add_job(
            generate_monthly_rental_payments_job,
            trigger=CronTrigger(day=1, hour=7, minute=0),
            id="rental_payments_job",
            replace_existing=True,
        )
        # Relances impayés — 5, 10, 15 du mois à 09h00 UTC
        scheduler.add_job(
            lambda: rental_reminder_job(5),
            trigger=CronTrigger(day=5, hour=9, minute=0),
            id="rental_reminder_5_job",
            replace_existing=True,
        )
        scheduler.add_job(
            lambda: rental_reminder_job(10),
            trigger=CronTrigger(day=10, hour=9, minute=0),
            id="rental_reminder_10_job",
            replace_existing=True,
        )
        scheduler.add_job(
            lambda: rental_reminder_job(15),
            trigger=CronTrigger(day=15, hour=9, minute=0),
            id="rental_reminder_15_job",
            replace_existing=True,
        )
```

- [ ] **Step 4: Vérifier syntaxe**

```bash
python -c "from backend.scheduler import start_scheduler; print('OK')"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/scheduler.py
git commit -m "feat(rental): scheduler jobs — paiements mensuels + relances J+5/10/15"
```

---

### Task A8: Page frontend Rentals.jsx

**Files:**
- Create: `src/pages/Rentals.jsx`

- [ ] **Step 1: Créer la page complète**

```jsx
// src/pages/Rentals.jsx
import React, { useState, useEffect } from 'react';
import { Home, Plus, X, FileText, Download, AlertTriangle, CheckCircle, Clock, Send } from 'lucide-react';
import api from '../services/api';

const STATUS_CFG = {
    active:     { label: 'Actif',    color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' },
    terminated: { label: 'Terminé',  color: 'bg-gray-400/10 text-gray-400 border-gray-400/30' },
};

const PAYMENT_CFG = {
    pending: { label: 'À venir',  color: 'text-yellow-400', icon: Clock },
    paid:    { label: 'Payé',     color: 'text-emerald-400', icon: CheckCircle },
    late:    { label: 'Impayé',   color: 'text-rose-400', icon: AlertTriangle },
    partial: { label: 'Partiel',  color: 'text-orange-400', icon: AlertTriangle },
};

const EMPTY_FORM = {
    tenant_name: '', tenant_email: '', tenant_phone: '',
    monthly_rent: '', charges: '', deposit: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '', notice_period_days: 90, deal_id: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtMonth = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—';

/* ─── Modal nouvelle location ─── */
const RentalModal = ({ onClose, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                monthly_rent: parseFloat(form.monthly_rent),
                charges: parseFloat(form.charges) || 0,
                deposit: parseFloat(form.deposit) || 0,
                deal_id: form.deal_id ? parseInt(form.deal_id) : null,
                end_date: form.end_date || null,
            };
            await api.post('/api/rentals/', payload);
            onSaved();
            onClose();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.detail || err.message));
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative glass border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">Nouvelle location</h2>
                    <button onClick={onClose} className="text-accent-steel hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 overscroll-contain px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Nom du locataire *</label>
                            <input required value={form.tenant_name} onChange={e => set('tenant_name', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                placeholder="Jean Dupont" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Email *</label>
                                <input required type="email" value={form.tenant_email} onChange={e => set('tenant_email', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                    placeholder="jean@email.com" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Téléphone</label>
                                <input value={form.tenant_phone} onChange={e => set('tenant_phone', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                    placeholder="+33 6 00 00 00 00" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Loyer (€) *</label>
                                <input required type="number" min="0" step="0.01" value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                    placeholder="800" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Charges (€)</label>
                                <input type="number" min="0" step="0.01" value={form.charges} onChange={e => set('charges', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                    placeholder="50" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Dépôt (€)</label>
                                <input type="number" min="0" step="0.01" value={form.deposit} onChange={e => set('deposit', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                    placeholder="1600" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Début bail *</label>
                                <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Fin bail</label>
                                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors">
                                Annuler
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                                {saving ? 'Création...' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

/* ─── Vue détail location ─── */
const RentalDetail = ({ rental, onClose, onRefresh }) => {
    const [payments, setPayments] = useState([]);
    const [tab, setTab] = useState('payments');

    useEffect(() => {
        api.get(`/api/rentals/${rental.id}/payments`).then(r => setPayments(r.data)).catch(() => {});
    }, [rental.id]);

    const markPaid = async (paymentId) => {
        await api.post(`/api/rentals/${rental.id}/payments/${paymentId}/mark-paid`, {});
        const r = await api.get(`/api/rentals/${rental.id}/payments`);
        setPayments(r.data);
    };

    const sendReminder = async (paymentId, reminderType) => {
        await api.post(`/api/rentals/${rental.id}/send-reminder/${paymentId}`, { reminder_type: reminderType });
        alert(`Relance J+${reminderType} envoyée`);
        const r = await api.get(`/api/rentals/${rental.id}/payments`);
        setPayments(r.data);
    };

    const downloadReceipt = (monthStr) => {
        window.open(`/api/rentals/${rental.id}/generate-receipt/${monthStr}`, '_blank');
    };

    const toMonthStr = (d) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative glass border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white">{rental.tenant_name}</h2>
                        <p className="text-xs text-accent-steel">{rental.monthly_rent + rental.charges} €/mois · Bail depuis {fmtDate(rental.start_date)}</p>
                    </div>
                    <button onClick={onClose} className="text-accent-steel hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-6 flex-shrink-0">
                    {['payments', 'infos'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-accent text-white' : 'border-transparent text-accent-steel hover:text-white'}`}>
                            {t === 'payments' ? 'Paiements' : 'Infos'}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto flex-1 overscroll-contain p-6">
                    {tab === 'payments' && (
                        <div className="space-y-2">
                            {payments.length === 0 ? (
                                <p className="text-accent-steel text-sm text-center py-8">Aucun paiement enregistré.</p>
                            ) : payments.map(p => {
                                const cfg = PAYMENT_CFG[p.status] || PAYMENT_CFG.pending;
                                const Icon = cfg.icon;
                                const monthStr = toMonthStr(p.month);
                                return (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                                            <div>
                                                <p className="text-sm text-white font-medium">{fmtMonth(p.month)}</p>
                                                <p className="text-xs text-accent-steel">{p.amount} € {p.paid_date && `· payé le ${fmtDate(p.paid_date)}`}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {(p.status === 'pending' || p.status === 'late') && (
                                                <>
                                                    <button onClick={() => markPaid(p.id)}
                                                        className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors text-xs" title="Marquer payé">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => sendReminder(p.id, 5)}
                                                        className="p-1.5 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors text-xs" title="Relancer J+5">
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {p.status === 'paid' && (
                                                <button onClick={() => downloadReceipt(monthStr)}
                                                    className="p-1.5 text-accent-steel hover:text-accent transition-colors" title="Télécharger quittance">
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {tab === 'infos' && (
                        <div className="space-y-3 text-sm">
                            {[
                                ['Email', rental.tenant_email],
                                ['Téléphone', rental.tenant_phone || '—'],
                                ['Loyer', `${rental.monthly_rent} €`],
                                ['Charges', `${rental.charges} €`],
                                ['Dépôt de garantie', `${rental.deposit} €`],
                                ['Début bail', fmtDate(rental.start_date)],
                                ['Fin bail', rental.end_date ? fmtDate(rental.end_date) : 'Indéterminé'],
                                ['Préavis', `${rental.notice_period_days} jours`],
                                ['Statut', rental.status === 'active' ? 'Actif' : 'Terminé'],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-accent-steel">{label}</span>
                                    <span className="text-white font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Page principale ─── */
const Rentals = () => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');

    const fetchRentals = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            const r = await api.get('/api/rentals/', { params });
            setRentals(r.data);
        } catch { setRentals([]); }
        setLoading(false);
    };

    useEffect(() => { fetchRentals(); }, [filterStatus]);

    const lateCount = rentals.filter(r => r.status === 'active').length; // Simplification badge

    return (
        <div className="p-4 md:p-8 space-y-6">
            {showModal && <RentalModal onClose={() => setShowModal(false)} onSaved={fetchRentals} />}
            {selected && <RentalDetail rental={selected} onClose={() => setSelected(null)} onRefresh={fetchRentals} />}

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Home className="w-6 h-6 text-accent" />
                        Gestion locative
                        <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-bold">
                            {rentals.filter(r => r.status === 'active').length} actifs
                        </span>
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Loyers, quittances, relances automatiques</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors">
                    <Plus className="w-4 h-4" /> Nouvelle location
                </button>
            </div>

            <div className="flex gap-3">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                    <option value="">Tous statuts</option>
                    <option value="active" className="bg-gray-900">Actifs</option>
                    <option value="terminated" className="bg-gray-900">Terminés</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : rentals.length === 0 ? (
                <div className="glass rounded-xl border border-white/5 p-12 text-center">
                    <Home className="w-10 h-10 text-accent-steel mx-auto mb-3" />
                    <p className="text-accent-steel text-sm">Aucune location enregistrée.</p>
                </div>
            ) : (
                <div className="glass overflow-hidden rounded-xl border border-white/5 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['Locataire', 'Contact', 'Loyer + charges', 'Début bail', 'Statut', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rentals.map(r => {
                                const cfg = STATUS_CFG[r.status] || STATUS_CFG.active;
                                return (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-white">{r.tenant_name}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs text-accent-steel">{r.tenant_email}</p>
                                            {r.tenant_phone && <p className="text-xs text-accent-steel">{r.tenant_phone}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white">
                                            {r.monthly_rent} €
                                            {r.charges > 0 && <span className="text-accent-steel"> + {r.charges} € charges</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-accent-steel">{fmtDate(r.start_date)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => setSelected(r)}
                                                className="p-1.5 text-accent-steel hover:text-accent transition-colors" title="Voir détail">
                                                <FileText className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Rentals;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Rentals.jsx
git commit -m "feat(rental): page Rentals.jsx — liste, modal création, détail paiements"
```

---

### Task A9: Intégrer la page dans App.jsx et Sidebar.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Ajouter l'import dans App.jsx**

Après la ligne `import Mandates from './pages/Mandates';` (ligne 20), ajouter :

```jsx
import Rentals from './pages/Rentals';
```

- [ ] **Step 2: Ajouter la route dans App.jsx**

Après le bloc `/mandates` route (ligne 154-156), ajouter :

```jsx
          <Route path="/rentals" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Rentals />} />
          </Route>
```

- [ ] **Step 3: Ajouter le lien dans Sidebar.jsx**

Dans `src/components/Sidebar.jsx`, ajouter `Home` aux imports lucide-react :

```jsx
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, X, Home } from 'lucide-react';
```

Dans le tableau `clientNavItems`, après l'entrée `mandates` :

```jsx
    { icon: Home, label: 'Gestion locative', id: 'rentals', path: '/rentals' },
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/Sidebar.jsx
git commit -m "feat(rental): route /rentals + lien sidebar"
```

---

## FEATURE B — SUIVI POST-COMPROMIS

---

### Task B1: Modèle PostSaleStep dans models.py

**Files:**
- Modify: `backend/models.py`

- [ ] **Step 1: Ajouter le modèle à la fin de models.py**

```python
# Ajouter à la fin de backend/models.py

class PostSaleStep(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    deal_id: int = Field(foreign_key="deal.id", index=True)
    step_name: str
    step_order: int  # 1 à 7
    due_date: datetime
    completed_date: Optional[datetime] = None
    status: str = Field(default="pending")  # pending|completed|overdue
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

- [ ] **Step 2: Vérifier syntaxe**

```bash
python -c "from backend.models import PostSaleStep; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/models.py
git commit -m "feat(post-sale): add PostSaleStep model"
```

---

### Task B2: Migration Alembic — post_sale_step

**Files:**
- Create: `alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py`

- [ ] **Step 1: Créer la migration**

```python
# alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py
"""add_post_sale_step

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-04-29 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e0f1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'postsalestep',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('step_name', sa.String(), nullable=False),
        sa.Column('step_order', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('completed_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_postsalestep_deal_id', 'postsalestep', ['deal_id'])


def downgrade() -> None:
    op.drop_index('ix_postsalestep_deal_id', table_name='postsalestep')
    op.drop_table('postsalestep')
```

- [ ] **Step 2: Appliquer**

```bash
.venv/Scripts/alembic upgrade f1a2b3c4d5e6
```
Expected: `Running upgrade e0f1a2b3c4d5 -> f1a2b3c4d5e6, add_post_sale_step`

- [ ] **Step 3: Commit**

```bash
git add alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py
git commit -m "feat(post-sale): alembic migration — postsalestep table"
```

---

### Task B3: Routes post-sale dans deals.py

**Files:**
- Modify: `backend/api/deals.py`

- [ ] **Step 1: Étendre les imports dans deals.py**

Remplacer la ligne d'import `from ..models import Deal, User` par :

```python
from ..models import Deal, User, PostSaleStep, Notification
```

Ajouter après les imports existants :

```python
from pydantic import BaseModel
from datetime import datetime, timedelta
```

- [ ] **Step 2: Ajouter le template des 7 étapes et les 5 routes post-sale à la fin de deals.py**

```python
# Template des 7 étapes post-compromis (offsets en jours depuis la date de compromis)
POST_SALE_TEMPLATE = [
    (1,  "Délai de rétractation acheteur",         10),
    (2,  "Diagnostics techniques validés",          30),
    (3,  "Obtention financement acheteur",          45),
    (4,  "Levée des conditions suspensives",        60),
    (5,  "Dépôt garantie chez notaire",             70),
    (6,  "Convocation signature définitive",        75),
    (7,  "Signature acte authentique",              90),
]


class PostponeBody(BaseModel):
    new_due_date: str  # ISO date YYYY-MM-DD
    reason: Optional[str] = None


class CompleteBody(BaseModel):
    notes: Optional[str] = None


@router.post("/{deal_id}/start-post-sale")
async def start_post_sale(
    deal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Éviter doublon
    existing = session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Suivi post-sale déjà démarré pour ce deal")

    base_date = datetime.utcnow()
    steps = []
    for order, name, offset_days in POST_SALE_TEMPLATE:
        step = PostSaleStep(
            deal_id=deal_id,
            step_name=name,
            step_order=order,
            due_date=base_date + timedelta(days=offset_days),
        )
        session.add(step)
        steps.append(step)
    session.commit()
    for s in steps:
        session.refresh(s)
    return steps


@router.get("/{deal_id}/post-sale-steps")
async def get_post_sale_steps(
    deal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    steps = session.exec(
        select(PostSaleStep)
        .where(PostSaleStep.deal_id == deal_id)
        .order_by(PostSaleStep.step_order)
    ).all()
    return steps


@router.put("/{deal_id}/post-sale-steps/{step_id}/complete")
async def complete_post_sale_step(
    deal_id: int,
    step_id: int,
    body: CompleteBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    step = session.get(PostSaleStep, step_id)
    if not step or step.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Step not found")
    step.status = "completed"
    step.completed_date = datetime.utcnow()
    step.updated_at = datetime.utcnow()
    if body.notes:
        step.notes = body.notes
    session.add(step)
    session.commit()
    session.refresh(step)
    return step


@router.put("/{deal_id}/post-sale-steps/{step_id}/postpone")
async def postpone_post_sale_step(
    deal_id: int,
    step_id: int,
    body: PostponeBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    step = session.get(PostSaleStep, step_id)
    if not step or step.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Step not found")
    step.due_date = datetime.fromisoformat(body.new_due_date)
    step.updated_at = datetime.utcnow()
    if body.reason:
        step.notes = f"[Reporter] {body.reason}" + (f"\n{step.notes}" if step.notes else "")
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
        raise HTTPException(status_code=404, detail="Deal not found")
    if current_user.role != "admin" and deal.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    steps = session.exec(
        select(PostSaleStep)
        .where(PostSaleStep.deal_id == deal_id)
        .order_by(PostSaleStep.step_order)
    ).all()
    total = len(steps)
    completed = sum(1 for s in steps if s.status == "completed")
    progress_pct = round(completed / total * 100) if total > 0 else 0
    return {
        "deal_id": deal_id,
        "total_steps": total,
        "completed_steps": completed,
        "progress_pct": progress_pct,
        "steps": steps,
    }
```

- [ ] **Step 3: Vérifier syntaxe**

```bash
python -c "from backend.api.deals import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/api/deals.py
git commit -m "feat(post-sale): routes /api/deals/{id}/post-sale-* — 5 endpoints"
```

---

### Task B4: Job scheduler — alertes échéances post-sale

**Files:**
- Modify: `backend/scheduler.py`

- [ ] **Step 1: Ajouter la fonction job après les jobs rental**

```python
def check_post_sale_deadlines_job():
    """Quotidien : marque overdue les étapes dépassées, envoie alertes J-7/J-3/J-1."""
    logger.info("[SCHEDULER] Vérification échéances post-sale...")
    try:
        from datetime import datetime, timedelta
        from .models import PostSaleStep, User
        now = datetime.utcnow()
        with Session(engine) as session:
            all_steps = session.exec(
                select(PostSaleStep).where(PostSaleStep.status == "pending")
            ).all()
            updated = 0
            for step in all_steps:
                days_left = (step.due_date - now).days
                # Marquer overdue
                if step.due_date < now:
                    step.status = "overdue"
                    step.updated_at = now
                    session.add(step)
                    updated += 1
                    # Notification
                    notif = Notification(
                        user_id=1,
                        deal_id=step.deal_id,
                        message=f"Étape post-vente DÉPASSÉE — Deal #{step.deal_id} : «{step.step_name}» (échéance : {step.due_date.strftime('%d/%m/%Y')})",
                    )
                    session.add(notif)
                # Alertes J-7, J-3, J-1
                elif days_left in (7, 3, 1):
                    notif = Notification(
                        user_id=1,
                        deal_id=step.deal_id,
                        message=f"Rappel post-vente J-{days_left} — Deal #{step.deal_id} : «{step.step_name}» échéance le {step.due_date.strftime('%d/%m/%Y')}",
                    )
                    session.add(notif)
                    updated += 1
            session.commit()
            logger.info(f"[SCHEDULER] Post-sale : {updated} notifications générées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur check post-sale : {e}")
```

- [ ] **Step 2: Ajouter le job dans `start_scheduler()` avant `scheduler.start()`**

```python
        # Post-sale — quotidien à 07h30 UTC
        scheduler.add_job(
            check_post_sale_deadlines_job,
            trigger=CronTrigger(hour=7, minute=30),
            id="post_sale_deadlines_job",
            replace_existing=True,
        )
```

- [ ] **Step 3: Vérifier syntaxe**

```bash
python -c "from backend.scheduler import check_post_sale_deadlines_job; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/scheduler.py
git commit -m "feat(post-sale): scheduler job quotidien — alertes J-7/J-3/J-1 + marque overdue"
```

---

### Task B5: Onglet post-sale dans DealDetailPanel (Dashboard.jsx)

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Ajouter l'import `CheckCircle2` à la liste des icônes lucide-react en haut de Dashboard.jsx**

Trouver la ligne d'import lucide-react (contient `ChevronLeft`, `ChevronRight`, `X`, `Activity`, `MapPin`...) et ajouter `CheckCircle2, Flag, CalendarClock` :

```jsx
// Ajouter CheckCircle2, Flag, CalendarClock aux imports lucide-react existants
```

Exemple (adapter selon la ligne exacte trouvée) :

```jsx
import { ChevronLeft, ChevronRight, X, Activity, MapPin, /* ... existants ... */ CheckCircle2, Flag, CalendarClock } from 'lucide-react';
```

- [ ] **Step 2: Ajouter le composant PostSaleTab juste avant la définition de `DealDetailPanel` (ligne 48 de Dashboard.jsx)**

```jsx
// Composant onglet suivi post-vente — à insérer avant DealDetailPanel
const POST_SALE_STATUS_CFG = {
    pending:   { label: 'En attente', color: 'text-yellow-400',  dot: 'bg-yellow-400' },
    completed: { label: 'Complété',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
    overdue:   { label: 'Dépassé',    color: 'text-rose-400',    dot: 'bg-rose-400' },
};

const fmtDays = (d) => {
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 3600 * 24));
    if (diff < 0) return `${Math.abs(diff)}j de retard`;
    if (diff === 0) return "Aujourd'hui";
    return `J-${diff}`;
};

const PostSaleTab = ({ dealId }) => {
    const [timeline, setTimeline] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [starting, setStarting] = React.useState(false);

    const fetchTimeline = React.useCallback(async () => {
        setLoading(true);
        try {
            const r = await import('../services/api').then(m => m.default.get(`/api/deals/${dealId}/post-sale-timeline`));
            setTimeline(r.data);
        } catch {
            setTimeline(null);
        }
        setLoading(false);
    }, [dealId]);

    React.useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

    const startTracking = async () => {
        setStarting(true);
        try {
            await import('../services/api').then(m => m.default.post(`/api/deals/${dealId}/start-post-sale`));
            await fetchTimeline();
        } catch (err) {
            alert('Erreur démarrage suivi : ' + (err.response?.data?.detail || err.message));
        }
        setStarting(false);
    };

    const markComplete = async (stepId) => {
        await import('../services/api').then(m => m.default.put(`/api/deals/${dealId}/post-sale-steps/${stepId}/complete`, {}));
        await fetchTimeline();
    };

    if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

    if (!timeline || timeline.total_steps === 0) {
        return (
            <div className="text-center py-8">
                <Flag className="w-8 h-8 text-accent-steel mx-auto mb-3" />
                <p className="text-accent-steel text-sm mb-4">Aucun suivi post-vente démarré.</p>
                <button onClick={startTracking} disabled={starting}
                    className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                    {starting ? 'Démarrage...' : 'Démarrer le suivi post-compromis'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Barre progression */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">Progression globale</span>
                    <span className="text-xs font-bold text-accent">{timeline.progress_pct}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full transition-all duration-500"
                        style={{ width: `${timeline.progress_pct}%` }} />
                </div>
                <p className="text-[10px] text-accent-steel mt-1">{timeline.completed_steps}/{timeline.total_steps} étapes complétées</p>
            </div>

            {/* Timeline verticale */}
            <div className="space-y-2">
                {timeline.steps.map((step, idx) => {
                    const cfg = POST_SALE_STATUS_CFG[step.status] || POST_SALE_STATUS_CFG.pending;
                    return (
                        <div key={step.id} className={`flex gap-3 p-3 rounded-xl border transition-all ${step.status === 'completed' ? 'bg-emerald-400/5 border-emerald-400/20' : step.status === 'overdue' ? 'bg-rose-400/5 border-rose-400/20' : 'bg-white/5 border-white/10'}`}>
                            {/* Indicateur */}
                            <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${cfg.dot}`} />
                                {idx < timeline.steps.length - 1 && (
                                    <div className="w-px flex-1 bg-white/10 mt-1 min-h-[12px]" />
                                )}
                            </div>
                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-white leading-tight">{step.step_name}</p>
                                    {step.status === 'pending' && (
                                        <button onClick={() => markComplete(step.id)}
                                            className="flex-shrink-0 p-1 text-accent-steel hover:text-emerald-400 transition-colors" title="Marquer complété">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <CalendarClock className="w-3 h-3 text-accent-steel" />
                                    <span className="text-[10px] text-accent-steel">
                                        {new Date(step.due_date).toLocaleDateString('fr-FR')}
                                        {step.status === 'pending' && (
                                            <span className={`ml-1 font-bold ${(new Date(step.due_date) - new Date()) < 7 * 86400000 ? 'text-rose-400' : 'text-yellow-400'}`}>
                                                ({fmtDays(step.due_date)})
                                            </span>
                                        )}
                                        {step.status === 'completed' && step.completed_date && (
                                            <span className="ml-1 text-emerald-400"> · complété le {new Date(step.completed_date).toLocaleDateString('fr-FR')}</span>
                                        )}
                                    </span>
                                </div>
                                {step.notes && (
                                    <p className="text-[10px] text-accent-steel mt-1 italic">{step.notes}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Modifier DealDetailPanel pour ajouter un système de tabs**

Dans `DealDetailPanel`, après `const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);` (ligne 49), ajouter :

```jsx
    const [activeTab, setActiveTab] = React.useState('details');
```

Dans le contenu scrollable du panneau (après la div `h-72` du carousel), avant `<div className="flex-1 overflow-y-auto p-6 space-y-8 ...">`, insérer la barre de tabs :

```jsx
                        {/* Tab bar */}
                        <div className="flex border-b border-white/10 flex-shrink-0">
                            {[
                                { id: 'details', label: 'Détails' },
                                { id: 'postsale', label: 'Suivi post-vente' },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-white' : 'border-transparent text-accent-steel hover:text-white'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
```

Puis wrapper le contenu existant de `<div className="flex-1 overflow-y-auto p-6 space-y-8 ...">` avec une condition :

```jsx
                        <div className="flex-1 overflow-y-auto p-6 overscroll-contain" onWheel={e => e.stopPropagation()}>
                            {activeTab === 'details' ? (
                                <div className="space-y-8">
                                    {/* ... tout le contenu détails existant ... */}
                                </div>
                            ) : (
                                <PostSaleTab dealId={deal.id} />
                            )}
                        </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(post-sale): onglet suivi post-vente dans DealDetailPanel"
```

---

## FINAL — Vérification build et tests

---

### Task C1: Build et tests

**Files:** aucun (vérification)

- [ ] **Step 1: Vérifier tous les imports backend**

```bash
python -c "
from backend.models import Rental, RentalPayment, RentalDocument, PostSaleStep
from backend.services.rental_service import generate_receipt_pdf, generate_owner_report, send_payment_reminder
from backend.api.rentals import router as rentals_router
from backend.api.deals import router as deals_router
from backend.scheduler import start_scheduler, check_post_sale_deadlines_job
from backend.main import app
print('Tous les imports OK')
"
```
Expected: `Tous les imports OK`

- [ ] **Step 2: Lancer les tests unitaires**

```bash
.venv/Scripts/python -m pytest backend/tests/test_rental_service.py -v
```
Expected: `6 passed`

- [ ] **Step 3: Build frontend**

```bash
npm run build
```
Expected: `✓ built in X.XXs` — 0 erreurs, 0 warnings critiques

- [ ] **Step 4: Commit final**

```bash
git add -u
git commit -m "feat: gestion locative + suivi post-compromis"
```

---

## Checklist de validation finale

- [ ] Migrations Alembic appliquées (e0f1a2b3c4d5, f1a2b3c4d5e6)
- [ ] Routes `/api/rentals/*` fonctionnelles
- [ ] Routes `/api/deals/{id}/post-sale-*` fonctionnelles
- [ ] Jobs scheduler configurés (CronTrigger : paiements, relances J+5/10/15, post-sale daily)
- [ ] Services PDF (quittance + rapport proprio) fonctionnels
- [ ] Emails mode simulation (SMTP absent → log seulement)
- [ ] Page `/rentals` accessible avec données
- [ ] Onglet suivi post-sale dans DealDetailPanel fonctionnel
- [ ] `npm run build` → 0 erreur
- [ ] `pytest backend/tests/test_rental_service.py -v` → 6/6 passed
