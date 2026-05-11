# RBAC 3 Rôles + Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter seed data pour les 3 rôles (superadmin + 4 agences fictives, redistribuer leads agent/gérant), protéger les endpoints ChannelAccount par un garde gérant, et faire distinguer le sidebar frontend entre agent et gérant.

**Architecture:** Guard `get_gerant_user()` ajouté dans `auth.py` et appliqué aux 4 endpoints CRUD de `channels.py`. Le seed crée un superadmin + 4 agences légères avec gérants et deals. Le frontend ajoute `isGerant` dans AuthContext, met à jour la route `/settings/canaux`, et ajoute une section "Mon Agence" gérant-only dans le sidebar.

**Tech Stack:** FastAPI, SQLModel, pytest/TestClient, React 18, Vite, TailwindCSS

---

## Files

| Action | Fichier |
|--------|---------|
| Modify | `backend/auth.py` |
| Modify | `backend/api/channels.py` |
| Modify | `tests/conftest.py` |
| Modify | `tests/test_channels_basic.py` |
| Modify | `backend/scripts/seed_demo.py` |
| Modify | `src/App.jsx` |
| Modify | `src/components/Sidebar.jsx` |

---

### Task 1 : Backend — `get_gerant_user()` + guard sur les endpoints ChannelAccount

**Files:**
- Modify: `backend/auth.py:71-77`
- Modify: `backend/api/channels.py:11,197-283`
- Modify: `tests/conftest.py`
- Modify: `tests/test_channels_basic.py`

- [ ] **Step 1 : Mettre à jour conftest.py — fixture `client` en gérant + nouvelle fixture `client_agent`**

Remplacer le contenu de `tests/conftest.py` :

```python
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from backend.main import app
from backend.database import get_session
from backend.auth import get_current_user
from backend.models import Agency, User
from backend.auth import get_password_hash


TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.fixture(name="session", scope="function")
def session_fixture():
    SQLModel.metadata.create_all(TEST_ENGINE)
    with Session(TEST_ENGINE) as session:
        yield session
    SQLModel.metadata.drop_all(TEST_ENGINE)


@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session):
    def _get_session():
        return session

    agency = Agency(name="Test Agence", location="Paris", status="active", license_key="test-key-123")
    session.add(agency)
    session.commit()
    session.refresh(agency)

    user = User(
        username="test_gerant",
        full_name="Gérant Test",
        email="gerant@test.com",
        hashed_password=get_password_hash("password"),
        role="gérant",
        agency_id=agency.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    def _get_current_user():
        return user

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_current_user] = _get_current_user

    yield TestClient(app), user, agency

    app.dependency_overrides.clear()


@pytest.fixture(name="client_agent", scope="function")
def client_agent_fixture(session: Session):
    def _get_session():
        return session

    agency = Agency(name="Test Agence Agent", location="Lyon", status="active", license_key="agent-key-456")
    session.add(agency)
    session.commit()
    session.refresh(agency)

    user = User(
        username="test_agent_role",
        full_name="Agent Employé",
        email="agent_role@test.com",
        hashed_password=get_password_hash("password"),
        role="agent",
        agency_id=agency.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    def _get_current_user():
        return user

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_current_user] = _get_current_user

    yield TestClient(app), user, agency

    app.dependency_overrides.clear()
```

- [ ] **Step 2 : Écrire les tests qui échouent dans `tests/test_channels_basic.py`**

Ajouter à la fin du fichier :

```python
def test_agent_cannot_create_account(client_agent):
    tc, user, agency = client_agent
    payload = {
        "channel_type": "whatsapp",
        "user_id": user.id,
        "credentials": {"account_sid": "ACtest", "auth_token": "tok"},
        "phone_number": "+33600000000",
    }
    resp = tc.post("/api/channels/accounts", json=payload)
    assert resp.status_code == 403


def test_agent_cannot_list_accounts(client_agent):
    tc, user, agency = client_agent
    resp = tc.get("/api/channels/accounts")
    assert resp.status_code == 403


def test_agent_can_read_conversations(client_agent):
    tc, user, agency = client_agent
    resp = tc.get("/api/channels/conversations")
    assert resp.status_code == 200


def test_gerant_can_create_account(client):
    tc, user, agency = client
    payload = {
        "channel_type": "sms",
        "user_id": user.id,
        "credentials": {"account_sid": "ACtest2", "auth_token": "tok2"},
        "phone_number": "+33700000001",
    }
    resp = tc.post("/api/channels/accounts", json=payload)
    assert resp.status_code == 200
    assert resp.json()["channel_type"] == "sms"
```

- [ ] **Step 3 : Lancer les tests — vérifier qu'ils échouent pour les bonnes raisons**

```bash
cd antigravity-proto
python -m pytest tests/test_channels_basic.py::test_agent_cannot_create_account tests/test_channels_basic.py::test_agent_cannot_list_accounts -v
```

Résultat attendu : les tests `test_agent_cannot_*` passent à 200 au lieu de 403 (la garde n'existe pas encore).

- [ ] **Step 4 : Ajouter `get_gerant_user()` dans `backend/auth.py`**

Après la fonction `get_admin_user` (ligne 71), ajouter :

```python
def get_gerant_user(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("gérant", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au gérant de l'agence"
        )
    return current_user
```

- [ ] **Step 5 : Appliquer la garde dans `backend/api/channels.py`**

Remplacer l'import ligne 11 :

```python
from ..auth import get_current_user, get_gerant_user, User
```

Puis remplacer `get_current_user` par `get_gerant_user` **uniquement** sur les 4 endpoints CRUD ChannelAccount (lignes ~197-283). Les endpoints Conversations et Webhooks gardent `get_current_user`.

Endpoint `POST /accounts` (ligne ~198) :
```python
@router.post("/accounts")
async def create_account(
    body: AccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
```

Endpoint `GET /accounts` (ligne ~217) :
```python
@router.get("/accounts")
async def list_accounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
```

Endpoint `DELETE /accounts/{acc_id}` (ligne ~239) :
```python
@router.delete("/accounts/{acc_id}")
async def delete_account(
    acc_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
```

Endpoint `POST /accounts/{acc_id}/test` (ligne ~254) :
```python
@router.post("/accounts/{acc_id}/test")
async def test_account(
    acc_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_gerant_user),
):
```

- [ ] **Step 6 : Lancer tous les tests channels**

```bash
python -m pytest tests/test_channels_basic.py -v
```

Résultat attendu : tous les tests passent, dont :
```
PASSED tests/test_channels_basic.py::test_fernet_roundtrip
PASSED tests/test_channels_basic.py::test_list_accounts_empty
PASSED tests/test_channels_basic.py::test_create_and_list_account
PASSED tests/test_channels_basic.py::test_list_conversations_empty
PASSED tests/test_channels_basic.py::test_agent_cannot_create_account
PASSED tests/test_channels_basic.py::test_agent_cannot_list_accounts
PASSED tests/test_channels_basic.py::test_agent_can_read_conversations
PASSED tests/test_channels_basic.py::test_gerant_can_create_account
```

- [ ] **Step 7 : Commit**

```bash
git add backend/auth.py backend/api/channels.py tests/conftest.py tests/test_channels_basic.py
git commit -m "feat(backend): garde get_gerant_user sur endpoints ChannelAccount CRUD"
```

---

### Task 2 : Seed — superadmin + 4 agences fictives

**Files:**
- Modify: `backend/scripts/seed_demo.py`

- [ ] **Step 1 : Ajouter les constantes superadmin et EXTRA_AGENCIES_DATA**

Après les constantes `DEMO_PASSWORD` (ligne ~36), ajouter :

```python
SUPERADMIN_USERNAME = "noa.aevum"
SUPERADMIN_EMAIL = "noa.aevum@aevum.io"

EXTRA_AGENCIES_DATA = [
    {
        "name": "Moreau Immobilier",
        "location": "Paris",
        "status": "active",
        "gerant": {
            "username": "sophie.moreau",
            "full_name": "Sophie Moreau",
            "email": "sophie.moreau@moreau-immo.fr",
        },
        "deals": [
            {"url": "https://demo/moreau-1", "city": "Paris", "district": "Paris 8e", "property_type": "appartement", "price": 780000, "surface": 85.0, "price_per_m2": 9176, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(5)},
            {"url": "https://demo/moreau-2", "city": "Paris", "district": "Paris 16e", "property_type": "appartement", "price": 1200000, "surface": 120.0, "price_per_m2": 10000, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(10)},
            {"url": "https://demo/moreau-3", "city": "Paris", "district": "Paris 11e", "property_type": "appartement", "price": 450000, "surface": 58.0, "price_per_m2": 7758, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(15)},
            {"url": "https://demo/moreau-4", "city": "Neuilly-sur-Seine", "district": None, "property_type": "maison", "price": 2100000, "surface": 220.0, "price_per_m2": 9545, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(3)},
            {"url": "https://demo/moreau-5", "city": "Paris", "district": "Paris 6e", "property_type": "appartement", "price": 950000, "surface": 75.0, "price_per_m2": 12667, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(20)},
            {"url": "https://demo/moreau-6", "city": "Paris", "district": "Paris 9e", "property_type": "appartement", "price": 620000, "surface": 70.0, "price_per_m2": 8857, "dpe": "E", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(8)},
            {"url": "https://demo/moreau-7", "city": "Levallois-Perret", "district": None, "property_type": "appartement", "price": 580000, "surface": 65.0, "price_per_m2": 8923, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(12)},
            {"url": "https://demo/moreau-8", "city": "Paris", "district": "Paris 17e", "property_type": "appartement", "price": 730000, "surface": 80.0, "price_per_m2": 9125, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(25)},
        ],
    },
    {
        "name": "Côte d'Azur Prestige",
        "location": "Nice",
        "status": "active",
        "gerant": {
            "username": "marc.ferrari",
            "full_name": "Marc Ferrari",
            "email": "marc.ferrari@cda-prestige.fr",
        },
        "deals": [
            {"url": "https://demo/nice-1", "city": "Nice", "district": "Carré d'Or", "property_type": "appartement", "price": 890000, "surface": 95.0, "price_per_m2": 9368, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(4)},
            {"url": "https://demo/nice-2", "city": "Cannes", "district": None, "property_type": "appartement", "price": 1400000, "surface": 130.0, "price_per_m2": 10769, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(7)},
            {"url": "https://demo/nice-3", "city": "Nice", "district": "Cimiez", "property_type": "maison", "price": 1800000, "surface": 200.0, "price_per_m2": 9000, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(14)},
            {"url": "https://demo/nice-4", "city": "Antibes", "district": None, "property_type": "appartement", "price": 560000, "surface": 68.0, "price_per_m2": 8235, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(18)},
            {"url": "https://demo/nice-5", "city": "Monaco", "district": None, "property_type": "appartement", "price": 3200000, "surface": 110.0, "price_per_m2": 29090, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(2)},
        ],
    },
    {
        "name": "Cabinet Rivière",
        "location": "Bordeaux",
        "status": "suspended",
        "gerant": {
            "username": "claire.riviere",
            "full_name": "Claire Rivière",
            "email": "claire.riviere@cabinet-riviere.fr",
        },
        "deals": [
            {"url": "https://demo/bdx-1", "city": "Bordeaux", "district": "Chartrons", "property_type": "appartement", "price": 380000, "surface": 80.0, "price_per_m2": 4750, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(45)},
            {"url": "https://demo/bdx-2", "city": "Bordeaux", "district": "Bacalan", "property_type": "appartement", "price": 290000, "surface": 65.0, "price_per_m2": 4461, "dpe": "E", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(60)},
            {"url": "https://demo/bdx-3", "city": "Mérignac", "district": None, "property_type": "maison", "price": 450000, "surface": 120.0, "price_per_m2": 3750, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(55)},
        ],
    },
    {
        "name": "Zénith Immo",
        "location": "Marseille",
        "status": "active",
        "gerant": {
            "username": "david.zenit",
            "full_name": "David Zénith",
            "email": "david.zenit@zenith-immo.fr",
        },
        "deals": [
            {"url": "https://demo/mrs-1", "city": "Marseille", "district": "6e arrondissement", "property_type": "appartement", "price": 420000, "surface": 90.0, "price_per_m2": 4666, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(3)},
            {"url": "https://demo/mrs-2", "city": "Marseille", "district": "Vieux-Port", "property_type": "appartement", "price": 310000, "surface": 65.0, "price_per_m2": 4769, "dpe": "E", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(7)},
            {"url": "https://demo/mrs-3", "city": "Marseille", "district": "Endoume", "property_type": "appartement", "price": 680000, "surface": 110.0, "price_per_m2": 6181, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(10)},
            {"url": "https://demo/mrs-4", "city": "Aix-en-Provence", "district": None, "property_type": "maison", "price": 760000, "surface": 160.0, "price_per_m2": 4750, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(5)},
            {"url": "https://demo/mrs-5", "city": "Marseille", "district": "Mazargues", "property_type": "appartement", "price": 250000, "surface": 55.0, "price_per_m2": 4545, "dpe": "D", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(15)},
            {"url": "https://demo/mrs-6", "city": "Marseille", "district": "Les Goudes", "property_type": "maison", "price": 890000, "surface": 150.0, "price_per_m2": 5933, "dpe": "C", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(20)},
            {"url": "https://demo/mrs-7", "city": "Cassis", "district": None, "property_type": "maison", "price": 1100000, "surface": 180.0, "price_per_m2": 6111, "dpe": "B", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(12)},
            {"url": "https://demo/mrs-8", "city": "Marseille", "district": "Montredon", "property_type": "appartement", "price": 340000, "surface": 72.0, "price_per_m2": 4722, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(25)},
            {"url": "https://demo/mrs-9", "city": "La Ciotat", "district": None, "property_type": "maison", "price": 620000, "surface": 140.0, "price_per_m2": 4428, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(30)},
            {"url": "https://demo/mrs-10", "city": "Marseille", "district": "Sainte-Anne", "property_type": "appartement", "price": 290000, "surface": 60.0, "price_per_m2": 4833, "dpe": "E", "aevum_score": 4, "vertical": "immo", "timestamp": _ago(35)},
        ],
    },
]
```

Note : `EXTRA_AGENCIES_DATA` doit être placé **après** la définition de `_ago()` (ligne ~41) puisqu'il l'utilise pour les timestamps.

- [ ] **Step 2 : Ajouter la fonction `seed_extra_agencies()`**

Ajouter après la fonction `seed_post_sale()` (avant `seed_calendar_blocks`) :

```python
def seed_extra_agencies(session: Session) -> None:
    for ag_data in EXTRA_AGENCIES_DATA:
        agency = Agency(
            name=ag_data["name"],
            location=ag_data["location"],
            status=ag_data["status"],
        )
        session.add(agency)
        session.flush()

        gerant = User(
            username=ag_data["gerant"]["username"],
            full_name=ag_data["gerant"]["full_name"],
            email=ag_data["gerant"]["email"],
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="gérant",
            is_active=True,
            agency_id=agency.id,
        )
        session.add(gerant)
        session.flush()

        for d in ag_data["deals"]:
            deal = Deal(agency_id=agency.id, **d)
            session.add(deal)
        session.flush()
```

- [ ] **Step 3 : Commit intermédiaire (constants + fonction — pas encore appelée)**

```bash
git add backend/scripts/seed_demo.py
git commit -m "feat(seed): constantes EXTRA_AGENCIES_DATA + seed_extra_agencies()"
```

---

### Task 3 : Seed — mise à jour seed_demo() et reset_demo()

**Files:**
- Modify: `backend/scripts/seed_demo.py`

- [ ] **Step 1 : Corriger `SIGNATURES_DATA` — changer lead_idx 7 → 6**

Dans `SIGNATURES_DATA` (ligne ~534), modifier la 4e entrée :

```python
SIGNATURES_DATA = [
    {
        "lead_idx": 2,
        "signature_request_id": "sim-demo-001",
        "signature_status": "signed",
    },
    {
        "lead_idx": 0,
        "signature_request_id": "sim-demo-002",
        "signature_status": "pending",
    },
    {
        "lead_idx": 3,
        "signature_request_id": "sim-demo-003",
        "signature_status": "pending",
    },
    {
        "lead_idx": 6,                          # était 7 — Franck Dupuis passe chez julie.martin
        "signature_request_id": "sim-demo-004",
        "signature_status": "refused",
    },
]
```

Raison : le lead à l'index 7 (Franck Dupuis) sera désormais assigné à `julie.martin`. Le code de seed des signatures cherche uniquement dans `Lead.assigned_to == agent.id` (thomas). On utilise donc l'index 6 (Isabelle Faure) à la place.

- [ ] **Step 2 : Mettre à jour la boucle leads dans `seed_demo()` — redistribuer 8 leads vers agent2**

Trouver la boucle leads dans `seed_demo()` (ligne ~965) et la remplacer :

```python
        # --- Leads ---
        for i, ld in enumerate(LEADS_DATA):
            ld_copy = dict(ld)
            deal_idx = ld_copy.pop("deal_idx")
            days_ago = ld_copy.pop("days_ago")
            assigned = agent2.id if i >= 7 else agent.id
            lead = Lead(
                deal_id=created_deals[deal_idx].id,
                assigned_to=assigned,
                created_at=now - timedelta(days=days_ago),
                **ld_copy,
            )
            session.add(lead)
        session.flush()
```

Résultat : leads[0-6] → thomas.dupont (gérant), leads[7-14] → julie.martin (agent).

- [ ] **Step 3 : Créer le compte superadmin dans `seed_demo()`**

Après la création de `agent2` (après `session.flush()`), ajouter :

```python
        # --- Superadmin AEVUM ---
        superadmin = User(
            username=SUPERADMIN_USERNAME,
            full_name="Noa AEVUM",
            email=SUPERADMIN_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="admin",
            is_active=True,
            agency_id=None,
        )
        session.add(superadmin)
        session.flush()
```

- [ ] **Step 4 : Appeler `seed_extra_agencies()` dans `seed_demo()`**

Après la création du superadmin, ajouter :

```python
        # --- Agences supplémentaires (superadmin view) ---
        seed_extra_agencies(session)
```

- [ ] **Step 5 : Mettre à jour `reset_demo()` — supprimer agences extra + superadmin**

À la fin de `reset_demo()`, juste avant `session.commit()` et `print("🗑️ ...")`, ajouter :

```python
    # Supprimer agences extras + leurs users et deals
    for ag_name in [ag["name"] for ag in EXTRA_AGENCIES_DATA]:
        extra_ag = session.exec(select(Agency).where(Agency.name == ag_name)).first()
        if not extra_ag:
            continue
        extra_deal_ids = [d.id for d in session.exec(select(Deal).where(Deal.agency_id == extra_ag.id)).all()]
        extra_uid = [u.id for u in session.exec(select(User).where(User.agency_id == extra_ag.id)).all()]
        if extra_deal_ids:
            conn.execute(text(f"DELETE FROM deal WHERE id IN {_in(extra_deal_ids)}"))
        if extra_uid:
            conn.execute(text(f'DELETE FROM "user" WHERE id IN {_in(extra_uid)}'))
        conn.execute(text(f"DELETE FROM agency WHERE id = {extra_ag.id}"))

    # Supprimer superadmin
    conn.execute(text(f"DELETE FROM \"user\" WHERE username = '{SUPERADMIN_USERNAME}'"))
```

- [ ] **Step 6 : Mettre à jour le résumé de fin dans `seed_demo()`**

Après le bloc de comptage final, ajouter les nouvelles lignes de résumé :

```python
    n_extra_agencies = len(EXTRA_AGENCIES_DATA)
    n_extra_deals = sum(len(ag["deals"]) for ag in EXTRA_AGENCIES_DATA)
```

Et dans le bloc print, ajouter après la ligne `✅ Agence démo créée` :

```python
    print(f"✅ Superadmin créé : {SUPERADMIN_USERNAME} / {DEMO_PASSWORD}")
    print(f"✅ {n_extra_agencies} agences supplémentaires ({n_extra_deals} deals synthétiques)")
    print(f"✅ 7 leads → thomas.dupont (gérant) | 8 leads → julie.martin (agent)")
```

- [ ] **Step 7 : Tester le seed**

```bash
python backend/scripts/seed_demo.py --reset
```

Résultat attendu (extrait) :
```
✅ Agence démo créée
✅ Superadmin créé : noa.aevum / Demo2026!
✅ 4 agences supplémentaires (26 deals synthétiques)
✅ 7 leads → thomas.dupont (gérant) | 8 leads → julie.martin (agent)
✅ 20 deals insérés
✅ 15 leads insérés
...
```

- [ ] **Step 8 : Commit**

```bash
git add backend/scripts/seed_demo.py
git commit -m "feat(seed): superadmin noa.aevum + 4 agences + redistribution leads gérant/agent"
```

---

### Task 4 : Frontend — AuthContext + ProtectedRoute + route /settings/canaux

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1 : Ajouter `isGerant` dans `authValue` et mettre à jour `ProtectedRoute`**

Dans `src/App.jsx`, remplacer le bloc `authValue` (ligne ~90-100) :

```jsx
  const authValue = {
    user,
    userSettings,
    login,
    logout,
    updateUserProfile,
    updateUserSettings,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isGerant: user?.role === 'gérant',
    isClient: user?.role === 'client'
  };
```

Remplacer `ProtectedRoute` (ligne ~38-44) :

```jsx
const ProtectedRoute = ({ children, roles = null }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles === "admin" && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (roles === "gerant" && !["gérant", "admin"].includes(user.role)) return <Navigate to="/dashboard" replace />;
  if (roles === "staff" && !["client", "commercial", "admin", "gérant", "agent"].includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};
```

- [ ] **Step 2 : Mettre à jour la route `/settings/canaux`**

Trouver la route `/settings/canaux` (ligne ~166) et changer `roles="staff"` en `roles="gerant"` :

```jsx
          <Route path="/settings/canaux" element={<ProtectedRoute roles="gerant"><Layout /></ProtectedRoute>}>
            <Route index element={<ChannelSettings />} />
          </Route>
```

- [ ] **Step 3 : Vérifier visuellement**

Lancer le frontend :
```bash
npm run dev
```

Se connecter en tant que `julie.martin` / `Demo2026!`. Tenter d'aller sur `http://localhost:5173/settings/canaux`. Résultat attendu : redirection vers `/dashboard`.

Se connecter en tant que `thomas.dupont` / `Demo2026!`. Aller sur `http://localhost:5173/settings/canaux`. Résultat attendu : page ChannelSettings accessible.

- [ ] **Step 4 : Commit**

```bash
git add src/App.jsx
git commit -m "feat(frontend): isGerant AuthContext + ProtectedRoute gerant + guard /settings/canaux"
```

---

### Task 5 : Frontend — Sidebar (badge + Chat IA + Mon Agence)

**Files:**
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1 : Retirer "Canaux" de la section "Chat IA" dans `clientSections`**

Dans `src/components/Sidebar.jsx`, trouver la section `omnichannel` (ligne ~48-55) et remplacer :

```jsx
  {
    id: 'omnichannel',
    label: 'Chat IA',
    emoji: '💬',
    items: [
      { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
    ],
  },
```

- [ ] **Step 2 : Ajouter `isGerant` dans le destructuring du hook `useAuth`**

Trouver ligne ~124 dans `Sidebar.jsx` :

```jsx
    const { isAdmin, user } = useAuth();
```

Remplacer par :

```jsx
    const { isAdmin, isGerant, user } = useAuth();
```

- [ ] **Step 3 : Ajouter la constante `gerantSections` après `adminNavItems`**

Après `adminNavItems` (ligne ~82), ajouter :

```jsx
const gerantSections = [
  {
    id: 'mon-agence',
    label: 'Mon Agence',
    emoji: '🏢',
    items: [
      { icon: Plug, label: 'Canaux', path: '/settings/canaux' },
    ],
  },
];
```

- [ ] **Step 4 : Mettre à jour le badge mode pour gérant**

Trouver le bloc badge (ligne ~178-193) et remplacer :

```jsx
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    isAdmin
                        ? 'bg-accent/10 border border-accent/20'
                        : isGerant
                        ? 'bg-orange-500/10 border border-orange-500/20'
                        : 'bg-blue-500/10 border border-blue-500/20'
                }`}>
                    {isAdmin ? (
                        <Shield className="w-4 h-4 text-accent" />
                    ) : isGerant ? (
                        <Shield className="w-4 h-4 text-orange-400" />
                    ) : (
                        <LayoutDashboard className="w-4 h-4 text-blue-400" />
                    )}
                    <span className={`text-xs font-medium ${
                        isAdmin ? 'text-accent' : isGerant ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                        {isAdmin ? 'Mode Administrateur' : isGerant ? 'Mode Gérant' : 'Mode Agent'}
                    </span>
                </div>
```

- [ ] **Step 5 : Ajouter le rendu de `gerantSections` dans le sidebar client**

Trouver le bloc `clientSections.map(...)` (ligne ~214-222) et remplacer :

```jsx
                    ) : (
                        <div className="space-y-3">
                            {clientSections.map((section) => (
                                <SidebarSection
                                    key={section.id}
                                    section={section}
                                    isOpen={openSections.has(section.id)}
                                    onToggle={() => toggleSection(section.id)}
                                />
                            ))}
                            {isGerant && gerantSections.map((section) => (
                                <SidebarSection
                                    key={section.id}
                                    section={section}
                                    isOpen={openSections.has(section.id)}
                                    onToggle={() => toggleSection(section.id)}
                                />
                            ))}
                        </div>
                    )}
```

- [ ] **Step 6 : Mettre à jour `validIds` dans `useState` pour inclure les sections gérant**

Trouver la ligne `const validIds = new Set(clientSections.map(s => s.id));` (ligne ~135) et remplacer :

```jsx
        const validIds = new Set([...clientSections, ...gerantSections].map(s => s.id));
        const safe = new Set(stored.filter(id => validIds.has(id)));
        const activeSection = [...clientSections, ...gerantSections].find(s =>
            s.items.some(item =>
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/')
            )
        );
```

- [ ] **Step 7 : Vérifier visuellement les 3 profils**

```bash
npm run dev
```

1. Login `julie.martin` → badge "Mode Agent" bleu, sidebar sans "Canaux", sans "Mon Agence"
2. Login `thomas.dupont` → badge "Mode Gérant" orange, sidebar avec section "Mon Agence 🏢" contenant "Canaux"
3. Login `noa.aevum` → badge "Mode Administrateur", sidebar admin (Administration / Admin KPI / Agences)

- [ ] **Step 8 : Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat(frontend): sidebar RBAC — badge gérant/agent + section Mon Agence gérant-only"
```

---

## Résumé des comptes démo après implémentation

| Username | Password | Rôle | Accès |
|----------|----------|------|-------|
| `noa.aevum` | `Demo2026!` | superadmin | `/admin` — 5 agences visibles |
| `thomas.dupont` | `Demo2026!` | gérant | sidebar client + Mon Agence, 7 leads |
| `julie.martin` | `Demo2026!` | agent | sidebar client sans Mon Agence, 8 leads propres |
