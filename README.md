# AEVUM — CRM Immobilier SaaS

CRM multi-tenant pour agences immobilières : scraping automatique des portails, scoring IA des annonces, gestion des leads, mandats Loi Hoguet, gestion locative, signature électronique et messagerie omnicanal.

---

## Description

Les agences immobilières passent un temps considérable à surveiller les portails (PAP, LeBonCoin, Bien'ici, SeLoger), qualifier les prospects manuellement et suivre les dossiers dans des outils déconnectés. AEVUM centralise l'ensemble du cycle de vie d'une transaction dans une interface unique.

**Fonctionnalités principales :**

- Scraping automatique des annonces (PAP, LeBonCoin, Bien'ici, SeLoger) via APScheduler
- Scoring IA des deals de 1 à 10 (DeepSeek API + fallback heuristique)
- Calcul automatique de la rentabilité locative brute par code postal
- CRM prospects en vue kanban avec historique des échanges
- Registre légal des mandats (Loi Hoguet) et génération PDF
- Signature électronique des mandats via Yousign
- Gestion locative complète : baux, paiements, quittances, rapports propriétaires
- Suivi post-vente en 7 étapes légales avec alertes J-7/J-3/J-1
- Messagerie omnicanal : SMS (Twilio), WhatsApp, Email IMAP/SMTP avec qualification IA
- Calendrier de réservation public (page sans auth par clé de licence)
- Campagnes email/SMS en masse
- Panel super-admin : gestion multi-agences, KPIs, rapports mensuels
- PWA installable sur mobile

---

## Stack technique

### Frontend

| Technologie | Version |
|---|---|
| React | 19.2 |
| Vite | 8.0 |
| TailwindCSS | 4.2 |
| React Router | 7.13 |
| Axios | 1.14 |
| Recharts | 3.8 |
| Leaflet / React-Leaflet | 1.9 / 5.0 |
| Lucide React | 0.577 |
| vite-plugin-pwa | 1.2 |

### Backend

| Technologie | Version |
|---|---|
| FastAPI | 0.135 |
| SQLModel | 0.0.38 |
| SQLAlchemy | 2.0 |
| Alembic | 1.18 |
| Uvicorn | 0.44 |
| python-jose (JWT) | 3.5 |
| Passlib / Bcrypt | 1.7 / 3.2 |
| APScheduler | 3.11 |
| SlowAPI (rate limiting) | 0.1.9 |
| Cryptography (Fernet) | 44.0 |
| Twilio | 9.4 |
| python-docx | 1.2 |
| BeautifulSoup4 / lxml | 4.14 / 6.0 |
| Geopy / Overpy | 2.4 / 0.7 |
| HTTPX / Requests | 0.28 / 2.33 |
| pytest | 9.0 |

### Base de données

- PostgreSQL 14+ (driver : psycopg2-binary 2.9)
- Migrations gérées par Alembic

### Autres

- DeepSeek API (scoring deals + qualification omnicanal)
- Yousign API (signature électronique)
- Nominatim / Overpass API (géocodage PAP, données POI)

---

## Prérequis

- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- Un compte DeepSeek (clé API pour le scoring)
- Un compte Yousign (optionnel, pour la signature électronique)
- Un compte Twilio (optionnel, pour SMS/WhatsApp)

---

## Installation et lancement

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd antigravity-proto
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` avec vos valeurs (voir section [Variables d'environnement](#variables-denvironnement)).

### 3. Installer les dépendances backend

```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### 4. Créer la base de données PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE aevum;"
```

### 5. Appliquer les migrations Alembic

```bash
cd backend
alembic upgrade head
cd ..
```

### 6. Initialiser les données de démonstration (optionnel)

```bash
python -m backend.init_db
```

### 7. Lancer le backend

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 8. Installer les dépendances frontend

Dans un second terminal :

```bash
npm install
```

### 9. Lancer le frontend

```bash
npm run dev
```

### 10. Accès

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Docs API (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

---

## Variables d'environnement

Toutes les variables sont à définir dans le fichier `.env` à la racine du projet.

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:password@localhost:5432/aevum` |
| `SECRET_KEY` | Clé secrète pour signer les JWT — changer en production | `une-chaine-aleatoire-longue` |
| `ENV` | Environnement d'exécution (`dev` ou `production`) | `dev` |
| `ALLOWED_ORIGINS` | Origines CORS autorisées, séparées par des virgules | `http://localhost:5173` |
| `YOUSIGN_API_KEY` | Clé API Yousign pour la signature électronique | `ys_...` |
| `YOUSIGN_WEBHOOK_SECRET` | Secret de validation des webhooks Yousign | `whs_...` |
| `SMTP_HOST` | Serveur SMTP pour l'envoi d'emails | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Adresse email d'envoi | `contact@monagence.fr` |
| `SMTP_PASSWORD` | Mot de passe ou app password SMTP | `••••••••` |
| `TWILIO_ACCOUNT_SID` | SID du compte Twilio (SMS/WhatsApp) | `AC...` |
| `TWILIO_AUTH_TOKEN` | Token d'authentification Twilio | `••••••••` |
| `TWILIO_FROM_NUMBER` | Numéro Twilio expéditeur | `+33600000000` |
| `DEEPSEEK_API_KEY` | Clé API DeepSeek pour le scoring IA | `sk-...` |
| `VITE_API_URL` | URL de l'API backend (consommée par le frontend) | `http://localhost:8000` |
| `VITE_LICENSE_KEY` | Clé de licence agence (active les features premium) | `lic_...` |

---

## Structure du projet

```
antigravity-proto/
├── backend/
│   ├── main.py                  # Entrypoint FastAPI — montage des routers, middleware JWT
│   ├── models.py                # Modèles SQLModel : Deal, Lead, Agency, User, Mandate, Rental...
│   ├── auth.py                  # JWT httpOnly cookies + middleware tenant multi-agence
│   ├── database.py              # Moteur SQLAlchemy, session, création des tables
│   ├── scheduler.py             # APScheduler : scraping périodique, alertes, polling email
│   ├── init_db.py               # Seed de démonstration (agence, users, deals, leads)
│   ├── api/
│   │   ├── deals.py             # CRUD annonces + export + suivi post-vente
│   │   ├── leads.py             # CRM prospects, kanban, signature
│   │   ├── mandates.py          # Registre mandats Loi Hoguet + PDF + Yousign
│   │   ├── rentals.py           # Gestion locative : baux, paiements, quittances
│   │   ├── channels.py          # Messagerie omnicanal : comptes, conversations, webhooks
│   │   ├── calendar_config.py   # Horaires, indisponibilités, créneaux disponibles
│   │   ├── booking.py           # Page de réservation publique (sans auth)
│   │   ├── campaigns.py         # Campagnes email/SMS en masse
│   │   ├── admin.py             # Super-admin : agences, KPIs, rapports
│   │   ├── alerts.py            # Alertes deal → notifications utilisateur
│   │   ├── documents.py         # Génération compromis/mandat .docx
│   │   ├── matching.py          # Matching client ↔ bien
│   │   ├── notifications.py     # Notifications in-app
│   │   ├── onboarding.py        # Tunnel de configuration initiale
│   │   ├── trends.py            # Tendances marché par zone
│   │   ├── chat.py              # Chat interne agents
│   │   ├── chat_public.py       # Widget chat public embeddable
│   │   └── license.py           # Guard licence agence (features premium)
│   ├── scrapers/
│   │   ├── base_scraper.py      # Classe abstraite + déduplication des annonces
│   │   ├── pap_scraper.py       # PAP.fr — géocodage Nominatim + POI Overpass
│   │   ├── leboncoin_scraper.py # LeBonCoin — parsing __NEXT_DATA__ JSON + fallback HTML
│   │   └── auto_scraper.py      # Orchestrateur tous portails (PAP, LBC, Bien'ici, SeLoger)
│   └── services/
│       ├── scoring.py           # Scoring DeepSeek 1-10 par deal
│       ├── scoring_heuristic.py # Fallback heuristique si DeepSeek indisponible
│       ├── rental_yield.py      # Calcul estimated_rent + gross_yield par CP/surface
│       ├── mandate_service.py   # Génération PDF mandat + contrôle expiration
│       ├── rental_service.py    # Quittances PDF + rapports propriétaires + relances
│       ├── calendar_service.py  # Calcul des créneaux libres selon config
│       ├── alert_service.py     # Vérification seuils alertes + dispatch notifications
│       ├── email_service.py     # Envoi emails SMTP transactionnels et bulk
│       ├── pdf_service.py       # Génération PDF (compromis, rapports)
│       ├── report_service.py    # Rapport mensuel agence .docx
│       ├── omnichannel_ai.py    # Qualification leads IA + proposition créneaux RDV
│       ├── whatsapp_service.py  # Envoi/réception WhatsApp via Twilio
│       ├── sms_service.py       # Envoi/réception SMS via Twilio
│       ├── email_inbox.py       # Fetch IMAP + réponse SMTP (messagerie entrante)
│       └── fernet_utils.py      # Chiffrement/déchiffrement credentials canaux (Fernet)
├── alembic/
│   └── versions/                # Migrations DB ordonnées (agency → lead → deal → ...)
├── src/
│   ├── components/              # Composants réutilisables : Header, Sidebar, Layout, LicenseGuard...
│   ├── pages/                   # Pages React : Dashboard, Leads, Immobilier, Mandates, Rentals...
│   └── services/
│       ├── api.js               # Client Axios centralisé avec intercepteurs
│       └── dealService.js       # Helpers spécifiques deals
├── public/
│   └── icons/                   # Icônes PWA (192x192, 512x512)
├── .env.example                 # Modèle de variables d'environnement
├── requirements.txt             # Dépendances Python
├── package.json                 # Dépendances Node.js
└── vite.config.js               # Config Vite + PWA Workbox
```
