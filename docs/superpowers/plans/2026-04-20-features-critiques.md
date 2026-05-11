# AEVUM — 3 Features Critiques Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter signature électronique Yousign, registre légal des mandats (Loi Hoguet), et PWA mobile pour rendre AEVUM vendable à 449€/mois.

**Architecture:** Backend FastAPI étendu (nouveaux routers + services), modèles SQLModel ajoutés avec migrations Alembic, frontend React avec nouvelles pages et composants PWA. Branche `claude` uniquement — jamais `main`.

**Tech Stack:** FastAPI · SQLModel · Alembic · python-docx · requests · vite-plugin-pwa · workbox · React · Tailwind · lucide-react

**Contraintes:**
- Latest Alembic revision: `6440dba64c97`
- Toujours mode simulation si clé absente (pas de crash)
- Ne pas modifier models.py sans migration correspondante
- `npm run build` doit passer à 0 erreur après chaque phase

---

## FICHIERS TOUCHÉS PAR PHASE

### Phase 1 — Yousign
| Action | Fichier |
|--------|---------|
| CREATE | `backend/services/yousign_service.py` |
| MODIFY | `backend/api/documents.py` |
| MODIFY | `backend/models.py` (+SignatureRequest) |
| CREATE | `alembic/versions/f1a2b3c4d5e6_add_signature_request.py` |
| MODIFY | `backend/main.py` |
| MODIFY | `.env` |
| CREATE | `src/pages/Signatures.jsx` |
| MODIFY | `src/pages/Leads.jsx` |
| MODIFY | `src/components/Sidebar.jsx` |
| MODIFY | `src/App.jsx` |

### Phase 2 — Mandats
| Action | Fichier |
|--------|---------|
| MODIFY | `backend/models.py` (+Mandate) |
| CREATE | `alembic/versions/a9b8c7d6e5f4_add_mandate.py` |
| CREATE | `backend/services/mandate_service.py` |
| CREATE | `backend/api/mandates.py` |
| MODIFY | `backend/main.py` |
| MODIFY | `backend/scheduler.py` |
| CREATE | `src/pages/Mandates.jsx` |
| MODIFY | `src/components/Sidebar.jsx` |
| MODIFY | `src/App.jsx` |

### Phase 3 — PWA
| Action | Fichier |
|--------|---------|
| MODIFY | `package.json` (dep vite-plugin-pwa) |
| MODIFY | `vite.config.js` |
| CREATE | `public/icons/icon-192.svg` |
| CREATE | `public/icons/icon-512.svg` |
| MODIFY | `index.html` |
| CREATE | `src/components/InstallPWA.jsx` |
| MODIFY | `src/components/Sidebar.jsx` (mobile drawer) |
| MODIFY | `src/components/Header.jsx` (hamburger) |
| MODIFY | `src/App.jsx` |

---

## ══════════════════════════════════════
## PHASE 1 — SIGNATURE ÉLECTRONIQUE YOUSIGN
## ══════════════════════════════════════

---

### Task 1.1 — Modèle SignatureRequest + migration Alembic

**Files:**
- Modify: `backend/models.py` (append after Campaign model)
- Create: `alembic/versions/f1a2b3c4d5e6_add_signature_request.py`

- [ ] **Step 1: Ajouter le modèle SignatureRequest dans models.py**

Ouvrir `backend/models.py`, ajouter APRÈS la classe `Campaign` (ligne 153) :

```python
class SignatureRequest(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    yousign_id: str = Field(index=True)
    document_type: str                             # "compromis" | "mandat"
    deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    lead_id: Optional[int] = Field(default=None, foreign_key="lead.id")
    signer_name: str
    signer_email: str
    signing_url: Optional[str] = None
    status: str = Field(default="pending")         # pending|signed|refused|expired
    is_simulation: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    signed_at: Optional[datetime] = None
    user_id: int = Field(foreign_key="user.id")
```

- [ ] **Step 2: Créer la migration Alembic**

Créer `alembic/versions/f1a2b3c4d5e6_add_signature_request.py` :

```python
"""add_signature_request

Revision ID: f1a2b3c4d5e6
Revises: 6440dba64c97
Create Date: 2026-04-20 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '6440dba64c97'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'signaturerequest',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('yousign_id', sa.String(), nullable=False),
        sa.Column('document_type', sa.String(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=True),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('signer_name', sa.String(), nullable=False),
        sa.Column('signer_email', sa.String(), nullable=False),
        sa.Column('signing_url', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('is_simulation', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('signed_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id']),
        sa.ForeignKeyConstraint(['lead_id'], ['lead.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_signaturerequest_yousign_id', 'signaturerequest', ['yousign_id'])


def downgrade() -> None:
    op.drop_index('ix_signaturerequest_yousign_id', table_name='signaturerequest')
    op.drop_table('signaturerequest')
```

- [ ] **Step 3: Appliquer la migration**

```bash
cd C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto
.venv\Scripts\python -m alembic upgrade head
```

Expected: `Running upgrade 6440dba64c97 -> f1a2b3c4d5e6, add_signature_request`

---

### Task 1.2 — Service Yousign (backend/services/yousign_service.py)

**Files:**
- Create: `backend/services/yousign_service.py`

- [ ] **Step 1: Créer le service**

Créer `backend/services/yousign_service.py` :

```python
import os
import time
import logging
import requests

logger = logging.getLogger(__name__)

YOUSIGN_API_KEY = os.getenv("YOUSIGN_API_KEY", "")
YOUSIGN_BASE_URL = "https://api-sandbox.yousign.app/v3"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {YOUSIGN_API_KEY}",
        "Content-Type": "application/json",
    }


def send_for_signature(
    pdf_bytes: bytes,
    filename: str,
    signers: list[dict],   # [{name, email}]
) -> dict:
    """
    Envoie un document PDF à Yousign pour signature électronique.
    Si YOUSIGN_API_KEY est absent, retourne un résultat simulé.
    Retourne {yousign_id, signing_url, status, is_simulation}.
    """
    if not YOUSIGN_API_KEY:
        return _simulate(signers)

    try:
        # 1. Créer la demande
        resp = requests.post(
            f"{YOUSIGN_BASE_URL}/signature_requests",
            headers=_headers(),
            json={"name": filename, "delivery_mode": "email"},
            timeout=10,
        )
        resp.raise_for_status()
        sr_id = resp.json()["id"]

        # 2. Uploader le document
        doc_resp = requests.post(
            f"{YOUSIGN_BASE_URL}/signature_requests/{sr_id}/documents",
            headers={"Authorization": f"Bearer {YOUSIGN_API_KEY}"},
            files={"file": (filename, pdf_bytes, "application/pdf")},
            data={"nature": "signable_document"},
            timeout=15,
        )
        doc_resp.raise_for_status()
        doc_id = doc_resp.json()["id"]

        # 3. Ajouter signataires
        signing_url = None
        for signer in signers:
            parts = signer["name"].strip().split(" ", 1)
            first = parts[0]
            last = parts[1] if len(parts) > 1 else first
            sig_resp = requests.post(
                f"{YOUSIGN_BASE_URL}/signature_requests/{sr_id}/signers",
                headers=_headers(),
                json={
                    "info": {
                        "first_name": first,
                        "last_name": last,
                        "email": signer["email"],
                    },
                    "signature_level": "electronic_signature",
                    "fields": [
                        {
                            "document_id": doc_id,
                            "type": "signature",
                            "page": 1,
                            "x": 100,
                            "y": 600,
                            "width": 200,
                            "height": 50,
                        }
                    ],
                },
                timeout=10,
            )
            sig_resp.raise_for_status()
            if signing_url is None:
                signing_url = sig_resp.json().get("signature_link")

        # 4. Activer
        requests.post(
            f"{YOUSIGN_BASE_URL}/signature_requests/{sr_id}/activate",
            headers=_headers(),
            timeout=10,
        ).raise_for_status()

        return {
            "yousign_id": sr_id,
            "signing_url": signing_url or f"https://app.yousign.com/sign/{sr_id}",
            "status": "pending",
            "is_simulation": False,
        }

    except Exception as exc:
        logger.warning(f"[YOUSIGN] Erreur API, bascule simulation : {exc}")
        return _simulate(signers)


def get_signature_status(yousign_id: str) -> str:
    """Retourne le statut Yousign : pending|signed|refused|expired"""
    if not YOUSIGN_API_KEY or yousign_id.startswith("SIM-"):
        return "pending"
    try:
        resp = requests.get(
            f"{YOUSIGN_BASE_URL}/signature_requests/{yousign_id}",
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("status", "pending")
    except Exception as exc:
        logger.warning(f"[YOUSIGN] Erreur get_status : {exc}")
        return "unknown"


def _simulate(signers: list[dict]) -> dict:
    sim_id = f"SIM-{int(time.time())}"
    for s in signers:
        logger.info(f"[YOUSIGN SIMULATION] Document envoyé à {s['email']}")
    return {
        "yousign_id": sim_id,
        "signing_url": f"https://app.yousign.com/simulation/{sim_id}",
        "status": "pending",
        "is_simulation": True,
    }
```

---

### Task 1.3 — 3 nouvelles routes dans documents.py

**Files:**
- Modify: `backend/api/documents.py`

- [ ] **Step 1: Ajouter les imports manquants en tête du fichier**

Remplacer les imports existants (lignes 1–9) par :

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from pydantic import BaseModel
import io
import hmac
import hashlib
import os
import logging

from ..database import get_session
from ..models import Deal, Lead, User, SignatureRequest, Notification
from ..auth import get_current_user
from ..services.pdf_service import generate_compromis, generate_mandat
from ..services import yousign_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])
```

- [ ] **Step 2: Ajouter les 3 nouvelles routes à la FIN du fichier (après generate_listing)**

```python
# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SignerIn(BaseModel):
    name: str
    email: str

class SignRequestIn(BaseModel):
    signers: list[SignerIn]
    document_type: str = "compromis"   # "compromis" | "mandat"
    lead_id: int | None = None


# ── Signature routes ──────────────────────────────────────────────────────────

@router.post("/deals/{deal_id}/sign")
async def sign_deal_document(
    deal_id: int,
    body: SignRequestIn,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Génère le PDF du deal et l'envoie à Yousign pour signature."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if body.document_type == "compromis":
        if not body.lead_id:
            raise HTTPException(status_code=422, detail="lead_id requis pour un compromis")
        lead = session.get(Lead, body.lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        pdf_bytes = generate_compromis(deal, lead)
        filename = f"compromis_deal{deal_id}_lead{body.lead_id}.docx"
    else:
        agent_name = current_user.full_name or "Agent AEVUM"
        if not body.lead_id:
            raise HTTPException(status_code=422, detail="lead_id requis pour un mandat")
        lead = session.get(Lead, body.lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        pdf_bytes = generate_mandat(lead, agent_name)
        filename = f"mandat_lead{body.lead_id}.docx"

    result = yousign_service.send_for_signature(
        pdf_bytes=pdf_bytes,
        filename=filename,
        signers=[{"name": s.name, "email": s.email} for s in body.signers],
    )

    sr = SignatureRequest(
        yousign_id=result["yousign_id"],
        document_type=body.document_type,
        deal_id=deal_id,
        lead_id=body.lead_id,
        signer_name=body.signers[0].name,
        signer_email=body.signers[0].email,
        signing_url=result["signing_url"],
        status="pending",
        is_simulation=result["is_simulation"],
        user_id=current_user.id,
    )
    session.add(sr)
    session.commit()
    session.refresh(sr)

    return {
        "id": sr.id,
        "yousign_id": result["yousign_id"],
        "signing_url": result["signing_url"],
        "status": "pending",
        "is_simulation": result["is_simulation"],
    }


@router.get("/sign/{yousign_id}/status")
async def get_sign_status(
    yousign_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Consulte le statut d'une demande de signature."""
    from sqlmodel import select
    sr = session.exec(
        select(SignatureRequest).where(SignatureRequest.yousign_id == yousign_id)
    ).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Signature request not found")

    if not sr.is_simulation:
        live_status = yousign_service.get_signature_status(yousign_id)
        if live_status != sr.status:
            sr.status = live_status
            session.add(sr)
            session.commit()

    return {"yousign_id": yousign_id, "status": sr.status, "signing_url": sr.signing_url}


@router.post("/sign/webhook")
async def yousign_webhook(request: Request, session: Session = Depends(get_session)):
    """Reçoit les webhooks Yousign et met à jour le statut en DB."""
    secret = os.getenv("YOUSIGN_WEBHOOK_SECRET", "")
    body = await request.body()

    if secret:
        sig = request.headers.get("X-Yousign-Signature-256", "")
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(f"sha256={expected}", sig):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    event_name = payload.get("event_name", "")
    sr_id = payload.get("data", {}).get("signature_request", {}).get("id", "")

    status_map = {
        "signature_request.done": "signed",
        "signer.declined": "refused",
        "signature_request.expired": "expired",
    }
    new_status = status_map.get(event_name)
    if not new_status or not sr_id:
        return {"ok": True}

    from sqlmodel import select
    from datetime import datetime
    sr = session.exec(
        select(SignatureRequest).where(SignatureRequest.yousign_id == sr_id)
    ).first()
    if sr:
        sr.status = new_status
        if new_status == "signed":
            sr.signed_at = datetime.utcnow()
        session.add(sr)

        notif = Notification(
            user_id=sr.user_id,
            message=f"Document {sr.document_type} — {new_status} par {sr.signer_email}",
        )
        session.add(notif)
        session.commit()

    return {"ok": True}


@router.get("/signatures")
async def list_signatures(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Liste toutes les demandes de signature de l'agent connecté."""
    from sqlmodel import select
    srs = session.exec(
        select(SignatureRequest)
        .where(SignatureRequest.user_id == current_user.id)
        .order_by(SignatureRequest.created_at.desc())
    ).all()
    return srs
```

---

### Task 1.4 — Variables d'environnement

**Files:**
- Modify: `.env`

- [ ] **Step 1: Ajouter les variables Yousign dans .env**

Ajouter à la fin de `.env` :

```
YOUSIGN_API_KEY=
YOUSIGN_WEBHOOK_SECRET=
```

(Laisser vide = mode simulation automatique)

---

### Task 1.5 — Page Signatures.jsx

**Files:**
- Create: `src/pages/Signatures.jsx`

- [ ] **Step 1: Créer la page**

```jsx
import React, { useState, useEffect } from 'react';
import { FileSignature, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

const STATUS_CFG = {
    pending:  { label: 'En attente', color: 'bg-amber-400/10 text-amber-400',   Icon: Clock },
    signed:   { label: 'Signé',      color: 'bg-emerald-400/10 text-emerald-400', Icon: CheckCircle },
    refused:  { label: 'Refusé',     color: 'bg-rose-400/10 text-rose-400',     Icon: XCircle },
    expired:  { label: 'Expiré',     color: 'bg-gray-400/10 text-gray-400',     Icon: AlertCircle },
};

const Badge = ({ status }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
            <cfg.Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
};

const isOverdue = (createdAt) => {
    const diff = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    return diff > 48;
};

export default function Signatures() {
    const [sigs, setSigs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSigs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/documents/signatures');
            setSigs(data);
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { fetchSigs(); }, []);

    const handleCancel = async (sig) => {
        if (!window.confirm(`Annuler la demande pour ${sig.signer_email} ?`)) return;
        await api.delete(`/api/documents/sign/${sig.yousign_id}`).catch(() => {});
        setSigs(prev => prev.map(s => s.id === sig.id ? { ...s, status: 'expired' } : s));
    };

    const handleResend = async (sig) => {
        await api.post(`/api/documents/sign/${sig.yousign_id}/resend`).catch(() => {});
        alert('Relance envoyée');
    };

    const pending = sigs.filter(s => s.status === 'pending');
    const done = sigs.filter(s => s.status !== 'pending');

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileSignature className="w-6 h-6 text-accent" />
                        Signatures Électroniques
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Suivi des demandes de signature via Yousign</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-accent-steel">{pending.length} en attente</span>
                    <button onClick={fetchSigs} className="p-2 text-accent-steel hover:text-white transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="glass rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['Document', 'Destinataire', 'Statut', 'Envoyé le', 'Signé le', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sigs.length === 0 && (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-accent-steel text-sm">Aucune demande de signature.</td></tr>
                            )}
                            {sigs.map(sig => (
                                <tr key={sig.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-white capitalize">{sig.document_type}</span>
                                            {sig.is_simulation && (
                                                <span className="text-[10px] text-amber-400">● Simulation</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white">{sig.signer_name}</span>
                                            <span className="text-[10px] text-accent-steel">{sig.signer_email}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            <Badge status={sig.status} />
                                            {sig.status === 'pending' && isOverdue(sig.created_at) && (
                                                <span className="text-[10px] text-rose-400">En retard (+48h)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-accent-steel">
                                        {new Date(sig.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-5 py-4 text-xs text-accent-steel">
                                        {sig.signed_at ? new Date(sig.signed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {sig.status === 'pending' && sig.signing_url && (
                                                <a
                                                    href={sig.signing_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                                                >
                                                    Voir lien
                                                </a>
                                            )}
                                            {sig.status === 'pending' && isOverdue(sig.created_at) && (
                                                <button
                                                    onClick={() => handleResend(sig)}
                                                    className="text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                                >
                                                    Relancer
                                                </button>
                                            )}
                                            {sig.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancel(sig)}
                                                    className="text-[10px] px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
```

---

### Task 1.6 — Bouton signature sur Leads.jsx

**Files:**
- Modify: `src/pages/Leads.jsx`

- [ ] **Step 1: Ajouter les imports manquants en tête de Leads.jsx**

La ligne 3 actuelle est :
```js
import { Search, Mail, Phone, Trash2, LayoutList, Columns } from 'lucide-react';
```
Remplacer par :
```js
import { Search, Mail, Phone, Trash2, LayoutList, Columns, FileSignature, X } from 'lucide-react';
import api from '../services/api';
```

- [ ] **Step 2: Ajouter le composant modal SignModal avant KanbanCard**

Insérer AVANT la ligne `const KanbanCard = ...` (ligne 16) :

```jsx
const SignModal = ({ lead, onClose }) => {
    const [signerName, setSignerName] = React.useState(lead.full_name);
    const [signerEmail, setSignerEmail] = React.useState(lead.email);
    const [docType, setDocType] = React.useState('mandat');
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState(null);

    const handleSend = async () => {
        setLoading(true);
        try {
            const { data } = await api.post(`/api/documents/deals/${lead.deal_id}/sign`, {
                signers: [{ name: signerName, email: signerEmail }],
                document_type: docType,
                lead_id: lead.id,
            });
            setResult(data);
        } catch (e) {
            alert('Erreur envoi signature : ' + (e.response?.data?.detail || e.message));
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <FileSignature className="w-4 h-4 text-accent" /> Envoyer pour signature
                    </h3>
                    <button onClick={onClose} className="text-accent-steel hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                {!result ? (
                    <>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] text-accent-steel uppercase tracking-wider">Type de document</label>
                                <select
                                    value={docType}
                                    onChange={e => setDocType(e.target.value)}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                >
                                    <option value="mandat" className="bg-gray-900">Mandat de recherche</option>
                                    <option value="compromis" className="bg-gray-900">Compromis de vente</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] text-accent-steel uppercase tracking-wider">Nom du signataire</label>
                                <input
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-accent-steel uppercase tracking-wider">Email du signataire</label>
                                <input
                                    type="email"
                                    value={signerEmail}
                                    onChange={e => setSignerEmail(e.target.value)}
                                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={loading || !signerName || !signerEmail}
                            className="w-full py-2.5 bg-accent hover:bg-accent/80 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                            {loading ? 'Envoi…' : 'Envoyer pour signature'}
                        </button>
                    </>
                ) : (
                    <div className="space-y-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto">
                            <FileSignature className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-white font-medium">Demande envoyée !</p>
                        {result.is_simulation && <p className="text-xs text-amber-400">Mode simulation — aucune clé Yousign configurée</p>}
                        {result.signing_url && (
                            <a href={result.signing_url} target="_blank" rel="noopener noreferrer"
                                className="block text-xs text-accent hover:underline truncate">{result.signing_url}</a>
                        )}
                        <button onClick={onClose} className="w-full py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors">Fermer</button>
                    </div>
                )}
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Ajouter l'état signModal dans le composant Leads et le bouton**

Dans le composant `Leads` (après `const dragLead = useRef(null);` ligne ~130), ajouter :
```jsx
const [signModal, setSignModal] = React.useState(null); // lead | null
```

- [ ] **Step 4: Modifier KanbanCard pour ajouter badge + bouton signature**

Remplacer tout le composant `KanbanCard` (lignes 16–51) par :

```jsx
const KanbanCard = ({ lead, onDragStart, onDelete, onSign }) => {
    const hasPendingSig = lead.has_pending_signature;
    return (
        <div
            draggable
            onDragStart={() => onDragStart(lead)}
            className="glass rounded-lg border border-white/10 p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors select-none"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] flex-shrink-0">
                        {lead.full_name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-white truncate">{lead.full_name}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {hasPendingSig && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-bold">✍ En attente</span>
                    )}
                    <button onClick={() => onSign(lead)} className="text-accent-steel hover:text-accent transition-colors" title="Envoyer pour signature">
                        <FileSignature className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(lead.id)} className="text-accent-steel hover:text-rose-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-accent-steel">
                    <Mail className="w-3 h-3" /><span className="truncate">{lead.email}</span>
                </div>
                {lead.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-accent-steel">
                        <Phone className="w-3 h-3" /><span>{lead.phone}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white">{(lead.budget || 0).toLocaleString()} €</span>
                <span className="text-accent-steel">apport {(lead.apport || 0).toLocaleString()} €</span>
            </div>
        </div>
    );
};
```

- [ ] **Step 5: Passer onSign aux KanbanCol → KanbanCard, et afficher le modal**

Dans `KanbanCol`, ajouter `onSign` en prop et le passer à KanbanCard :
```jsx
const KanbanCol = ({ col, leads, onDragStart, onDrop, onDragOver, onDelete, onSign }) => (
    // ... même code ...
    <KanbanCard key={l.id} lead={l} onDragStart={onDragStart} onDelete={onDelete} onSign={onSign} />
```

Dans le rendu Kanban (autour de la ligne 248), passer `onSign` :
```jsx
<KanbanCol
    key={col.key}
    col={col}
    leads={filtered.filter(l => l.status === col.key)}
    onDragStart={onDragStart}
    onDrop={onDrop}
    onDragOver={setOverCol}
    onDelete={handleDelete}
    onSign={setSignModal}
/>
```

Ajouter juste avant le `return` final du composant `Leads` :
```jsx
{signModal && <SignModal lead={signModal} onClose={() => setSignModal(null)} />}
```

---

### Task 1.7 — Sidebar + App.jsx pour /signatures

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Ajouter import FileSignature dans Sidebar.jsx**

Ligne 3 de Sidebar.jsx :
```js
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, FileSignature } from 'lucide-react';
```

- [ ] **Step 2: Ajouter /signatures dans clientNavItems dans Sidebar.jsx**

Dans le tableau `clientNavItems`, ajouter après la ligne Campagnes :
```js
{ icon: FileSignature, label: 'Signatures', id: 'signatures', path: '/signatures' },
```

- [ ] **Step 3: Ajouter la route dans App.jsx**

Ajouter l'import en tête :
```js
import Signatures from './pages/Signatures';
```

Ajouter la route après `/reporting` :
```jsx
<Route path="/signatures" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
    <Route index element={<Signatures />} />
</Route>
```

- [ ] **Step 4: Vérification build**

```bash
cd C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto
npm run build
```
Expected: `✓ built in X.XXs` sans erreur TypeScript/import.

- [ ] **Step 5: Test simulation**

Avec le backend lancé (`uvicorn backend.main:app --reload`), tester :
```bash
curl -s -X POST http://localhost:8000/api/documents/deals/1/sign \
  -H "Content-Type: application/json" \
  -b "access_token=<token>" \
  -d '{"signers":[{"name":"Test User","email":"test@test.com"}],"document_type":"mandat","lead_id":1}'
```
Expected: `{"yousign_id":"SIM-...","signing_url":"https://app.yousign.com/simulation/...","status":"pending","is_simulation":true}`

- [ ] **Step 6: Git commit Phase 1**

```bash
git add backend/services/yousign_service.py \
        backend/api/documents.py \
        backend/models.py \
        alembic/versions/f1a2b3c4d5e6_add_signature_request.py \
        src/pages/Signatures.jsx \
        src/pages/Leads.jsx \
        src/components/Sidebar.jsx \
        src/App.jsx \
        .env
git commit -m "phase-1: signature electronique yousign"
```

---

## ══════════════════════════════════════
## PHASE 2 — REGISTRE DES MANDATS (LOI HOGUET)
## ══════════════════════════════════════

---

### Task 2.1 — Modèle Mandate + migration Alembic

**Files:**
- Modify: `backend/models.py`
- Create: `alembic/versions/a9b8c7d6e5f4_add_mandate.py`

- [ ] **Step 1: Ajouter le modèle Mandate dans models.py**

Ajouter APRÈS la classe `SignatureRequest` :

```python
class Mandate(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id")
    mandate_number: int                    # séquentiel par agence, géré par l'API
    mandate_type: str                      # "vente"|"recherche"|"location"|"gestion"
    property_address: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    start_date: datetime
    end_date: datetime
    exclusive: bool = Field(default=False)
    commission_rate: float = Field(default=3.0)
    status: str = Field(default="actif")   # actif|expiré|annulé|vendu
    document_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: int = Field(foreign_key="user.id")
```

- [ ] **Step 2: Créer la migration Alembic**

Créer `alembic/versions/a9b8c7d6e5f4_add_mandate.py` :

```python
"""add_mandate

Revision ID: a9b8c7d6e5f4
Revises: f1a2b3c4d5e6
Create Date: 2026-04-20 00:00:01.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a9b8c7d6e5f4'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mandate',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('mandate_number', sa.Integer(), nullable=False),
        sa.Column('mandate_type', sa.String(), nullable=False),
        sa.Column('property_address', sa.String(), nullable=False),
        sa.Column('owner_name', sa.String(), nullable=False),
        sa.Column('owner_email', sa.String(), nullable=True),
        sa.Column('owner_phone', sa.String(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('exclusive', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('commission_rate', sa.Float(), nullable=False, server_default='3.0'),
        sa.Column('status', sa.String(), nullable=False, server_default='actif'),
        sa.Column('document_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['agency_id'], ['agency.id']),
        sa.ForeignKeyConstraint(['created_by'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mandate_agency_number', 'mandate', ['agency_id', 'mandate_number'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_mandate_agency_number', table_name='mandate')
    op.drop_table('mandate')
```

- [ ] **Step 3: Appliquer la migration**

```bash
.venv\Scripts\python -m alembic upgrade head
```

Expected: `Running upgrade f1a2b3c4d5e6 -> a9b8c7d6e5f4, add_mandate`

---

### Task 2.2 — Service mandate_service.py

**Files:**
- Create: `backend/services/mandate_service.py`

- [ ] **Step 1: Créer le service**

```python
import io
from datetime import datetime
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from sqlmodel import Session, select, func

from ..models import Mandate, Notification


def next_mandate_number(session: Session, agency_id: int) -> int:
    """Retourne le prochain numéro séquentiel de mandat pour cette agence."""
    result = session.exec(
        select(func.max(Mandate.mandate_number)).where(Mandate.agency_id == agency_id)
    ).one()
    return (result or 0) + 1


def generate_mandate_pdf(mandate: Mandate) -> bytes:
    """Génère le PDF officiel du mandat en .docx."""
    doc = Document()
    section = doc.sections[0]
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("MANDAT IMMOBILIER")
    run.bold = True
    run.font.size = Pt(16)

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.add_run(f"N° {mandate.mandate_number:04d}").bold = True
    doc.add_paragraph()

    doc.add_heading("I. IDENTIFICATION DU MANDAT", level=2)
    _s(doc, "Numéro officiel", f"{mandate.mandate_number:04d}")
    _s(doc, "Type", mandate.mandate_type.capitalize())
    _s(doc, "Date de création", mandate.created_at.strftime('%d/%m/%Y'))
    _s(doc, "Mandat exclusif", "Oui" if mandate.exclusive else "Non")
    _s(doc, "Taux de commission", f"{mandate.commission_rate} %")

    doc.add_paragraph()
    doc.add_heading("II. BIEN IMMOBILIER", level=2)
    _s(doc, "Adresse", mandate.property_address)

    doc.add_paragraph()
    doc.add_heading("III. PROPRIÉTAIRE (MANDANT)", level=2)
    _s(doc, "Nom", mandate.owner_name)
    _s(doc, "Email", mandate.owner_email or "—")
    _s(doc, "Téléphone", mandate.owner_phone or "—")

    doc.add_paragraph()
    doc.add_heading("IV. DURÉE", level=2)
    _s(doc, "Début", mandate.start_date.strftime('%d/%m/%Y'))
    _s(doc, "Fin", mandate.end_date.strftime('%d/%m/%Y'))

    doc.add_paragraph()
    doc.add_paragraph(
        "Conformément à la loi Hoguet n°70-9 du 2 janvier 1970 et son décret d'application "
        "n°72-678 du 20 juillet 1972, ce mandat est enregistré dans le registre des mandats "
        "de l'agence et a force obligatoire entre les parties."
    )
    doc.add_paragraph()
    doc.add_paragraph("Signature mandant : _______________________")
    doc.add_paragraph("Signature mandataire : _____________________")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def check_expiring_mandates(session: Session) -> int:
    """Génère des notifications pour les mandats expirant dans 30 jours."""
    from datetime import timedelta
    today = datetime.utcnow()
    in_30 = today + timedelta(days=30)

    expiring = session.exec(
        select(Mandate).where(
            Mandate.status == "actif",
            Mandate.end_date <= in_30,
            Mandate.end_date >= today,
        )
    ).all()

    count = 0
    for m in expiring:
        days_left = (m.end_date - today).days
        notif = Notification(
            user_id=m.created_by,
            message=f"Mandat N°{m.mandate_number:04d} ({m.owner_name}) expire dans {days_left} jour(s).",
        )
        session.add(notif)
        count += 1

    if count:
        session.commit()
    return count


def _s(doc: Document, label: str, value: str):
    p = doc.add_paragraph()
    p.add_run(f"{label} : ").bold = True
    p.add_run(value or "—")
```

---

### Task 2.3 — Router mandates.py

**Files:**
- Create: `backend/api/mandates.py`

- [ ] **Step 1: Créer le router**

```python
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional

from ..database import get_session
from ..models import Mandate, User
from ..auth import get_current_user
from ..services.mandate_service import next_mandate_number, generate_mandate_pdf

router = APIRouter(prefix="/mandates", tags=["mandates"])


class MandateIn(BaseModel):
    mandate_type: str                 # vente|recherche|location|gestion
    property_address: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    start_date: datetime
    end_date: datetime
    exclusive: bool = False
    commission_rate: float = 3.0


class MandateUpdate(BaseModel):
    status: Optional[str] = None
    end_date: Optional[datetime] = None
    commission_rate: Optional[float] = None
    exclusive: Optional[bool] = None


def _get_agency_id(user: User) -> int:
    if not user.agency_id:
        raise HTTPException(status_code=400, detail="Utilisateur sans agence")
    return user.agency_id


@router.post("/")
def create_mandate(
    body: MandateIn,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agency_id = _get_agency_id(current_user)
    num = next_mandate_number(session, agency_id)
    m = Mandate(
        agency_id=agency_id,
        mandate_number=num,
        created_by=current_user.id,
        **body.model_dump(),
    )
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


@router.get("/")
def list_mandates(
    mandate_type: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agency_id = _get_agency_id(current_user)
    q = select(Mandate).where(Mandate.agency_id == agency_id)
    if mandate_type:
        q = q.where(Mandate.mandate_type == mandate_type)
    if status:
        q = q.where(Mandate.status == status)
    q = q.order_by(Mandate.mandate_number.desc())
    return session.exec(q).all()


@router.get("/export")
def export_mandates_csv(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agency_id = _get_agency_id(current_user)
    mandates = session.exec(
        select(Mandate).where(Mandate.agency_id == agency_id).order_by(Mandate.mandate_number)
    ).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow([
        "N° Mandat", "Type", "Adresse", "Propriétaire", "Email", "Téléphone",
        "Début", "Fin", "Exclusif", "Commission (%)", "Statut", "Créé le",
    ])
    for m in mandates:
        writer.writerow([
            f"{m.mandate_number:04d}",
            m.mandate_type,
            m.property_address,
            m.owner_name,
            m.owner_email or "",
            m.owner_phone or "",
            m.start_date.strftime('%d/%m/%Y'),
            m.end_date.strftime('%d/%m/%Y'),
            "Oui" if m.exclusive else "Non",
            m.commission_rate,
            m.status,
            m.created_at.strftime('%d/%m/%Y'),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registre_mandats.csv"},
    )


@router.get("/{mandate_id}")
def get_mandate(
    mandate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    m = session.get(Mandate, mandate_id)
    if not m or m.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")
    return m


@router.put("/{mandate_id}")
def update_mandate(
    mandate_id: int,
    body: MandateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    m = session.get(Mandate, mandate_id)
    if not m or m.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(m, field, val)
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


@router.delete("/{mandate_id}")
def cancel_mandate(
    mandate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    m = session.get(Mandate, mandate_id)
    if not m or m.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")
    m.status = "annulé"
    session.add(m)
    session.commit()
    return {"ok": True}


@router.post("/{mandate_id}/generate-pdf")
def generate_pdf(
    mandate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    m = session.get(Mandate, mandate_id)
    if not m or m.agency_id != current_user.agency_id:
        raise HTTPException(status_code=404, detail="Mandat not found")
    content = generate_mandate_pdf(m)
    filename = f"mandat_{m.mandate_number:04d}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
```

---

### Task 2.4 — Enregistrer le router dans main.py + job scheduler

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/scheduler.py`

- [ ] **Step 1: Ajouter l'import + include_router dans main.py**

Après la ligne `from .api.booking import router as booking_router` (ligne ~44), ajouter :
```python
from .api.mandates import router as mandates_router
```

Après `app.include_router(booking_router)` (ligne ~94), ajouter :
```python
app.include_router(mandates_router, prefix="/api")
```

- [ ] **Step 2: Ajouter le job dans scheduler.py**

Ajouter la fonction AVANT `start_scheduler()` :

```python
def check_mandate_expiry_job():
    """Mandats expirant dans 30j → notification en base."""
    logger.info("[SCHEDULER] Vérification mandats expirants...")
    try:
        from .services.mandate_service import check_expiring_mandates
        with Session(engine) as session:
            count = check_expiring_mandates(session)
            logger.info(f"[SCHEDULER] {count} notifications expiration mandat générées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur check mandats : {e}")
```

Dans `start_scheduler()`, avant `scheduler.start()`, ajouter :
```python
scheduler.add_job(
    check_mandate_expiry_job,
    trigger=IntervalTrigger(hours=24),
    id="mandate_expiry_job",
    replace_existing=True
)
```

---

### Task 2.5 — Page Mandates.jsx

**Files:**
- Create: `src/pages/Mandates.jsx`

- [ ] **Step 1: Créer la page**

```jsx
import React, { useState, useEffect } from 'react';
import { ScrollText, Plus, Download, X, AlertTriangle, FileText } from 'lucide-react';
import api from '../services/api';

const TYPE_OPTS = ['vente', 'recherche', 'location', 'gestion'];
const STATUS_CFG = {
    actif:   { color: 'bg-emerald-400/10 text-emerald-400' },
    expiré:  { color: 'bg-amber-400/10 text-amber-400' },
    annulé:  { color: 'bg-rose-400/10 text-rose-400' },
    vendu:   { color: 'bg-blue-400/10 text-blue-400' },
};

const daysLeft = (end) => Math.ceil((new Date(end) - Date.now()) / 86400000);

const MandateForm = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({
        mandate_type: 'vente',
        property_address: '',
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        exclusive: false,
        commission_rate: 3,
    });
    const [loading, setLoading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                start_date: new Date(form.start_date).toISOString(),
                end_date: new Date(form.end_date).toISOString(),
                commission_rate: parseFloat(form.commission_rate),
            };
            const { data } = await api.post('/api/mandates/', payload);
            onCreated(data);
            onClose();
        } catch (e) {
            alert('Erreur : ' + (e.response?.data?.detail || e.message));
        }
        setLoading(false);
    };

    const F = ({ label, children }) => (
        <div>
            <label className="text-[11px] text-accent-steel uppercase tracking-wider">{label}</label>
            <div className="mt-1">{children}</div>
        </div>
    );
    const inp = (key, type = 'text', extra = {}) => (
        <input
            type={type}
            value={form[key]}
            onChange={e => set(key, type === 'checkbox' ? e.target.checked : e.target.value)}
            {...extra}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
        />
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
            <form onSubmit={handleSubmit} className="glass border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-accent" /> Nouveau mandat
                    </h3>
                    <button type="button" onClick={onClose}><X className="w-4 h-4 text-accent-steel hover:text-white" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <F label="Type">
                        <select value={form.mandate_type} onChange={e => set('mandate_type', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                            {TYPE_OPTS.map(t => <option key={t} value={t} className="bg-gray-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                    </F>
                    <F label="Commission (%)">
                        {inp('commission_rate', 'number', { min: 0, max: 20, step: 0.1 })}
                    </F>
                </div>
                <F label="Adresse du bien">{inp('property_address')}</F>
                <F label="Nom du propriétaire">{inp('owner_name')}</F>
                <div className="grid grid-cols-2 gap-4">
                    <F label="Email propriétaire">{inp('owner_email', 'email')}</F>
                    <F label="Téléphone">{inp('owner_phone', 'tel')}</F>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <F label="Début">{inp('start_date', 'date')}</F>
                    <F label="Fin">{inp('end_date', 'date')}</F>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.exclusive} onChange={e => set('exclusive', e.target.checked)} className="accent-accent" />
                    <span className="text-sm text-white">Mandat exclusif</span>
                </label>
                <button
                    type="submit"
                    disabled={loading || !form.property_address || !form.owner_name}
                    className="w-full py-2.5 bg-accent hover:bg-accent/80 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                >
                    {loading ? 'Création…' : 'Créer le mandat'}
                </button>
            </form>
        </div>
    );
};

export default function Mandates() {
    const [mandates, setMandates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchMandates = async () => {
        setLoading(true);
        try {
            const params = {};
            if (typeFilter) params.mandate_type = typeFilter;
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/api/mandates/', { params });
            setMandates(data);
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { fetchMandates(); }, [typeFilter, statusFilter]);

    const handleExport = () => {
        window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/mandates/export`, '_blank');
    };

    const handleGeneratePDF = (id) => {
        window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/mandates/${id}/generate-pdf`, '_blank');
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Annuler ce mandat ?')) return;
        await api.delete(`/api/mandates/${id}`).catch(() => {});
        fetchMandates();
    };

    const actifs = mandates.filter(m => m.status === 'actif');

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ScrollText className="w-6 h-6 text-accent" />
                        Registre des Mandats
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Conformité Loi Hoguet — numérotation officielle</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-400">{actifs.length} mandat(s) actif(s)</span>
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm rounded-lg transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-bold rounded-lg transition-colors">
                        <Plus className="w-4 h-4" /> Nouveau mandat
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-3 flex-wrap">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="">Tous types</option>
                    {TYPE_OPTS.map(t => <option key={t} value={t} className="bg-gray-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="">Tous statuts</option>
                    {Object.keys(STATUS_CFG).map(s => <option key={s} value={s} className="bg-gray-900">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <div className="glass rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['N°', 'Type', 'Adresse', 'Propriétaire', 'Période', 'Com.', 'Statut', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {mandates.length === 0 && (
                                <tr><td colSpan={8} className="px-5 py-12 text-center text-accent-steel text-sm">Aucun mandat enregistré.</td></tr>
                            )}
                            {mandates.map(m => {
                                const days = daysLeft(m.end_date);
                                const cfg = STATUS_CFG[m.status] || STATUS_CFG.actif;
                                return (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3 text-sm font-bold text-white">{String(m.mandate_number).padStart(4, '0')}</td>
                                        <td className="px-4 py-3 text-xs text-white capitalize">{m.mandate_type}{m.exclusive && <span className="ml-1 text-[9px] text-accent border border-accent/30 px-1 rounded">EXCLU</span>}</td>
                                        <td className="px-4 py-3 text-xs text-white max-w-[160px] truncate" title={m.property_address}>{m.property_address}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-white">{m.owner_name}</span>
                                                {m.owner_email && <span className="text-[10px] text-accent-steel">{m.owner_email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-[10px] text-accent-steel">
                                                <span>{new Date(m.start_date).toLocaleDateString('fr-FR')}</span>
                                                <span>→ {new Date(m.end_date).toLocaleDateString('fr-FR')}</span>
                                                {m.status === 'actif' && days <= 30 && (
                                                    <span className={`flex items-center gap-1 ${days <= 7 ? 'text-rose-400' : 'text-amber-400'}`}>
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        {days}j restants
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-white">{m.commission_rate}%</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>{m.status}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleGeneratePDF(m.id)}
                                                    className="p-1.5 text-accent-steel hover:text-accent transition-colors" title="Générer PDF">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </button>
                                                {m.status === 'actif' && (
                                                    <button onClick={() => handleCancel(m.id)}
                                                        className="p-1.5 text-accent-steel hover:text-rose-400 transition-colors" title="Annuler">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <MandateForm
                    onClose={() => setShowForm(false)}
                    onCreated={(m) => setMandates(prev => [m, ...prev])}
                />
            )}
        </div>
    );
}
```

---

### Task 2.6 — Sidebar + App.jsx pour /mandates

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Ajouter ScrollText dans les imports Sidebar.jsx**

```js
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, FileSignature, ScrollText } from 'lucide-react';
```

- [ ] **Step 2: Ajouter /mandates dans clientNavItems**

```js
{ icon: ScrollText, label: 'Mandats', id: 'mandates', path: '/mandates' },
```

- [ ] **Step 3: Ajouter la route dans App.jsx**

```js
import Mandates from './pages/Mandates';
```

```jsx
<Route path="/mandates" element={<ProtectedRoute roles="staff"><Layout /></ProtectedRoute>}>
    <Route index element={<Mandates />} />
</Route>
```

- [ ] **Step 4: Vérification complète Phase 2**

```bash
npm run build
```
Expected: 0 erreurs.

```bash
curl -s -X POST http://localhost:8000/api/mandates/ \
  -H "Content-Type: application/json" \
  -b "access_token=<token>" \
  -d '{"mandate_type":"vente","property_address":"12 rue de la Paix, 75001 Paris","owner_name":"Jean Dupont","start_date":"2026-04-20T00:00:00","end_date":"2026-07-20T00:00:00"}'
```
Expected: `{"id":1,"mandate_number":1,...}`

Vérifier numéro auto-incrémenté : créer un 2ème mandat → `mandate_number: 2`.

- [ ] **Step 5: Git commit Phase 2**

```bash
git add backend/models.py \
        alembic/versions/a9b8c7d6e5f4_add_mandate.py \
        backend/services/mandate_service.py \
        backend/api/mandates.py \
        backend/main.py \
        backend/scheduler.py \
        src/pages/Mandates.jsx \
        src/components/Sidebar.jsx \
        src/App.jsx
git commit -m "phase-2: registre mandats loi hoguet"
```

---

## ══════════════════════════════════════
## PHASE 3 — PWA (Progressive Web App)
## ══════════════════════════════════════

---

### Task 3.1 — Installation vite-plugin-pwa

**Files:**
- Modify: `package.json` (géré par npm)

- [ ] **Step 1: Installer la dépendance**

```bash
cd C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto
npm install vite-plugin-pwa --save-dev
```

Expected: `added X packages` — vite-plugin-pwa dans `devDependencies` de package.json.

---

### Task 3.2 — Icônes SVG PWA

**Files:**
- Create: `public/icons/icon-192.svg`
- Create: `public/icons/icon-512.svg`
- Create: `public/icons/apple-touch-icon.png` (via SVG rasterization — on fournit un SVG converti)

- [ ] **Step 1: Créer public/icons/icon-192.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#0F172A"/>
  <rect width="192" height="192" rx="40" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1E293B"/>
      <stop offset="1" stop-color="#0F172A"/>
    </linearGradient>
  </defs>
  <polygon points="96,30 130,80 96,70 62,80" fill="#3B82F6" opacity="0.9"/>
  <polygon points="96,70 130,80 96,162 62,80" fill="#1D4ED8" opacity="0.8"/>
  <text x="96" y="178" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="18" font-weight="bold" letter-spacing="4">AEVUM</text>
</svg>
```

- [ ] **Step 2: Créer public/icons/icon-512.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0F172A"/>
  <rect width="512" height="512" rx="100" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1E293B"/>
      <stop offset="1" stop-color="#0F172A"/>
    </linearGradient>
  </defs>
  <polygon points="256,80 348,210 256,185 164,210" fill="#3B82F6" opacity="0.9"/>
  <polygon points="256,185 348,210 256,432 164,210" fill="#1D4ED8" opacity="0.8"/>
  <text x="256" y="478" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="48" font-weight="bold" letter-spacing="10">AEVUM</text>
</svg>
```

---

### Task 3.3 — vite.config.js avec PWA

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Remplacer vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'AEVUM — CRM Immobilier',
        short_name: 'AEVUM',
        description: 'CRM immobilier intelligent pour agences françaises',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:8000\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  envDir: '../',
  server: {
    watch: { usePolling: true },
    hmr: { port: 5173 },
  },
})
```

---

### Task 3.4 — Meta tags index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remplacer index.html**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AEVUM — CRM Immobilier</title>

    <!-- PWA / Mobile -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="AEVUM" />
    <meta name="theme-color" content="#0F172A" />
    <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### Task 3.5 — Composant InstallPWA.jsx

**Files:**
- Create: `src/components/InstallPWA.jsx`

- [ ] **Step 1: Créer le composant**

```jsx
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISSED_KEY = 'aevum_pwa_dismissed_until';

export default function InstallPWA() {
    const [prompt, setPrompt] = useState(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed && Date.now() < parseInt(dismissed)) return;

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone;
        if (isStandalone) return;

        const handler = (e) => {
            e.preventDefault();
            setPrompt(e);
            setShow(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!prompt) return;
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') setShow(false);
    };

    const handleDismiss = () => {
        localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
            <div className="glass border border-accent/30 rounded-xl p-4 shadow-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Installer AEVUM</p>
                    <p className="text-[11px] text-accent-steel">Accès rapide depuis votre écran d'accueil</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleInstall}
                        className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                        Installer
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-accent-steel hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
```

---

### Task 3.6 — Sidebar mobile (drawer)

**Files:**
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Remplacer Sidebar.jsx entier**

```jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3,
    Zap, Mail, TrendingUp, FileSignature, ScrollText, Menu, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const clientNavItems = [
    { icon: LayoutDashboard, label: 'Tableau de Bord',   id: 'dashboard',   path: '/dashboard' },
    { icon: Building2,       label: 'Le Flux',           id: 'immo',        path: '/immobilier' },
    { icon: Users,           label: 'Leads',             id: 'leads',       path: '/leads' },
    { icon: Zap,             label: 'Automatisation',    id: 'automation',  path: '/automation' },
    { icon: Map,             label: 'Analyse de Zone',   id: 'zone',        path: '/analyse' },
    { icon: FileSignature,   label: 'Signatures',        id: 'signatures',  path: '/signatures' },
    { icon: ScrollText,      label: 'Mandats',           id: 'mandates',    path: '/mandates' },
    { icon: Mail,            label: 'Campagnes',         id: 'campaigns',   path: '/campaigns' },
    { icon: TrendingUp,      label: 'Reporting',         id: 'reporting',   path: '/reporting' },
    { icon: BarChart3,       label: 'Calendrier',        id: 'calendar',    path: '/settings/calendar' },
    { icon: Settings,        label: 'Paramètres',        id: 'settings',    path: '/settings' },
];

const adminNavItems = [
    { icon: Users,    label: 'Administration', id: 'admin',    path: '/admin' },
    { icon: BarChart3, label: 'Admin KPI',     id: 'kpi',      path: '/admin/kpi' },
    { icon: Building2, label: 'Agences',       id: 'agencies', path: '/admin/agencies' },
    { icon: Settings,  label: 'Paramètres',    id: 'settings', path: '/settings' },
];

const NavContent = ({ navItems, isAdmin, user, onClose }) => (
    <>
        <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-xl text-white">AEVUM</span>
            {onClose && (
                <button onClick={onClose} className="ml-auto text-accent-steel hover:text-white lg:hidden">
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            <div className="px-3 pb-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isAdmin ? 'bg-accent/10 border border-accent/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                    {isAdmin ? <Shield className="w-4 h-4 text-accent" /> : <LayoutDashboard className="w-4 h-4 text-blue-400" />}
                    <span className={`text-xs font-medium ${isAdmin ? 'text-accent' : 'text-blue-400'}`}>
                        {isAdmin ? 'Mode Administrateur' : 'Mode Client'}
                    </span>
                </div>
            </div>

            {navItems.map((item) => (
                <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        "text-accent-steel hover:text-white hover:bg-white/5",
                        isActive && "text-white bg-white/10 border-l-2 border-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    )}
                >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                </NavLink>
            ))}
        </nav>

        <div className="p-6 border-t border-white/5">
            <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">
                    {user?.username} Connecté
                </span>
            </div>
        </div>
    </>
);

export const Sidebar = () => {
    const { isAdmin, user } = useAuth();
    const navItems = isAdmin ? adminNavItems : clientNavItems;
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Bouton hamburger — mobile uniquement */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 p-2 glass border border-white/10 rounded-lg text-accent-steel hover:text-white"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Overlay mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Drawer mobile */}
            <aside className={cn(
                "fixed top-0 left-0 h-screen w-64 glass border-r border-white/5 flex flex-col z-50 transition-transform duration-300",
                "lg:translate-x-0 lg:static lg:z-auto",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <NavContent
                    navItems={navItems}
                    isAdmin={isAdmin}
                    user={user}
                    onClose={() => setMobileOpen(false)}
                />
            </aside>
        </>
    );
};
```

---

### Task 3.7 — Header.jsx responsive (padding mobile)

**Files:**
- Modify: `src/components/Header.jsx`

- [ ] **Step 1: Ajouter padding-left sur mobile pour le hamburger**

Ligne 49 — remplacer la classe du `<header>` :
```jsx
// AVANT
<header className="h-16 glass border-b border-white/5 flex items-center px-8 sticky top-0 z-10">
// APRÈS
<header className="h-16 glass border-b border-white/5 flex items-center px-4 lg:px-8 pl-16 lg:pl-8 sticky top-0 z-10">
```

---

### Task 3.8 — App.jsx : ajouter InstallPWA

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Importer InstallPWA**

Ajouter dans les imports :
```js
import InstallPWA from './components/InstallPWA';
```

- [ ] **Step 2: Rendre InstallPWA dans l'arbre**

Dans le JSX de `App`, juste avant la fermeture `</AuthContext.Provider>` :
```jsx
    <InstallPWA />
  </AuthContext.Provider>
```

- [ ] **Step 3: Build final et vérification**

```bash
npm run build
```
Expected: `✓ built in X.XXs` — vérifier que `dist/sw.js` existe et `dist/manifest.webmanifest` existe.

```bash
ls dist/sw.js dist/manifest.webmanifest
```

- [ ] **Step 4: Vérifier le service worker sur Chrome DevTools**

Lancer `npm run preview` puis ouvrir `http://localhost:4173` dans Chrome.
Aller dans DevTools → Application → Service Workers → vérifier "Status: activated and running".
Aller dans Application → Manifest → vérifier les champs name/icons.

- [ ] **Step 5: Git commit Phase 3**

```bash
git add vite.config.js \
        index.html \
        package.json \
        package-lock.json \
        public/icons/icon-192.svg \
        public/icons/icon-512.svg \
        src/components/InstallPWA.jsx \
        src/components/Sidebar.jsx \
        src/components/Header.jsx \
        src/App.jsx
git commit -m "phase-3: pwa mobile responsive"
```

---

## FINALISATION

- [ ] **Mettre à jour graphify-out/STATUS_REPORT.md**

Ajouter dans la section "NOUVELLES PHASES" :

```markdown
### Phase 1 — Signature Électronique Yousign
**Commit :** phase-1

| Élément | État |
|---------|------|
| `POST /api/documents/deals/{id}/sign` | ✅ |
| `GET /api/documents/sign/{id}/status` | ✅ |
| `POST /api/documents/sign/webhook` | ✅ |
| Mode simulation sans clé API | ✅ |
| Page `/signatures` | ✅ |
| Bouton signature sur Kanban leads | ✅ |

### Phase 2 — Registre des Mandats (Loi Hoguet)
**Commit :** phase-2

| Élément | État |
|---------|------|
| Migration Alembic `mandate` | ✅ |
| `POST/GET/PUT/DELETE /api/mandates/` | ✅ |
| Export CSV registre | ✅ |
| Génération PDF officiel | ✅ |
| Scheduler expiration 30j | ✅ |
| Page `/mandates` | ✅ |

### Phase 3 — PWA Mobile
**Commit :** phase-3

| Élément | État |
|---------|------|
| vite-plugin-pwa + workbox | ✅ |
| Service worker (NetworkFirst API, CacheFirst assets) | ✅ |
| Manifest + icônes | ✅ |
| InstallPWA banner | ✅ |
| Sidebar drawer mobile | ✅ |
| Header responsive | ✅ |
```

- [ ] **git push origin claude**

```bash
git push origin claude
```

---

## CHECKLIST FINALE

```
[ ] pytest backend/tests/ -v         → 0 erreur
[ ] curl http://localhost:8000/health → {"status":"healthy"}
[ ] npm run build                     → 0 erreur, dist/sw.js présent
[ ] POST /api/documents/deals/1/sign → is_simulation: true sans clé
[ ] POST /api/mandates/              → mandate_number auto-incrémenté
[ ] GET  /api/mandates/export        → CSV téléchargeable
[ ] /signatures accessible avec liste
[ ] /mandates accessible avec formulaire
[ ] Sidebar hamburger visible sur mobile < 1024px
[ ] dist/manifest.webmanifest généré avec name: "AEVUM"
```
