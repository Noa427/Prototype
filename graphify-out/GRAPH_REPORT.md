# Graph Report - .  (2026-04-27)

## Corpus Check
- 121 files · ~161,482 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 652 nodes · 1027 edges · 86 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 305 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_AEVUM Core Architecture|AEVUM Core Architecture]]
- [[_COMMUNITY_Scraping & Alerts Pipeline|Scraping & Alerts Pipeline]]
- [[_COMMUNITY_Auth & API Routes|Auth & API Routes]]
- [[_COMMUNITY_BaseScraper & Yield Calculation|BaseScraper & Yield Calculation]]
- [[_COMMUNITY_Geocoding & PAP Extraction|Geocoding & PAP Extraction]]
- [[_COMMUNITY_Admin Agency Management|Admin Agency Management]]
- [[_COMMUNITY_Project Specs & Bug Reports|Project Specs & Bug Reports]]
- [[_COMMUNITY_React Frontend Shell|React Frontend Shell]]
- [[_COMMUNITY_Calendar & Booking|Calendar & Booking]]
- [[_COMMUNITY_Dashboard & Deal UI|Dashboard & Deal UI]]
- [[_COMMUNITY_Campaigns & EmailSMS|Campaigns & Email/SMS]]
- [[_COMMUNITY_LBC Scraper & Dedup|LBC Scraper & Dedup]]
- [[_COMMUNITY_Documents & PDF Generation|Documents & PDF Generation]]
- [[_COMMUNITY_Graphify Knowledge Graph|Graphify Knowledge Graph]]
- [[_COMMUNITY_Phase Plan (YousignMandatesPWA)|Phase Plan (Yousign/Mandates/PWA)]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `Deal` - 42 edges
2. `Lead` - 30 edges
3. `PapScraper` - 29 edges
4. `Agency` - 26 edges
5. `LeboncoinScraper` - 24 edges
6. `Notification` - 21 edges
7. `User` - 20 edges
8. `BaseScraper` - 19 edges
9. `AutoScraper` - 18 edges
10. `session()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `get_session()` --calls--> `session()`  [INFERRED]
  backend\database.py → C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto\backend\tests\test_seed_smoke.py
- `Estimates monthly rent based on postal code and surface.` --uses--> `Deal`  [INFERRED]
  backend\services\rental_yield.py → C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto\backend\models.py
- `Calculates and updates estimated_rent and gross_yield for a deal.` --uses--> `Deal`  [INFERRED]
  backend\services\rental_yield.py → C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto\backend\models.py
- `Updates estimated_rent and gross_yield for all deals in the database.` --uses--> `Deal`  [INFERRED]
  backend\services\rental_yield.py → C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto\backend\models.py
- `Calculates a score from 1 to 10 for a deal using DeepSeek AI.` --uses--> `Deal`  [INFERRED]
  backend\services\scoring.py → C:\Users\noapa\Documents\NOA_S_I_M\antigravity-proto\backend\models.py

## Hyperedges (group relationships)
- **Backend Auth Stack (FastAPI + Passlib + Python-Jose + Bcrypt)** — requirements_fastapi, requirements_passlib, requirements_python_jose, requirements_bcrypt [INFERRED 0.85]
- **Backend DB Stack (SQLAlchemy + SQLModel + Alembic + Psycopg2)** — requirements_sqlalchemy, requirements_sqlmodel, requirements_alembic, requirements_psycopg2 [INFERRED 0.90]
- **Scraping Libraries (Requests + HTTPX + BeautifulSoup4 + lxml)** — requirements_requests, requirements_httpx, requirements_beautifulsoup4, requirements_lxml [INFERRED 0.85]
- **Geo Enrichment Libraries (Geopy + Overpy)** — requirements_geopy, requirements_overpy [INFERRED 0.90]
- **Phases D through H Implementation Plan Set** — plan_phase_d_notifications, plan_phase_e_campaigns, plan_phase_f_chat_widget, plan_phase_g_crm_reporting, plan_phase_h_calendar_sync [EXTRACTED 1.00]
- **Phases D-H Critical Blockers** — status_blocker_missing_leads_notify, status_blocker_missing_chat_widget_js, status_blocker_orphan_campaigns, status_blocker_unreadable_notifications, status_blocker_ical_not_implemented [EXTRACTED 1.00]
- **Real Estate Portal Scraper Targets** — debug_scraper_target_pap, debug_scraper_target_bienici, debug_scraper_target_leboncoin [INFERRED 0.90]
- **Real Estate Portal Scraping Targets** — test_pap_screenshot, test_seloger_screenshot, pap_portal, seloger_portal [INFERRED 0.90]
- **Application Branding Assets** — favicon_svg, hero_png, icons_svg [INFERRED 0.80]
- **Frontend Toolchain (React + Vite) Assets** — react_svg, vite_svg [INFERRED 0.85]
- **Phases D-H Critical Blockers** — claude_md_blockers_phases_dh, plan_features_critiques, spec_seed_branch_constraint [INFERRED 0.75]
- **Seed Demo Data Pipeline (Agency â†’ User â†’ Deals â†’ Leads â†’ Notifications â†’ Campaigns â†’ Alerts)** — plan_seed_task3_agency_user, plan_seed_task4_deals, plan_seed_task5_leads, plan_seed_task6_notifs_campaigns_alerts, plan_seed_script, plan_seed_smoke_test [EXTRACTED 1.00]
- **Frontend Bugfixes Set (Immobilier + Settings + MatchingModal + Campaigns)** — plan_bugfixes_task2_detail_btn, plan_bugfixes_task3_call_btn, plan_bugfixes_task4_settings, plan_bugfixes_task5_matching, plan_bugfixes_task6_campaigns [EXTRACTED 1.00]
- **Admin API Keys Feature Stack (Agency model + Alembic + admin.py + AdminPanel.jsx)** — plan_bugfixes_filemap_models, plan_bugfixes_filemap_alembic, plan_bugfixes_filemap_admin_py, plan_bugfixes_filemap_adminpanel, spec_bugfixes_arch_decision_agency_keys [EXTRACTED 1.00]
- **3 Critical Features for 449â‚¬/month (Yousign + Mandates + PWA)** — plan_features_phase1_yousign, plan_features_phase2_mandates, plan_features_phase3_pwa, plan_features_pricing_rationale [EXTRACTED 1.00]

## Communities

### Community 0 - "AEVUM Core Architecture"
Cohesion: 0.04
Nodes (68): AEVUM Project (Real Estate SaaS CRM), Agency (God Node â€” 28 edges, multi-tenant), Alert Service (deal thresholds â†’ Notification), AutoScraper (APScheduler orchestrator), BaseScraper (ABC + dedup), Phases D-H Critical Blockers, Deal (God Node â€” 45 edges), DeepSeek Fallback Heuristic Rule (+60 more)

### Community 1 - "Scraping & Alerts Pipeline"
Cohesion: 0.1
Nodes (54): Checks new deals against active alerts and user thresholds., Sends a notification to the user (Email)., AutoScraper, Scraper pour les annonces automobiles LeBonCoin., BaseModel, BaseScraper, Page de prise de RDV publique : /booking/{license_key} HTML standalone sans auth, book_slot() (+46 more)

### Community 2 - "Auth & API Routes"
Cohesion: 0.05
Nodes (25): authenticate_user(), create_access_token(), get_password_hash(), verify_password(), create_db_and_tables(), get_session(), export_deals(), get_deals_statement() (+17 more)

### Community 3 - "BaseScraper & Yield Calculation"
Cohesion: 0.08
Nodes (29): ABC, trigger_update_yields(), check_new_deals_for_alerts(), send_alert_notification(), Scraper automobile LeBonCoin. Réutilise le pattern __NEXT_DATA__ de LeboncoinScr, BaseScraper, parse(), Scraper pour Leboncoin – annonces immobilières (vente).      Leboncoin utilise d (+21 more)

### Community 4 - "Geocoding & PAP Extraction"
Cohesion: 0.07
Nodes (21): get_coordinates(), Géocode une adresse via Nominatim avec rate-limiting (2 s min entre requêtes)., Tente d'extraire, par ordre de précision décroissante :           1. Adresse com, Leboncoin injecte les annonces dans __NEXT_DATA__ (JSON).         On tente de le, Parse une annonce depuis le JSON __NEXT_DATA__., Parse une annonce depuis le HTML brut (fallback)., Override pour ajouter un délai aléatoire et des headers Leboncoin., get_nearby_amenities() (+13 more)

### Community 5 - "Admin Agency Management"
Cohesion: 0.07
Nodes (28): create_agency(), delete_agency(), download_agency_report(), get_admin_config(), get_agencies_stats(), get_agency_users(), get_sales_kpis(), Super-admin : crée une nouvelle agence. (+20 more)

### Community 6 - "Project Specs & Bug Reports"
Cohesion: 0.09
Nodes (30): AEVUM Project (Real Estate SaaS CRM), FastAPI Backend Architecture, React/Vite Frontend Architecture, BUG 1: Missing POST /api/leads/notify, BUG 2: chat-widget.js Missing, Phase D: Notifications, Phase E: Campagnes Email/SMS, Phase F: Chat Widget Embeddable (+22 more)

### Community 7 - "React Frontend Shell"
Cohesion: 0.11
Nodes (8): ProtectedRoute(), useAuth(), Header(), Layout(), Onboarding(), Reporting(), Settings(), Sidebar()

### Community 8 - "Calendar & Booking"
Cohesion: 0.16
Nodes (16): _get_agency(), _get_cfg(), public_booking_page(), _config_to_dict(), get_calendar_config(), get_slots(), save_calendar_config(), _fetch_ical() (+8 more)

### Community 9 - "Dashboard & Deal UI"
Cohesion: 0.11
Nodes (2): DealDetailPanel(), getScoreColor()

### Community 10 - "Campaigns & Email/SMS"
Cohesion: 0.19
Nodes (11): login(), create_campaign(), list_campaigns(), send_campaign(), _serialize(), book_slot(), chat_widget(), _get_agency() (+3 more)

### Community 11 - "LBC Scraper & Dedup"
Cohesion: 0.19
Nodes (8): apply_stealth(), deduplicate_deals(), Applique des scripts de furtivité manuels pour bypasser les détections simples., run_all_scrapers(), scrape_bienici(), scrape_lbc(), scrape_pap(), scrape_seloger()

### Community 12 - "Documents & PDF Generation"
Cohesion: 0.26
Nodes (10): generate_listing(), pdf_compromis(), pdf_mandat(), generate_compromis(), generate_mandat(), _header(), Génération de documents Word (.docx) pour compromis de vente et mandat de recher, Génère un compromis de vente simplifié au format .docx.     deal: modèle Deal OR (+2 more)

### Community 13 - "Graphify Knowledge Graph"
Cohesion: 0.17
Nodes (12): Graphify Rules (CLAUDE.md), Graph Report â€” AEVUM (2026-04-19), Community: Admin API Endpoints, Community: Auth & Communications, Community: Dashboard & Deal Management, Community: License Guard, Community: PDF Document Generation, Community: AI Deal Scoring (+4 more)

### Community 14 - "Phase Plan (Yousign/Mandates/PWA)"
Cohesion: 0.17
Nodes (12): Plan: 3 Features Critiques (2026-04-20), Component: src/components/InstallPWA.jsx, Model: Mandate (Loi Hoguet registry), Service: backend/services/mandate_service.py, Page: src/pages/Mandates.jsx, Phase 1: Yousign Electronic Signature, Phase 2: Registre LÃ©gal des Mandats (Loi Hoguet), Phase 3: PWA Mobile (vite-plugin-pwa + workbox) (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (1): Smoke test — vérifie que seed_demo a bien créé les données attendues.

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (3): _pg_connect(), test_db_deal_table(), test_db_user_table()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (7): Leboncoin Bot Detection Block, GDPR Cookie Consent Modal, PAP Listing Page (Paris), PAP Listing Page v2 (Paris), Bien'ici Scraper Target, Leboncoin Scraper Target (Blocked), PAP.fr Scraper Target

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.6
Nodes (3): computeSlots(), DayTimeline(), MiniCalendar()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (5): @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC), Rationale: React Compiler Disabled for Dev/Build Performance, React + Vite Template, TypeScript + ESLint Recommendation for Production Apps

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (5): SQLModel ORM Layer, Alembic (1.18.4), Psycopg2-binary (2.9.11), SQLAlchemy (2.0.49), SQLModel (0.0.38)

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (1): merge_heads  Revision ID: 06f05fe2bd0a Revises: 4f72017327b0, b3c4d5e6f7a8 C

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (1): add estimated_rent to deal  Revision ID: 2451d1770fd3 Revises: c1cb9c096002

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (1): add agency_id to user and assigned_to to lead  Revision ID: 332dbbb934fd Revi

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (1): add_vertical_and_auto_fields_to_deal  Revision ID: 4f72017327b0 Revises: fefc

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (1): add_dealhistory_and_is_active  Revision ID: 56683a11e664 Revises: 332dbbb934f

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): add_agency_api_keys  Revision ID: 6440dba64c97 Revises: 82e92e77ba07 Create

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): add alert_threshold to user  Revision ID: 7c738a4cda96 Revises: 2451d1770fd3

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): add_demo_fields_lead_notification  Revision ID: 82e92e77ba07 Revises: 06f05fe

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (1): add license fields to agency  Revision ID: a1b2c3d4e5f6 Revises: fefc144a426c Cr

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (1): add calendar config  Revision ID: b3c4d5e6f7a8 Revises: a1b2c3d4e5f6 Create Date

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): Add Notification model  Revision ID: fefc144a426c Revises: 56683a11e664 Crea

### Community 34 - "Community 34"
Cohesion: 0.83
Nodes (3): addMsg(), handleSend(), sendToBackend()

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (2): LicenseGuard(), useLicense()

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (2): install_dependencies(), Installe les dépendances nécessaires

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (4): PAP Real Estate Portal (Particulier a Particulier), SeLoger Real Estate Portal, PAP (Particulier Ã  Particulier) Scraping Debug Screenshot, SeLoger Scraping Block Debug Screenshot

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (2): Calculates a score from 1 to 10 for a deal using simple heuristics., score_deal()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): main(), test_source()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (3): Antigravity App Favicon (Lightning Bolt Logo), Hero Image - Layered Isometric Panels (Antigravity Concept), UI Icon Sprite Sheet (Social and Nav Icons)

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (2): React Framework Logo, Vite Build Tool Logo

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): Pydantic (2.12.5)

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): APScheduler (3.11.2)

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Passlib (1.7.4)

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Bcrypt (3.2.0)

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): Python-Jose (3.5.0)

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): HTTPX (0.28.1)

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Requests (2.33.1)

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): BeautifulSoup4 (4.14.3)

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): lxml (6.0.4)

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): Geopy (2.4.1)

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): Overpy (0.7)

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): Pytest (9.0.3)

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): Python-docx (1.2.0)

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): PyYAML (6.0.3)

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Bien'ici Map-Based Listing (Paris)

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Alembic Migration Rule

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): Scraper Rate-Limit Rule (2s Nominatim, stealth LBC)

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): License Guard Rule (frontend + backend)

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): Communities Overview (Graphify)

## Knowledge Gaps
- **118 isolated node(s):** `merge_heads  Revision ID: 06f05fe2bd0a Revises: 4f72017327b0, b3c4d5e6f7a8 C`, `add estimated_rent to deal  Revision ID: 2451d1770fd3 Revises: c1cb9c096002`, `add agency_id to user and assigned_to to lead  Revision ID: 332dbbb934fd Revi`, `add_vertical_and_auto_fields_to_deal  Revision ID: 4f72017327b0 Revises: fefc`, `add_dealhistory_and_is_active  Revision ID: 56683a11e664 Revises: 332dbbb934f` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 49`** (2 nodes): `AgencyDetails()`, `AgencyDetails.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `ConfigPanel()`, `ConfigPanel.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `Login.jsx`, `Login()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `MatchingModal.jsx`, `MatchingModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `OpportunityFeed()`, `OpportunityFeed.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `Immobilier.jsx`, `Immobilier()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `Security()`, `Security.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `React Framework Logo`, `Vite Build Tool Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `test_db.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `api.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Pydantic (2.12.5)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `APScheduler (3.11.2)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Passlib (1.7.4)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Bcrypt (3.2.0)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Python-Jose (3.5.0)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `HTTPX (0.28.1)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Requests (2.33.1)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `BeautifulSoup4 (4.14.3)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `lxml (6.0.4)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `Geopy (2.4.1)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `Overpy (0.7)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `Pytest (9.0.3)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `Python-docx (1.2.0)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `PyYAML (6.0.3)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Bien'ici Map-Based Listing (Paris)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Alembic Migration Rule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `Scraper Rate-Limit Rule (2s Nominatim, stealth LBC)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `License Guard Rule (frontend + backend)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `Communities Overview (Graphify)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PapScraper` connect `Geocoding & PAP Extraction` to `LBC Scraper & Dedup`, `Scraping & Alerts Pipeline`, `BaseScraper & Yield Calculation`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Deal` connect `Scraping & Alerts Pipeline` to `Community 43`, `BaseScraper & Yield Calculation`, `Admin Agency Management`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `scrape_pap()` connect `LBC Scraper & Dedup` to `BaseScraper & Yield Calculation`, `Geocoding & PAP Extraction`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `Deal` (e.g. with `UserPreferencesUpdate` and `Injecte tenant_id (agency_id) dans request.state depuis le JWT cookie.`) actually correct?**
  _`Deal` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `Lead` (e.g. with `Fonction exécutée périodiquement pour scraper PAP.` and `Vérifie les alertes pour les deals récents (dernières 24h).`) actually correct?**
  _`Lead` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `PapScraper` (e.g. with `Fonction exécutée périodiquement pour scraper PAP.` and `Vérifie les alertes pour les deals récents (dernières 24h).`) actually correct?**
  _`PapScraper` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `Agency` (e.g. with `UserPreferencesUpdate` and `Injecte tenant_id (agency_id) dans request.state depuis le JWT cookie.`) actually correct?**
  _`Agency` has 24 INFERRED edges - model-reasoned connections that need verification._