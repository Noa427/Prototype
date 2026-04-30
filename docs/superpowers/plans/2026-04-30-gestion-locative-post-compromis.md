# Gestion Locative + Suivi Post-Compromis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter les deux features manquantes d'AEVUM — gestion locative (frontend + badge) et suivi post-compromis (migration + routes + scheduler + UI) — sans toucher au backend rental déjà fonctionnel.

**Architecture:** Le backend rental (modèles, routes, scheduler, service) est 100% déjà écrit. Le backend post-sale a seulement le modèle. On ajoute : (1) migration PostSaleStep, (2) 5 routes deals.py + 1 route résumé, (3) job scheduler, (4) Rentals.jsx (pattern Mandates.jsx), (5) sidebar entry + App.jsx route, (6) badge + section post-sale dans DealDetailPanel de Dashboard.jsx.

**Tech Stack:** FastAPI, SQLModel, Alembic, APScheduler, React 18, Tailwind CSS, lucide-react, Axios (`api` service)

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py` | **Créer** |
| `backend/api/deals.py` | **Modifier** — +6 routes post-sale |
| `backend/tests/test_post_sale.py` | **Créer** — tests unitaires calcul dates |
| `backend/scheduler.py` | **Modifier** — +1 job + import PostSaleStep |
| `src/pages/Rentals.jsx` | **Créer** |
| `src/components/Sidebar.jsx` | **Modifier** — +1 entry + badge |
| `src/App.jsx` | **Modifier** — +1 route |
| `src/pages/Dashboard.jsx` | **Modifier** — badge cards + section post-sale |

---

## Task 1 — Migration Alembic : table `postsalestep`

**Files:**
- Create: `alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py`

- [ ] **Step 1 : Créer le fichier de migration**

```python
# alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py
"""add_post_sale_step

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-04-30 09:00:00.000000

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

- [ ] **Step 2 : Appliquer la migration**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
alembic upgrade head
```

Expected: `Running upgrade e0f1a2b3c4d5 -> f1a2b3c4d5e6, add_post_sale_step`

- [ ] **Step 3 : Commit**

```bash
git add alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py
git commit -m "feat(post-sale): migration Alembic table postsalestep"
```

---

## Task 2 — Tests unitaires : calcul dates post-sale

**Files:**
- Create: `backend/tests/test_post_sale.py`

- [ ] **Step 1 : Écrire les tests (ils échoueront — la fonction n'existe pas encore)**

```python
# backend/tests/test_post_sale.py
"""Tests unitaires pour le calcul des dates post-sale (sans DB)."""
from datetime import datetime, timedelta
from backend.api.deals import compute_post_sale_steps


def test_compute_returns_7_steps():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert len(steps) == 7


def test_step_order_sequential():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    orders = [s["step_order"] for s in steps]
    assert orders == list(range(1, 8))


def test_step_1_due_date_j10():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert steps[0]["due_date"] == compromise + timedelta(days=10)


def test_step_7_due_date_j90():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert steps[6]["due_date"] == compromise + timedelta(days=90)


def test_all_steps_have_pending_status():
    compromise = datetime(2026, 5, 1)
    steps = compute_post_sale_steps(compromise)
    assert all(s["status"] == "pending" for s in steps)
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
python -m pytest backend/tests/test_post_sale.py -v
```

Expected: `ImportError` ou `5 failed` — `compute_post_sale_steps` n'existe pas encore.

- [ ] **Step 3 : Implémenter les routes post-sale dans `backend/api/deals.py`**

Remplacer le contenu de `deals.py` par la version complète ci-dessous (les routes existantes + les nouvelles) :

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, or_
from typing import List, Optional
import csv
import io
from datetime import datetime, timedelta

from ..database import get_session
from ..models import Deal, User, PostSaleStep, Notification
from ..auth import get_current_user

router = APIRouter(prefix="/deals", tags=["deals"])

# ── helpers ──────────────────────────────────────────────────────────────────

POST_SALE_TEMPLATE = [
    (1, "Délai rétractation acheteur",    10),
    (2, "Diagnostics techniques validés", 30),
    (3, "Obtention financement acheteur", 45),
    (4, "Levée conditions suspensives",   60),
    (5, "Dépôt garantie chez notaire",    70),
    (6, "Convocation signature définitive", 75),
    (7, "Signature acte authentique",      90),
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
    """Retourne les deal_id ayant au moins une étape post-sale (non terminée)."""
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
    """Crée les 7 étapes post-sale pour un deal. Body: {compromise_date: 'YYYY-MM-DD'}"""
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
    steps_data = compute_post_sale_steps(compromise_date)
    for s in steps_data:
        step = PostSaleStep(
            deal_id=deal_id,
            step_name=s["step_name"],
            step_order=s["step_order"],
            due_date=s["due_date"],
            status=s["status"],
            created_at=now,
            updated_at=now,
        )
        session.add(step)
    session.commit()
    steps = session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id).order_by(PostSaleStep.step_order)
    ).all()
    return steps


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
    steps = session.exec(
        select(PostSaleStep).where(PostSaleStep.deal_id == deal_id).order_by(PostSaleStep.step_order)
    ).all()
    return steps


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
```

- [ ] **Step 4 : Lancer les tests — ils doivent passer maintenant**

```bash
python -m pytest backend/tests/test_post_sale.py -v
```

Expected:
```
test_compute_returns_7_steps PASSED
test_step_order_sequential PASSED
test_step_1_due_date_j10 PASSED
test_step_7_due_date_j90 PASSED
test_all_steps_have_pending_status PASSED
5 passed
```

- [ ] **Step 5 : Commit**

```bash
git add backend/api/deals.py backend/tests/test_post_sale.py
git commit -m "feat(post-sale): routes API + tests unitaires calcul dates"
```

---

## Task 3 — Scheduler : job alertes post-sale

**Files:**
- Modify: `backend/scheduler.py`

- [ ] **Step 1 : Ajouter l'import PostSaleStep en haut de scheduler.py**

Ligne 16 (import models) — remplacer :
```python
from .models import Deal, Lead, Notification, Agency, Mandate, User
```
par :
```python
from .models import Deal, Lead, Notification, Agency, Mandate, User, PostSaleStep
```

- [ ] **Step 2 : Ajouter la fonction `post_sale_alerts_job` après `rental_reminder_job`**

Ajouter avant la fonction `run_all_scrapers` (dernière fonction du fichier) :

```python
def post_sale_alerts_job():
    """Quotidien 08h00 : notifications J-7/J-3/J-1 + marque overdue."""
    logger.info("[SCHEDULER] Vérification étapes post-sale...")
    try:
        from datetime import datetime, timedelta, date
        today = datetime.utcnow().date()
        with Session(engine) as session:
            steps = session.exec(
                select(PostSaleStep).where(PostSaleStep.status == "pending")
            ).all()
            overdue_count = 0
            notif_count = 0
            for step in steps:
                due = step.due_date.date()
                delta = (due - today).days
                if delta < 0:
                    step.status = "overdue"
                    step.updated_at = datetime.utcnow()
                    session.add(step)
                    overdue_count += 1
                elif delta in (7, 3, 1):
                    deal = session.get(Deal, step.deal_id)
                    if not deal:
                        continue
                    users = session.exec(
                        select(User).where(User.agency_id == deal.agency_id)
                    ).all()
                    for u in users:
                        existing = session.exec(
                            select(Notification).where(
                                Notification.user_id == u.id,
                                Notification.deal_id == step.deal_id,
                                Notification.message.contains(f"J-{delta}"),
                                Notification.message.contains(step.step_name),
                            )
                        ).first()
                        if not existing:
                            notif = Notification(
                                user_id=u.id,
                                deal_id=step.deal_id,
                                message=(
                                    f"Post-compromis J-{delta} : \"{step.step_name}\" "
                                    f"— échéance le {step.due_date.strftime('%d/%m/%Y')}."
                                ),
                            )
                            session.add(notif)
                            notif_count += 1
            session.commit()
            logger.info(f"[SCHEDULER] Post-sale : {overdue_count} overdue, {notif_count} notifications créées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur post_sale_alerts_job : {e}")
```

- [ ] **Step 3 : Enregistrer le job dans `start_scheduler()`**

Dans la fonction `start_scheduler()`, avant `scheduler.start()`, ajouter :

```python
        # Post-sale alerts — quotidien 08h00 UTC
        scheduler.add_job(
            post_sale_alerts_job,
            trigger=CronTrigger(hour=8, minute=0),
            id="post_sale_alerts_job",
            replace_existing=True,
        )
```

- [ ] **Step 4 : Mettre à jour le message de log dans `start_scheduler()`**

Remplacer :
```python
        logger.info(
            "[SCHEDULER] Démarré — PAP(6h), Leboncoin(6h+30min), alertes(15min), "
            "relances leads(24h), baisse prix(24h), DPE(24h), heartbeat(5min), "
            "rental_payments(1er mois), rental_reminders(5/10/15)"
        )
```
par :
```python
        logger.info(
            "[SCHEDULER] Démarré — PAP(6h), Leboncoin(6h+30min), alertes(15min), "
            "relances leads(24h), baisse prix(24h), DPE(24h), heartbeat(5min), "
            "rental_payments(1er mois), rental_reminders(5/10/15), post_sale_alerts(08h)"
        )
```

- [ ] **Step 5 : Commit**

```bash
git add backend/scheduler.py
git commit -m "feat(post-sale): scheduler job alertes J-7/J-3/J-1 + overdue"
```

---

## Task 4 — Page `src/pages/Rentals.jsx`

**Files:**
- Create: `src/pages/Rentals.jsx`

- [ ] **Step 1 : Créer le fichier complet**

```jsx
// src/pages/Rentals.jsx
import React, { useState, useEffect } from 'react';
import { Home, Plus, X, CheckCircle, AlertTriangle, FileText, Upload, ChevronDown } from 'lucide-react';
import api from '../services/api';

const STATUS_CFG = {
    active:     { label: 'Actif',    color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' },
    terminated: { label: 'Terminé',  color: 'bg-gray-400/10 text-gray-400 border-gray-400/30' },
};

const PAYMENT_STATUS_CFG = {
    pending: { label: 'À venir',  color: 'text-accent-steel' },
    paid:    { label: 'Payé',     color: 'text-emerald-400' },
    late:    { label: 'Impayé',   color: 'text-rose-400' },
    partial: { label: 'Partiel',  color: 'text-amber-400' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const monthLabel = (d) => new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

const EMPTY_FORM = {
    deal_id: '',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    monthly_rent: '',
    charges: 0,
    deposit: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notice_period_days: 90,
    property_address: '',
};

// ── Modal création ─────────────────────────────────────────────────────────────
const RentalModal = ({ onClose, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deals, setDeals] = useState([]);

    useEffect(() => {
        api.get('/api/deals/').then(r => setDeals(r.data)).catch(() => setDeals([]));
    }, []);

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const handleDealSelect = (e) => {
        const id = e.target.value;
        set('deal_id', id);
        if (id) {
            const d = deals.find(x => String(x.id) === id);
            if (d) set('property_address', [d.street_number, d.street, d.postal_code, d.city].filter(Boolean).join(' ') || d.map_query || '');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                deal_id: form.deal_id ? parseInt(form.deal_id) : null,
                monthly_rent: parseFloat(form.monthly_rent),
                charges: parseFloat(form.charges) || 0,
                deposit: parseFloat(form.deposit) || 0,
                notice_period_days: parseInt(form.notice_period_days),
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
                    <button onClick={onClose} className="text-accent-steel hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 overscroll-contain px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Associer à un bien (optionnel)</label>
                            <select value={form.deal_id} onChange={handleDealSelect}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                                <option value="" className="bg-gray-900">— Sélectionner un deal —</option>
                                {deals.map(d => (
                                    <option key={d.id} value={d.id} className="bg-gray-900">
                                        #{d.id} — {d.city} {d.surface ? `${d.surface}m²` : ''} {d.price ? fmt(d.price) : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Adresse du bien *</label>
                            <input required value={form.property_address} onChange={e => set('property_address', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                placeholder="12 rue de la Paix, 75001 Paris" />
                        </div>
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
                        <div className="grid grid-cols-3 gap-4">
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
                                {saving ? 'Création...' : 'Créer la location'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ── Drawer détail ──────────────────────────────────────────────────────────────
const RentalDrawer = ({ rental, onClose, onRefresh }) => {
    const [tab, setTab] = useState('infos');
    const [payments, setPayments] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    useEffect(() => {
        if (tab === 'paiements') fetchPayments();
        if (tab === 'documents') fetchDocuments();
    }, [tab]);

    const fetchPayments = async () => {
        setLoadingPayments(true);
        try { const r = await api.get(`/api/rentals/${rental.id}/payments`); setPayments(r.data); }
        catch { setPayments([]); }
        setLoadingPayments(false);
    };

    const fetchDocuments = async () => {
        try { const r = await api.get(`/api/rentals/${rental.id}/documents`); setDocuments(r.data); }
        catch { setDocuments([]); }
    };

    const handleMarkPaid = async (paymentId) => {
        try {
            await api.post(`/api/rentals/${rental.id}/payments/${paymentId}/mark-paid`);
            fetchPayments();
        } catch { alert('Erreur lors du marquage'); }
    };

    const handleGenerateReceipt = (month) => {
        const m = new Date(month).toISOString().split('T')[0].slice(0, 7);
        window.open(`/api/rentals/${rental.id}/generate-receipt/${m}`, '_blank');
    };

    const handleRemind = async (paymentId) => {
        try {
            await api.post(`/api/rentals/${rental.id}/send-reminder/${paymentId}`);
            alert('Relance envoyée');
        } catch { alert('Erreur envoi relance'); }
    };

    const handleTerminate = async () => {
        if (!window.confirm('Terminer ce bail ?')) return;
        try { await api.delete(`/api/rentals/${rental.id}`); onRefresh(); onClose(); }
        catch { alert('Erreur'); }
    };

    const handleOwnerReport = () => {
        const now = new Date();
        window.open(`/api/rentals/${rental.id}/report/${now.getFullYear()}/${now.getMonth() + 1}`, '_blank');
    };

    const tabs = ['infos', 'paiements', 'documents', 'rapport'];
    const tabLabels = { infos: 'Infos', paiements: 'Paiements', documents: 'Documents', rapport: 'Rapport' };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-[480px]">
                    <div className="h-full flex flex-col bg-gray-900 shadow-2xl border-l border-white/10">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">{rental.tenant_name}</h3>
                                <p className="text-xs text-accent-steel">{rental.property_address || `Deal #${rental.deal_id}` || 'Bien externe'}</p>
                            </div>
                            <button onClick={onClose} className="p-1.5 text-accent-steel hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 px-4 flex-shrink-0">
                            {tabs.map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === t ? 'text-accent border-b-2 border-accent' : 'text-accent-steel hover:text-white'}`}>
                                    {tabLabels[t]}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">

                            {tab === 'infos' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Loyer + charges</p>
                                            <p className="text-base font-bold text-white">{fmt(rental.monthly_rent + rental.charges)}/mois</p>
                                            <p className="text-xs text-accent-steel">{fmt(rental.monthly_rent)} + {fmt(rental.charges)} charges</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Dépôt de garantie</p>
                                            <p className="text-base font-bold text-white">{fmt(rental.deposit)}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold">Locataire</p>
                                        <p className="text-sm text-white font-medium">{rental.tenant_name}</p>
                                        <p className="text-xs text-accent-steel">{rental.tenant_email}</p>
                                        {rental.tenant_phone && <p className="text-xs text-accent-steel">{rental.tenant_phone}</p>}
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold">Durée du bail</p>
                                        <p className="text-sm text-white">Du {fmtDate(rental.start_date)} {rental.end_date ? `au ${fmtDate(rental.end_date)}` : '(bail indéterminé)'}</p>
                                        <p className="text-xs text-accent-steel">Préavis : {rental.notice_period_days} jours</p>
                                    </div>
                                    {rental.status === 'active' && (
                                        <button onClick={handleTerminate}
                                            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-sm font-medium transition-colors">
                                            Terminer ce bail
                                        </button>
                                    )}
                                </div>
                            )}

                            {tab === 'paiements' && (
                                <div className="space-y-3">
                                    {loadingPayments ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : payments.length === 0 ? (
                                        <p className="text-center text-accent-steel text-sm py-8">Aucun paiement enregistré</p>
                                    ) : payments.map(p => {
                                        const cfg = PAYMENT_STATUS_CFG[p.status] || PAYMENT_STATUS_CFG.pending;
                                        const isLate = p.status === 'late' || p.status === 'partial';
                                        return (
                                            <div key={p.id} className={`p-4 rounded-xl border ${isLate ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/5 border-white/10'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-white">{monthLabel(p.month)}</span>
                                                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-accent-steel">{fmt(p.amount)}</span>
                                                    {p.paid_date && <span className="text-xs text-accent-steel">Payé le {fmtDate(p.paid_date)}</span>}
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {p.status !== 'paid' && (
                                                        <button onClick={() => handleMarkPaid(p.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors">
                                                            <CheckCircle className="w-3 h-3" /> Marquer payé
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleGenerateReceipt(p.month)}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-accent-steel hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors">
                                                        <FileText className="w-3 h-3" /> Quittance
                                                    </button>
                                                    {isLate && (
                                                        <button onClick={() => handleRemind(p.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors">
                                                            <AlertTriangle className="w-3 h-3" /> Relancer
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {tab === 'documents' && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold mb-2">Upload document</p>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const docType = window.prompt('Type de document :\n- inventory_in (état des lieux entrée)\n- inventory_out (état des lieux sortie)\n- receipt (quittance)', 'inventory_in');
                                                if (!docType) return;
                                                const fd = new FormData();
                                                fd.append('file', file);
                                                fd.append('doc_type', docType);
                                                try {
                                                    await api.post(`/api/rentals/${rental.id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                    fetchDocuments();
                                                } catch { alert('Erreur upload'); }
                                            }}
                                            className="text-xs text-accent-steel" />
                                    </div>
                                    {documents.length === 0 ? (
                                        <p className="text-center text-accent-steel text-sm py-4">Aucun document</p>
                                    ) : documents.map(d => (
                                        <div key={d.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                            <div>
                                                <p className="text-sm text-white font-medium">{d.doc_type}</p>
                                                <p className="text-xs text-accent-steel">{fmtDate(d.uploaded_at)}</p>
                                            </div>
                                            <FileText className="w-4 h-4 text-accent-steel" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === 'rapport' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold mb-2">Rapport mensuel propriétaire</p>
                                        <p className="text-xs text-accent-steel mb-4">Génère un rapport PDF du mois en cours avec récapitulatif des loyers, charges et impayés éventuels.</p>
                                        <button onClick={handleOwnerReport}
                                            className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Générer le rapport du mois
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Page principale ────────────────────────────────────────────────────────────
export const Rentals = () => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRental, setSelectedRental] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

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

    const filtered = rentals.filter(r =>
        !search ||
        r.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.tenant_email?.toLowerCase().includes(search.toLowerCase()) ||
        r.property_address?.toLowerCase().includes(search.toLowerCase())
    );

    const unpaidCount = rentals.filter(r => r.status === 'active').length;

    const getLatestPaymentStatus = (rental) => {
        return null;
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            {showModal && <RentalModal onClose={() => setShowModal(false)} onSaved={fetchRentals} />}
            {selectedRental && (
                <RentalDrawer
                    rental={selectedRental}
                    onClose={() => setSelectedRental(null)}
                    onRefresh={fetchRentals}
                />
            )}

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Home className="w-6 h-6 text-accent" />
                        Gestion locative
                        <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-bold">
                            {rentals.filter(r => r.status === 'active').length} actifs
                        </span>
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Suivi des baux, paiements et quittances</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors">
                    <Plus className="w-4 h-4" /> Nouvelle location
                </button>
            </div>

            {/* Filtres */}
            <div className="flex gap-3 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher locataire, adresse..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50 min-w-[220px]" />
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
            ) : filtered.length === 0 ? (
                <div className="glass rounded-xl border border-white/5 p-12 text-center">
                    <Home className="w-10 h-10 text-accent-steel mx-auto mb-3" />
                    <p className="text-accent-steel text-sm">Aucune location. Créez votre première fiche locative.</p>
                </div>
            ) : (
                <div className="glass overflow-hidden rounded-xl border border-white/5 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['Locataire', 'Bien', 'Loyer/mois', 'Début bail', 'Statut', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map(r => {
                                const cfg = STATUS_CFG[r.status] || STATUS_CFG.active;
                                return (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedRental(r)}>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-white">{r.tenant_name}</p>
                                            <p className="text-xs text-accent-steel">{r.tenant_email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-accent-steel max-w-[180px] truncate">
                                            {r.property_address || (r.deal_id ? `Deal #${r.deal_id}` : 'Bien externe')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-bold text-white">{fmt(r.monthly_rent + r.charges)}</p>
                                            <p className="text-xs text-accent-steel">{fmt(r.monthly_rent)} + {fmt(r.charges)} ch.</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-accent-steel">{fmtDate(r.start_date)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedRental(r); }}
                                                className="p-1.5 text-accent-steel hover:text-accent transition-colors">
                                                <ChevronDown className="w-3.5 h-3.5" />
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

- [ ] **Step 2 : Commit**

```bash
git add src/pages/Rentals.jsx
git commit -m "feat(rental): page Rentals.jsx — liste + drawer 4 onglets + modal création"
```

---

## Task 5 — Sidebar + App.jsx : route `/rentals`

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1 : Ajouter l'import `Home` dans Sidebar.jsx**

Ligne 3, remplacer :
```js
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, X } from 'lucide-react';
```
par :
```js
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, Home, X } from 'lucide-react';
```

- [ ] **Step 2 : Ajouter l'entrée Rentals dans `clientNavItems`**

Après la ligne `{ icon: FileText, label: 'Mandats', id: 'mandates', path: '/mandates' },`, ajouter :
```js
    { icon: Home, label: 'Gestion locative', id: 'rentals', path: '/rentals' },
```

- [ ] **Step 3 : Ajouter la route dans App.jsx**

Dans `src/App.jsx`, ajouter les imports de Rentals. Après la ligne :
```js
import Mandates from './pages/Mandates';
```
ajouter :
```js
import Rentals from './pages/Rentals';
```

Puis dans le JSX, après :
```jsx
          <Route path="/mandates" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Mandates />} />
          </Route>
```
ajouter :
```jsx
          <Route path="/rentals" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
            <Route index element={<Rentals />} />
          </Route>
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/Sidebar.jsx src/App.jsx
git commit -m "feat(rental): route /rentals + entrée Sidebar"
```

---

## Task 6 — Dashboard.jsx : badge "Suivi actif" + section post-sale

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1 : Ajouter les imports manquants**

Ligne 2, remplacer :
```js
import { Building2, AlertCircle, TrendingUp, ArrowUpRight, Clock, MapPin, Zap, Activity, Wifi, WifiOff, X, ExternalLink, Maximize2, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
```
par :
```js
import { Building2, AlertCircle, TrendingUp, ArrowUpRight, Clock, MapPin, Zap, Activity, Wifi, WifiOff, X, ExternalLink, Maximize2, ChevronLeft, ChevronRight, UserPlus, ClipboardList, CheckCircle, Calendar } from 'lucide-react';
```

- [ ] **Step 2 : Ajouter le state `postSaleIds` + fetch dans `Dashboard`**

Dans la fonction `Dashboard` (ligne 269), après la déclaration des états existants :
```js
    const [deals, setDeals] = useState([]);
    const [flashingDeal, setFlashingDeal] = useState(null);
    const [sortBy, setSortBy] = useState('score-desc');
    const [selectedDeal, setSelectedDeal] = useState(null);
```
ajouter :
```js
    const [postSaleIds, setPostSaleIds] = useState(new Set());
```

Et dans le `useEffect` existant, après `initialize()`, ajouter le fetch des IDs post-sale :
```js
        api.get('/api/deals/post-sale-active-ids')
            .then(r => setPostSaleIds(new Set(r.data.deal_ids)))
            .catch(() => {});
```

Note : `api` n'est pas importé dans Dashboard.jsx — l'ajouter en tête de fichier après les imports existants :
```js
import api from '../services/api';
```

- [ ] **Step 3 : Ajouter le badge "Suivi actif" sur les cartes deals**

Dans la section des badges existants (ligne ~404), après les `getValuationBadges(deal).map(...)`, ajouter le badge post-sale :

Remplacer :
```jsx
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {getValuationBadges(deal).map((badge, idx) => (
                                            <div key={idx} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                                <badge.icon className="w-3 h-3" />
                                                {badge.label}
                                            </div>
                                        ))}
                                    </div>
```
par :
```jsx
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {getValuationBadges(deal).map((badge, idx) => (
                                            <div key={idx} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                                <badge.icon className="w-3 h-3" />
                                                {badge.label}
                                            </div>
                                        ))}
                                        {postSaleIds.has(deal.id) && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                <ClipboardList className="w-3 h-3" />
                                                SUIVI ACTIF
                                            </div>
                                        )}
                                    </div>
```

- [ ] **Step 4 : Ajouter la section post-sale dans `DealDetailPanel`**

Dans `DealDetailPanel` (ligne 48), ajouter les states post-sale après `const [activePhotoIndex, ...]` :
```js
    const [postSaleSteps, setPostSaleSteps] = React.useState(null);
    const [loadingSteps, setLoadingSteps] = React.useState(false);
    const [showPostSale, setShowPostSale] = React.useState(false);
    const [startingPostSale, setStartingPostSale] = React.useState(false);
    const [compromiseDate, setCompromiseDate] = React.useState('');
```

Ajouter une fonction pour charger les étapes, après les fonctions `nextPhoto`/`prevPhoto` :
```js
    const loadPostSaleSteps = React.useCallback(async () => {
        if (!deal.id) return;
        setLoadingSteps(true);
        try {
            const r = await api.get(`/api/deals/${deal.id}/post-sale-steps`);
            setPostSaleSteps(r.data);
        } catch { setPostSaleSteps([]); }
        setLoadingSteps(false);
    }, [deal.id]);

    const handleStartPostSale = async () => {
        if (!compromiseDate) return;
        setStartingPostSale(true);
        try {
            await api.post(`/api/deals/${deal.id}/start-post-sale`, { compromise_date: compromiseDate });
            await loadPostSaleSteps();
        } catch (e) { alert('Erreur : ' + (e.response?.data?.detail || e.message)); }
        setStartingPostSale(false);
    };

    const handleCompleteStep = async (stepId) => {
        try {
            await api.put(`/api/deals/${deal.id}/post-sale-steps/${stepId}/complete`);
            await loadPostSaleSteps();
        } catch { alert('Erreur'); }
    };

    const handlePostponeStep = async (stepId, currentDueDate) => {
        const newDate = window.prompt('Nouvelle date (YYYY-MM-DD) :', currentDueDate?.split('T')[0]);
        if (!newDate) return;
        const reason = window.prompt('Raison du report (optionnel) :', '') || '';
        try {
            await api.put(`/api/deals/${deal.id}/post-sale-steps/${stepId}/postpone`, { new_due_date: newDate, reason });
            await loadPostSaleSteps();
        } catch { alert('Erreur'); }
    };
```

Ajouter un `useEffect` pour charger les étapes quand le panel s'ouvre :
```js
    React.useEffect(() => {
        if (deal.id) loadPostSaleSteps();
    }, [deal.id, loadPostSaleSteps]);
```

Ajouter la section post-sale dans le JSX du panel, avant le bouton "VOIR L'ANNONCE SOURCE" (ligne ~226). Chercher :
```jsx
                            <button
                                onClick={() => window.open(deal.url, '_blank', 'noopener,noreferrer')}
```
et ajouter juste avant :
```jsx
                            {/* Section Suivi post-compromis */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowPostSale(v => !v)}
                                    className="w-full flex items-center justify-between py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors">
                                    <span className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest">
                                        <ClipboardList className="w-4 h-4 text-accent" />
                                        Suivi post-compromis
                                    </span>
                                    <ChevronLeft className={`w-4 h-4 text-accent-steel transition-transform ${showPostSale ? '-rotate-90' : 'rotate-180'}`} />
                                </button>

                                {showPostSale && (
                                    <div className="space-y-3">
                                        {loadingSteps ? (
                                            <div className="flex justify-center py-4">
                                                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : postSaleSteps && postSaleSteps.length > 0 ? (
                                            <>
                                                {/* Barre de progression */}
                                                {(() => {
                                                    const completed = postSaleSteps.filter(s => s.status === 'completed').length;
                                                    const pct = Math.round(completed / postSaleSteps.length * 100);
                                                    return (
                                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                                            <div className="flex justify-between text-xs text-accent-steel mb-2">
                                                                <span>{completed}/{postSaleSteps.length} étapes</span>
                                                                <span className="font-bold text-white">{pct}%</span>
                                                            </div>
                                                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                                                <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                {/* Étapes */}
                                                {postSaleSteps.map(s => {
                                                    const dueDate = new Date(s.due_date);
                                                    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 3600 * 24));
                                                    const statusColor = s.status === 'completed' ? 'text-emerald-400' : s.status === 'overdue' ? 'text-rose-400' : 'text-accent-steel';
                                                    const bgColor = s.status === 'overdue' ? 'bg-rose-500/5 border-rose-500/20' : s.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10';
                                                    return (
                                                        <div key={s.id} className={`p-3 rounded-xl border ${bgColor}`}>
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <span className="text-xs font-medium text-white leading-tight">{s.step_name}</span>
                                                                <span className={`text-[10px] font-bold shrink-0 ${statusColor}`}>
                                                                    {s.status === 'completed' ? '✓ Fait' : s.status === 'overdue' ? 'Dépassé' : daysLeft > 0 ? `J-${daysLeft}` : 'Aujourd\'hui'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-accent-steel mb-2">
                                                                Échéance : {dueDate.toLocaleDateString('fr-FR')}
                                                            </p>
                                                            {s.status !== 'completed' && (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleCompleteStep(s.id)}
                                                                        className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-medium transition-colors">
                                                                        <CheckCircle className="w-3 h-3" /> Compléter
                                                                    </button>
                                                                    <button onClick={() => handlePostponeStep(s.id, s.due_date)}
                                                                        className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-accent-steel hover:text-white border border-white/10 rounded text-[10px] font-medium transition-colors">
                                                                        <Calendar className="w-3 h-3" /> Reporter
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                                <p className="text-xs text-accent-steel">Compromis signé ? Démarrez le suivi pour générer les 7 étapes légales automatiquement.</p>
                                                <input
                                                    type="date"
                                                    value={compromiseDate}
                                                    onChange={e => setCompromiseDate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                                    placeholder="Date de signature du compromis"
                                                />
                                                <button
                                                    onClick={handleStartPostSale}
                                                    disabled={!compromiseDate || startingPostSale}
                                                    className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                                                    {startingPostSale ? 'Démarrage...' : 'Démarrer le suivi'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

```

- [ ] **Step 5 : Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(post-sale): badge suivi actif + section post-compromis dans DealDetailPanel"
```

---

## Task 7 — Vérification build + tests

**Files:** aucun

- [ ] **Step 1 : Lancer les tests unitaires existants**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
python -m pytest backend/tests/test_post_sale.py backend/tests/test_rental_service.py -v
```

Expected:
```
backend/tests/test_post_sale.py::test_compute_returns_7_steps PASSED
backend/tests/test_post_sale.py::test_step_order_sequential PASSED
backend/tests/test_post_sale.py::test_step_1_due_date_j10 PASSED
backend/tests/test_post_sale.py::test_step_7_due_date_j90 PASSED
backend/tests/test_post_sale.py::test_all_steps_have_pending_status PASSED
backend/tests/test_rental_service.py::test_generate_receipt_pdf_returns_bytes PASSED
backend/tests/test_rental_service.py::test_generate_receipt_pdf_contains_tenant_name PASSED
backend/tests/test_rental_service.py::test_generate_owner_report_returns_bytes PASSED
backend/tests/test_rental_service.py::test_send_payment_reminder_valid_type PASSED
backend/tests/test_rental_service.py::test_send_payment_reminder_invalid_type PASSED
backend/tests/test_rental_service.py::test_send_payment_reminder_all_types PASSED
11 passed
```

- [ ] **Step 2 : Lancer le build frontend**

```bash
cd C:/Users/noapa/Documents/NOA_S_I_M/antigravity-proto
npm run build
```

Expected: `✓ built in X.XXs` avec 0 erreur (warnings acceptables).

- [ ] **Step 3 : Commit final si tout passe**

```bash
git add -A
git commit -m "feat: gestion locative + suivi post-compromis — build OK, tests OK"
```

---

## Self-Review

**Spec coverage :**
- ✅ Migration PostSaleStep (Task 1)
- ✅ Routes post-sale `/api/deals/{id}/...` × 5 (Task 2)
- ✅ Route `/api/deals/post-sale-active-ids` pour badges (Task 2)
- ✅ Job scheduler post-sale J-7/J-3/J-1 + overdue (Task 3)
- ✅ Page Rentals.jsx avec liste, drawer 4 onglets, modal création (Task 4)
- ✅ Sidebar entry `/rentals` (Task 5)
- ✅ App.jsx route `/rentals` (Task 5)
- ✅ Badge "Suivi actif" sur cartes deals Dashboard (Task 6)
- ✅ Section post-sale dans DealDetailPanel (Task 6)
- ❌ Badge impayés dans Sidebar (compteur loyers `late`/`partial`) — à ajouter en bonus si le temps le permet ; non bloquant pour la feature

**Placeholders :** aucun — tout le code est complet.

**Cohérence types :** `PostSaleStep`, `Rental`, `RentalPayment` — noms de modèles cohérents entre migration, routes, scheduler et frontend. `compute_post_sale_steps` définie en Task 2 utilisée dans les tests de Task 2.
