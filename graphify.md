# Graphify — AEVUM (2026-04-20)

> Généré depuis `graphify-out/GRAPH_REPORT.md`  
> 532 nodes · 905 edges · 77 communities · 109 fichiers

## God Nodes (abstractions centrales)
| Node | Edges |
|------|-------|
| Deal | 45 |
| Lead | 33 |
| PapScraper | 29 |
| Agency | 28 |
| LeboncoinScraper | 24 |
| User | 23 |
| Notification | 20 |
| BaseScraper | 19 |
| AutoScraper | 18 |

## Stack technique
- **Backend:** FastAPI · SQLModel/SQLAlchemy · Alembic · Pydantic · APScheduler
- **Auth:** Passlib · Bcrypt · Python-Jose JWT
- **Scraping:** Requests · HTTPX · BeautifulSoup4 · lxml
- **Geo:** Geopy (Nominatim) · Overpy (OSM)
- **Docs:** Python-docx
- **Frontend:** React + Vite (Oxc/SWC)

## Communities clés
- Admin API Endpoints / Admin API Docstrings
- Auth & Communications
- Dashboard & Deal Management
- Kanban Leads View
- Alerts & Auto Scraping
- AI Deal Scoring + Deal Scoring (Heuristic)
- Booking & Calendar API / Calendar Settings UI
- Campaign Management UI
- Public Chat Widget
- PDF Document Generation
- Agency Report Service
- Admin KPI Dashboard
- Geolocation & Map Services
- Zone Analysis Charts
- License Guard
- Scraper Utilities / Scraping Debug Views
- DB Migrations (10 migrations Alembic)
