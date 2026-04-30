# Design — Gestion locative + Suivi post-compromis

**Date :** 2026-04-30  
**Branche :** claude  
**Auteur :** Noa + Claude

---

## Contexte

AEVUM doit intégrer deux fonctionnalités pour atteindre le niveau des concurrents à 449€/mois :
1. **Gestion locative** — suivi des baux, loyers, quittances, relances impayés
2. **Suivi post-compromis** — checklist légale automatique de la signature compromis à l'acte authentique

---

## Audit — État des lieux au 2026-04-30

### Déjà fait (backend)

| Élément | Fichier |
|---------|---------|
| Modèles Rental, RentalPayment, RentalDocument | `backend/models.py` |
| Migration Rental | `alembic/versions/e0f1a2b3c4d5` |
| Router `/api/rentals/*` complet | `backend/api/rentals.py` |
| Service rental (PDF quittance, rapport proprio, relances) | `backend/services/rental_service.py` |
| Jobs scheduler loyer (1er du mois, J+5/10/15) | `backend/scheduler.py` |
| Modèle PostSaleStep | `backend/models.py` |

### Reste à faire

| Élément | Fichier cible |
|---------|--------------|
| Migration Alembic PostSaleStep | `alembic/versions/f1a2b3c4d5e6_add_post_sale_step.py` |
| 5 routes post-sale | `backend/api/deals.py` |
| Job scheduler post-sale (J-7/J-3/J-1 + overdue) | `backend/scheduler.py` |
| Page Rentals.jsx | `src/pages/Rentals.jsx` |
| Entrée /rentals dans Sidebar avec badge impayés | `src/components/Sidebar.jsx` |
| Onglet post-sale dans panneau deal | `Dashboard.jsx` ou `OpportunityFeed.jsx` |
| Badge "Suivi actif" sur cartes deals | `Dashboard.jsx`, `Immobilier.jsx` |

---

## Feature 1 — Gestion locative

### Modèles (existants)

```python
Rental: id, agency_id (FK), deal_id (FK, Optional), tenant_name, tenant_email,
        tenant_phone, monthly_rent, charges, deposit, start_date, end_date,
        notice_period_days (default=90), status (active|terminated), created_at

RentalPayment: id, rental_id (FK), month (1er du mois), amount, paid_date,
               status (pending|paid|late|partial), reminder_sent_dates (JSON), created_at

RentalDocument: id, rental_id (FK), doc_type (inventory_in|inventory_out|receipt),
                file_path, uploaded_at
```

### Routes (existantes dans `/api/rentals/*`)

```
GET    /api/rentals/                          → liste locations agence (filter status)
POST   /api/rentals/                          → créer location
GET    /api/rentals/{id}                      → détail
PUT    /api/rentals/{id}                      → modifier
DELETE /api/rentals/{id}                      → terminer bail (status=terminated)
GET    /api/rentals/{id}/payments             → liste paiements
POST   /api/rentals/{id}/payments/{pid}/mark-paid → marquer payé
POST   /api/rentals/{id}/generate-receipt/{month} → PDF quittance
POST   /api/rentals/{id}/send-reminder/{pid}  → email relance manuel
GET    /api/rentals/{id}/report/{year}/{month} → PDF rapport proprio
POST   /api/rentals/{id}/documents            → upload état des lieux
GET    /api/rentals/{id}/documents            → liste documents
```

### Jobs scheduler (existants)

- `rental_payments_job` — CronTrigger, 1er du mois 07h00 UTC
- `rental_reminder_5_job` — CronTrigger, 5 du mois 09h00 UTC
- `rental_reminder_10_job` — CronTrigger, 10 du mois 09h00 UTC
- `rental_reminder_15_job` — CronTrigger, 15 du mois 09h00 UTC

### Frontend — `src/pages/Rentals.jsx`

Pattern : copié sur `Mandates.jsx`.

**Structure :**
- Header : titre "Gestion locative" + bouton "Nouvelle location"
- Filtres : statut (active/terminated) + recherche texte (locataire, adresse)
- Tableau : Locataire | Bien | Loyer | Statut bail | Paiement en cours | Actions
- Lignes avec paiement `late` ou `partial` : badge rouge
- Clic ligne → drawer droite 4 onglets

**Drawer détail (4 onglets) :**

| Onglet | Contenu |
|--------|---------|
| Infos | Locataire (nom/email/tél), loyer+charges+dépôt, dates bail, bouton Modifier |
| Paiements | Timeline mensuelle (payé ✅ / impayé 🔴 / à venir ⬜), Marquer payé, Générer quittance, Relancer |
| Documents | Liste fichiers (états des lieux, quittances), Upload |
| Rapport | Bouton "Générer rapport mensuel" → download PDF proprio |

**Modal "Nouvelle location" :**
- Champ optionnel "Associer à un deal" (dropdown searchable des deals de l'agence)
- Si deal sélectionné → pré-remplit adresse + surface
- Champs : locataire (nom/email/tél), loyer mensuel, charges, dépôt, dates bail

**Sidebar :**
- Icône `HomeModernIcon`
- Label "Gestion locative"
- Badge rouge = count paiements `late` ou `partial` de l'agence

---

## Feature 2 — Suivi post-compromis

### Modèle (existant)

```python
PostSaleStep: id, deal_id (FK), step_name, step_order (1-7), due_date,
              completed_date, status (pending|completed|overdue),
              notes, created_at, updated_at
```

### Template des 7 étapes (J = date compromis)

| # | Étape | Délai |
|---|-------|-------|
| 1 | Délai rétractation acheteur | J+10 |
| 2 | Diagnostics techniques validés | J+30 |
| 3 | Obtention financement acheteur | J+45 |
| 4 | Levée conditions suspensives | J+60 |
| 5 | Dépôt garantie chez notaire | J+70 |
| 6 | Convocation signature définitive | J+75 |
| 7 | Signature acte authentique | J+90 |

### Routes à créer dans `deals.py`

```
POST  /api/deals/{id}/start-post-sale
      body: { compromise_date: "YYYY-MM-DD" }
      → crée les 7 PostSaleStep avec dates calculées

GET   /api/deals/{id}/post-sale-steps
      → liste étapes avec statuts

PUT   /api/deals/{id}/post-sale-steps/{step_id}/complete
      → completed_date = today, status = completed

PUT   /api/deals/{id}/post-sale-steps/{step_id}/postpone
      body: { new_due_date: "YYYY-MM-DD", reason: str }
      → met à jour due_date, ajoute reason dans notes

GET   /api/deals/{id}/post-sale-timeline
      → étapes + % avancement + jours restants par étape
```

### Job scheduler à créer

Job quotidien `post_sale_alerts_job` à 08h00 UTC :
- Parcourt tous `PostSaleStep` avec status `pending`
- Envoie `Notification` in-app pour J-7, J-3, J-1 (1 notification par étape, pas de doublon)
- Passe `status = overdue` si `due_date < today`

### Frontend — Onglet dans panneau deal

Intégré directement dans le panneau de détail deal existant (Dashboard/OpportunityFeed), sans extraction de composant.

**Si suivi non démarré :**
- Bouton "Démarrer le suivi post-compromis"
- Champ date compromis (date picker)

**Si suivi actif :**
- Barre de progression : "4/7 étapes — 57%"
- Liste des 7 étapes :
  - Badge statut : `pending` (gris) / `completed` (vert) / `overdue` (rouge)
  - Date échéance + countdown ("dans X jours" / "dépassé depuis X jours")
  - Checkbox "Marquer complété"
  - Bouton "Reporter" → mini-modal (nouvelle date + raison)
  - Note inline (sauvegarde au blur)

**Badges sur cartes deals :**
- Dashboard (flux AEVUM) + Immobilier : badge bleu "Suivi actif" si `PostSaleStep` existent pour le deal

---

## Approche choisie

**Option A — Minimal inline** : aucune refacto, pattern `Mandates.jsx` réutilisé, modification minimale du code existant (Dashboard, Immobilier).

---

## Checklist de validation finale

- [ ] Migration Alembic `PostSaleStep` créée et appliquée
- [ ] 5 routes post-sale dans `deals.py` fonctionnelles
- [ ] Job `post_sale_alerts_job` configuré dans `scheduler.py`
- [ ] `Rentals.jsx` accessible avec données réelles
- [ ] Sidebar `/rentals` avec badge impayés
- [ ] Onglet post-sale dans panneau deal (Dashboard/OpportunityFeed)
- [ ] Badge "Suivi actif" sur cartes (Dashboard + Immobilier)
- [ ] `npm run build` → 0 erreur
- [ ] `pytest backend/tests/ -v` → 0 erreur
