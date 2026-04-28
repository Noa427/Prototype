# AEVUM — SaaS CRM Immobilier

## Stack technique

**Backend** : FastAPI · SQLModel (ORM) · SQLAlchemy 2 · Alembic · PostgreSQL (psycopg2)
**Auth** : JWT (python-jose) · Passlib/Bcrypt · cookie-based tenant injection
**Scheduler** : APScheduler 3.11
**Scraping** : Requests · HTTPX · BeautifulSoup4 · lxml · Geopy · Overpy (OSM)
**AI** : DeepSeek (scoring deals) — fallback heuristique si indispo
**Docs** : python-docx · PDF via service dédié
**Frontend** : React 18 · Vite · TailwindCSS
**Tests** : Pytest — tests intégration DB + tests unitaires scrapers

---

## Architecture

```
antigravity-proto/
├── backend/
│   ├── main.py              # FastAPI app, montage des routers
│   ├── models.py            # SQLModel : Deal, Lead, Agency, User, Notification, ...
│   ├── auth.py              # JWT + tenant middleware
│   ├── database.py          # Session SQLAlchemy
│   ├── scheduler.py         # APScheduler — scraping périodique + alertes
│   ├── init_db.py           # Init tables + seed
│   ├── api/                 # Routers FastAPI
│   │   ├── admin.py         # Super-admin : agences, KPIs, statuts
│   │   ├── deals.py         # CRUD deals + scoring
│   │   ├── leads.py         # CRUD leads + kanban
│   │   ├── alerts.py        # Alertes deal → notifications
│   │   ├── booking.py       # Réservation créneaux publics
│   │   ├── calendar_config.py
│   │   ├── campaigns.py     # Campagnes email/SMS bulk
│   │   ├── chat.py / chat_public.py  # Widget chat public
│   │   ├── documents.py     # Génération compromis/mandat .docx
│   │   ├── matching.py      # Match client ↔ bien
│   │   ├── notifications.py
│   │   ├── onboarding.py
│   │   ├── trends.py
│   │   └── license.py       # Guard licence agence
│   ├── scrapers/
│   │   ├── base_scraper.py  # ABC + dedup
│   │   ├── pap_scraper.py   # PAP.fr (géocodage Nominatim + Overpass)
│   │   ├── leboncoin_scraper.py  # LBC __NEXT_DATA__ JSON
│   │   └── auto_scraper.py  # Orchestrateur (PAP + LBC + Bien'ici + SeLoger)
│   └── services/
│       ├── scoring.py       # Score DeepSeek (1-10)
│       ├── scoring_heuristic.py  # Fallback heuristique
│       ├── rental_yield.py  # estimated_rent + gross_yield par deal
│       ├── pdf_service.py   # Génération PDF
│       ├── report_service.py # Rapport mensuel .docx agence
│       ├── email_service.py
│       ├── alert_service.py
│       └── calendar_service.py
├── alembic/versions/        # Migrations DB (ordre : agency→lead→deal→notifications→license→calendar)
├── src/
│   ├── components/          # Header, Sidebar, Layout, LicenseGuard, MatchingModal, MapComponent, ...
│   ├── pages/               # Dashboard, Leads, Immobilier, Campaigns, Automation, AdminKPI,
│   │                        # AdminAgencies, CalendarSettings, AnalyseZone, Reporting, Security, ...
│   └── services/
│       ├── api.js           # Client Axios centralisé
│       └── dealService.js
└── graphify-out/            # Knowledge graph (ne pas modifier manuellement)
```

---

## Modèles centraux (god nodes)

| Modèle | Connexions | Rôle |
|--------|-----------|------|
| `Deal` | 45 | Annonce immobilière scrapée + scorée |
| `Lead` | 33 | Prospect CRM (kanban) |
| `Agency` | 28 | Tenant — isolation via `agency_id` dans JWT |
| `User` | 23 | Agent immobilier, lié à une Agency |
| `Notification` | 20 | Alertes deal, campagnes, système |

**Multi-tenant** : `agency_id` injecté dans `request.state` par middleware JWT sur chaque requête.

---

## Modules clés et relations

- **Scrapers** → `BaseScraper` (ABC) ← `PapScraper`, `LeboncoinScraper`, `AutoScraper`
  - PAP : géocode via Nominatim + enrichit métros/écoles via Overpass
  - LBC : parse `__NEXT_DATA__` JSON, fallback HTML
  - `auto_scraper.py` orchestre tous les scrapers via APScheduler
- **Scoring** : `scoring.py` (DeepSeek) → fallback `scoring_heuristic.py` → résultat 1-10 sur `Deal`
- **Rental yield** : calcul `estimated_rent` + `gross_yield` par code postal/surface, appliqué sur tous les deals
- **Alertes** : `alert_service.py` vérifie les nouveaux deals vs seuils utilisateur → `Notification`
- **Documents** : `documents.py` (router) → `pdf_service.py` + `report_service.py` → .docx compromis/mandat/rapport

---

## Règles importantes

1. **Multi-tenant strict** : toujours filtrer par `agency_id` dans les queries. Ne jamais exposer les données cross-tenant.
2. **Migrations Alembic** : toujours créer une migration pour tout changement de modèle DB. Ne pas modifier les tables manuellement.
3. **Scrapers** : respecter les rate-limits (délai 2s min Nominatim, headers stealth LBC). Ne pas appeler les scrapers en dehors du scheduler sans raison.
4. **Scoring DeepSeek** : le fallback heuristique doit rester fonctionnel — ne pas le supprimer.
5. **License guard** : `LicenseGuard` côté frontend + `license.py` backend — vérifier la licence avant d'exposer les features premium.

---

## État actuel du projet (2026-04-28)

- Branch active : `claude`
- Derniers commits : phase-1 (Yousign), phase-2 (mandats Loi Hoguet), phase-3 (PWA mobile)
- Phases 1-3 complétées et poussées sur `claude`
- Nouvelles pages : `/signatures`, `/mandates`
- Nouvelles migrations Alembic : `c8d9e0f1a2b3` (Lead signature), `d9e0f1a2b3c4` (Mandate table)
- Blockers restants (phases D-H) : campagnes orphelines, notifications illisibles

---

## Graphify

Knowledge graph disponible dans `graphify-out/`.
- Consulter `graphify-out/GRAPH_REPORT.md` **uniquement** pour des questions d'architecture complexe ou de relations inter-modules non évidentes.
- Ne pas consulter par défaut pour des questions simples sur un fichier ou une fonction.
- Après modification de fichiers source : `graphify update .` (pas de coût API — AST uniquement).
- Si `graphify-out/wiki/index.md` existe, le naviguer plutôt que lire les fichiers bruts.

---

## Maintenance
- Après chaque session de dev, mettre à jour ce CLAUDE.md si :
  - Un nouveau fichier important a été créé
  - L'état du projet a changé (phase complétée, blocker résolu)
  - Une nouvelle règle importante est apparue
- Rester concis — pas de blabla, que des faits utiles
