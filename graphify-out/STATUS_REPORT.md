---
généré le : 2026-04-28
auteur    : Claude Code (audit automatique)
branche   : claude
---

```
┌─────────────────────────────────────────┐
│ ÉTAT DU PROJET AEVUM — Audit Complet    │
│ Date : 2026-04-18                       │
└─────────────────────────────────────────┘
```

---

## STRUCTURE DU PROJET

| Métrique                 | Valeur                  |
|--------------------------|-------------------------|
| Total fichiers code      | 84 (py + jsx + js)      |
| Total lignes de code     | ~8 776                  |
| Corpus graphify          | 85 fichiers · 127k mots |
| Graph : nœuds / arêtes   | 379 / 625               |
| Communautés détectées    | 57                      |

**Modules principaux :**
- `backend/api/` — 11 routers FastAPI (admin, deals, leads, alerts, chat, documents, trends, license, calendar, matching, onboarding)
- `backend/scrapers/` — PAP, Leboncoin, Auto, BaseScraper
- `backend/services/` — scoring (IA + heuristique), PDF, alerte, rendement locatif
- `backend/models.py` — 8 modèles : User, Deal, Agency, Lead, Alert, Notification, DealHistory, CalendarConfig, Campaign
- `src/pages/` — 11 pages React (Dashboard, Immobilier, AnalyseZone, Leads, Automation, Settings, CalendarSettings, Onboarding, AdminKPI, AdminAgencies, AdminPanel)
- `src/components/` — 12 composants (Layout, Sidebar, Header, Login, LicenseGuard, MatchingModal, MapComponent, OpportunityFeed, AgencyDetails, ConfigPanel, ChangePasswordModal, AdminPanel)

---

## PHASES COMPLÉTÉES (0–6)

| Phase | Intitulé                          | État      | Progression |
|-------|-----------------------------------|-----------|-------------|
| 0     | Migration Windows                 | ✅ Fait   | 100%        |
| 1     | Scrapers (PAP, Leboncoin, Auto)   | ✅ Fait   | 100%        |
| 2     | Scoring IA + rendement + alertes  | ✅ Fait   | 100%        |
| 3     | Cockpit / Dashboard complet       | ✅ Fait   | 100%        |
| 4     | Sécurité & conteneurisation       | ✅ Fait   | 100%        |
| 5     | Automation métier (PDF, chat IA)  | ✅ Fait   | 100%        |
| 6     | SaaS multi-tenant & verticales    | ✅ Fait   | 100%        |

**Commit de référence :** `ae4cec1` (phase-6)

---

## NOUVELLES PHASES (A–C) — COMPLÉTÉES

### Phase A — Portail Admin : Suspension / Réactivation agences
**Commit :** `6467172`

| Élément                                    | État |
|--------------------------------------------|------|
| `PUT /api/admin/agencies/{id}/status`      | ✅   |
| `DELETE /api/admin/agencies/{id}`          | ✅   |
| `GET /api/admin/agencies/stats`            | ✅   |
| `GET /api/admin/kpi`                       | ✅   |
| Page `/admin/agencies` (AdminAgencies.jsx) | ✅   |
| Page `/admin/kpi` (AdminKPI.jsx)           | ✅   |
| Affichage heartbeat + âge (staleness)      | ✅   |
| Boutons Activer / Suspendre / Révoquer     | ✅   |

**Progression : 100%**

---

### Phase B — Licence & Heartbeat
**Commit :** `760df2a`

| Élément                                     | État |
|---------------------------------------------|------|
| `POST /api/license/heartbeat`               | ✅   |
| `GET /api/license/info/{license_key}`       | ✅   |
| `Agency.license_key` (UUID auto)            | ✅   |
| `Agency.last_heartbeat`, `expires_at`       | ✅   |
| Hook `useLicense.js` (5 min polling)        | ✅   |
| Composant `LicenseGuard.jsx`                | ✅   |
| Blocage UI si `suspended` / `revoked`       | ✅   |
| `VITE_LICENSE_KEY` env var                  | ✅   |

**Progression : 100%**

---

### Phase C — Onboarding, Calendrier, Matching bien/clients
**Commit :** `d709265`

| Élément                                    | État |
|--------------------------------------------|------|
| `POST /api/onboarding/complete`            | ✅   |
| `GET /api/calendar/config`                 | ✅   |
| `PUT /api/calendar/config`                 | ✅   |
| `GET /api/matching/deals/{id}/leads`       | ✅   |
| Page `/onboarding` (wizard 4 étapes)       | ✅   |
| Page `/settings/calendar` (CalendarSettings)| ✅  |
| Composant `MatchingModal.jsx`              | ✅   |
| Modèle `CalendarConfig` (jours, horaires, pauses) | ✅ |

**Progression : 100%**

---

## NOUVELLES PHASES (1–3) — COMPLÉTÉES (2026-04-28)

### Phase 1 — Signature électronique (Yousign)
**Commit :** `12f6985`

| Élément                                           | État |
|---------------------------------------------------|------|
| `backend/services/yousign_service.py`             | ✅   |
| `POST /api/documents/deals/{id}/sign`             | ✅   |
| `GET /api/documents/sign/{id}/status`             | ✅   |
| `POST /api/documents/sign/webhook`                | ✅   |
| `GET /api/documents/signatures`                   | ✅   |
| Lead.signature_request_id + signature_status      | ✅   |
| Migration Alembic `c8d9e0f1a2b3`                  | ✅   |
| Mode simulation sans clé Yousign                  | ✅   |
| `Signatures.jsx` — liste demandes + relancer/annuler | ✅ |
| Bouton Signer + badge statut sur cartes Kanban    | ✅   |

**Progression : 100%**

---

### Phase 2 — Registre des mandats (Loi Hoguet)
**Commit :** `e473646`

| Élément                                           | État |
|---------------------------------------------------|------|
| Modèle `Mandate` (DB + migration `d9e0f1a2b3c4`)  | ✅   |
| `POST /api/mandates/` (mandate_number séquentiel) | ✅   |
| `GET /api/mandates/` (filtres type/statut)        | ✅   |
| `PUT /api/mandates/{id}` + `DELETE` (soft)        | ✅   |
| `GET /api/mandates/export` (CSV registre)         | ✅   |
| `POST /api/mandates/{id}/generate-pdf`            | ✅   |
| `mandate_service.py` — PDF .docx officiel numéroté | ✅  |
| `scheduler.py` — job expiration J-30 quotidien    | ✅   |
| `Mandates.jsx` — registre complet, badges expiration | ✅ |

**Progression : 100%**

---

### Phase 3 — PWA (Progressive Web App)
**Commit :** `5f0718e`

| Élément                                           | État |
|---------------------------------------------------|------|
| `vite-plugin-pwa` + workbox (NetworkFirst / CacheFirst) | ✅ |
| Icônes SVG 192×192 et 512×512 (AEVUM branding)   | ✅   |
| `index.html` — meta PWA + Apple mobile           | ✅   |
| `InstallPWA.jsx` — bannière install + dismiss 7j  | ✅   |
| `Header.jsx` — hamburger mobile (md:hidden)       | ✅   |
| `Sidebar.jsx` — drawer slide-in mobile + backdrop | ✅   |
| `Layout.jsx` — sidebarOpen state, InstallPWA global | ✅  |
| `Dashboard.jsx` — p-4 md:p-8, flex-wrap mobile    | ✅   |

**Progression : 100%**

---

## PHASES D–H — NON DÉMARRÉES

### Phase D — Notifications & Leads Notify
**Progression : 10% (modèle DB seulement)**

| Élément                                           | État |
|---------------------------------------------------|------|
| Modèle `Notification` (DB)                        | ✅   |
| `POST /api/leads/notify`                          | ❌   |
| `GET /api/notifications` (liste non-lues)         | ❌   |
| `PUT /api/notifications/{id}/read`                | ❌   |
| Centre de notifs dans Header / Sidebar            | ❌   |
| Badge compteur notifications non lues             | ❌   |

> **Note :** `MatchingModal.jsx` appelle `POST /api/leads/notify` — la route n'existe pas encore en backend. Cela plantera au runtime.

---

### Phase E — Campagnes email/SMS (Campaign)
**Progression : 5% (modèle DB seulement)**

| Élément                                           | État |
|---------------------------------------------------|------|
| Modèle `Campaign` (DB) — type, status, scheduled_at | ✅ |
| `POST /api/campaigns/`                            | ❌   |
| `GET /api/campaigns/`                             | ❌   |
| `PUT /api/campaigns/{id}/send`                    | ❌   |
| Page `/campaigns` (frontend)                      | ❌   |
| Intégration email (SMTP / SendGrid)               | ❌   |
| Intégration SMS (Twilio / autre)                  | ❌   |

---

### Phase F — Chat Widget Embeddable (client-side)
**Progression : 15% (snippet affiché, fichier absent)**

| Élément                                           | État |
|---------------------------------------------------|------|
| Snippet `<script>` affiché dans Onboarding        | ✅   |
| Fichier `chat-widget.js` (build séparé)           | ❌   |
| Widget flottant injectible sur site tiers         | ❌   |
| Auth par `data-key` (license_key)                 | ❌   |
| Qualification lead via chat DeepSeek              | ❌   |
| `POST /api/chat/widget` (sans JWT)                | ❌   |

---

### Phase G — Pipeline CRM & Reporting avancé
**Progression : 0%**

| Élément                                           | État |
|---------------------------------------------------|------|
| Vue pipeline Kanban (statuts lead)                | ❌   |
| Statistiques pipeline par commercial              | ❌   |
| Export CSV / Excel des leads                      | ❌   |
| Graphiques conversion (Recharts / Chart.js)       | ❌   |
| Rapport mensuel agence (PDF)                      | ❌   |

---

### Phase H — Synchronisation Calendrier Externe (iCal / Google)
**Progression : 5% (champ DB seulement)**

| Élément                                           | État |
|---------------------------------------------------|------|
| `CalendarConfig.calendar_url` (iCal link, DB)     | ✅   |
| Parser iCal (icalendar / ics.py)                  | ❌   |
| Sync GET `/api/calendar/slots` (disponibilités)   | ❌   |
| Booking public `POST /api/calendar/book`          | ❌   |
| Interface prise de RDV client                     | ❌   |
| Lien Google Calendar OAuth                        | ❌   |

---

## GOD NODES (fichiers critiques — plus de dépendances)

| Nœud                        | Edges | Rôle                                     |
|-----------------------------|-------|------------------------------------------|
| `Deal` (models.py)          | 32    | Entité centrale, toutes features passent par là |
| `PapScraper`                | 28    | Bridge scraping ↔ scheduler ↔ alertes   |
| `LeboncoinScraper`          | 23    | Idem PAP, plus parsing __NEXT_DATA__     |
| `Lead` (models.py)          | 19    | Entité CRM, matching, pipeline           |
| `BaseScraper`               | 19    | Contrat commun tous les scrapers         |
| `Notification` (models.py)  | 17    | Alertes + notify leads (partiellement branché) |
| `AutoScraper`               | 17    | Orchestrateur auto (planification)       |
| `User` (models.py)          | 16    | Auth, rôles, agency_id, alert_threshold  |

---

## POINTS DE BLOCAGE DÉTECTÉS

1. **`POST /api/leads/notify` manquant** — appelé depuis `MatchingModal.jsx` mais absent du backend. Toute tentative de notification lead plantera avec HTTP 404/405.

2. **`chat-widget.js` inexistant** — l'Onboarding affiche le snippet mais le fichier ne sera jamais servi. Le widget client est non fonctionnel.

3. **Campagnes orphelines** — le modèle `Campaign` est en DB mais aucune API ni page n'existe. La table est créée mais inutilisable.

4. **Notifications non lisibles** — le modèle `Notification` est écrit (et des notifs sont insérées par le scheduler), mais il n'y a aucun endpoint pour les lire, marquer comme lues, ou les afficher dans l'UI.

5. **Calendrier iCal non implémenté** — `calendar_url` est stocké mais jamais parsé. Le système de créneaux/booking public n'existe pas.

---

## RÉCAPITULATIF PROGRESSION

| Phase     | Intitulé                          | Progression |
|-----------|-----------------------------------|-------------|
| 0–6       | Phases initiales                  | ✅ 100%    |
| A         | Portail Admin / Suspension        | ✅ 100%    |
| B         | Licence & Heartbeat               | ✅ 100%    |
| C         | Onboarding / Calendrier / Matching| ✅ 100%    |
| D         | Notifications & Leads Notify      | ❌ 10%     |
| E         | Campagnes email/SMS               | ❌ 5%      |
| F         | Chat Widget Embeddable            | ❌ 15%     |
| G         | Pipeline CRM & Reporting          | ❌ 0%      |
| H         | Sync Calendrier Externe           | ❌ 5%      |

---

## TOKENS À ÉCONOMISER (pour les phases D–H)

- **Ne pas réécrire** : models.py (stable), auth.py, scheduler.py, BaseScraper
- **Partir de** : `backend/api/leads.py` pour ajouter `POST /notify`
- **Partir de** : `backend/api/admin.py` pour le pattern CRUD campaigns
- **Partir de** : `src/pages/Automation.jsx` pour ajouter la page Campagnes
- **Partir de** : `src/components/MatchingModal.jsx` pour le pattern modale leads
- **Fichier le plus risqué à modifier** : `backend/models.py` (32 dépendances sur Deal)
- **Migration Alembic requise pour** : phases E (Campaign API), H (booking slots table)
