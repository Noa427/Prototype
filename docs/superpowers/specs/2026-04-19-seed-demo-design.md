# Spec — Seed données démo AEVUM

**Date :** 2026-04-19
**Branche :** claude (jamais merger sur main)
**Approche choisie :** 1 — Extension minimale + SQLModel direct

---

## Contexte

Le script génère des données de démonstration réalistes pour montrer AEVUM à des prospects agents immobiliers. Tout doit paraître 100% professionnel et cohérent avec le marché immobilier lyonnais/parisien.

---

## 1. Extensions de modèles

### `Lead` — 3 champs ajoutés

```python
notes: Optional[str] = None
score_chaleur: int = Field(default=5)
created_at: datetime = Field(default_factory=datetime.utcnow)
```

Statuts étendus : `"new"`, `"contacted"`, `"qualified"`, `"rdv_pris"`, `"offre"`, `"signé"`, `"lost"`

### `Notification` — deal_id rendu optionnel

```python
deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
```

### Migration Alembic

Une migration autogénérée : `alembic revision --autogenerate -m "add_demo_fields_lead_notification"`

---

## 2. Compte démo

| Champ | Valeur |
|---|---|
| Agency | Agence Dupont Immobilier |
| Location | Lyon |
| Status | active |
| User agent username | thomas.dupont |
| User agent email | agent@demo-aevum.fr |
| User agent password | Demo2026! |
| User agent rôle | client |

---

## 3. Script `backend/scripts/seed_demo.py`

### Invocation

```bash
python backend/scripts/seed_demo.py          # insert si inexistant
python backend/scripts/seed_demo.py --reset  # supprime tout démo et recrée
```

### Flow d'exécution

1. Détecter si `Agency.name == "Agence Dupont Immobilier"` existe
   - Si oui et pas `--reset` → afficher message et quitter
   - Si `--reset` → supprimer toutes les données liées (leads, deals, notifs, campaigns, alerts, users, agency)
2. Créer Agency → récupérer `agency.id`
3. Créer User agent Thomas Dupont (lié à agency)
4. Créer 20 Deals (liés à agency)
5. Créer 15 Leads (chacun lié à un deal distinct)
6. Créer 8 Notifications (mix deal-liées et standalone)
7. Créer 3 Campaigns
8. Créer 5 Alerts (liées au user agent)
9. Afficher résumé

### Idempotence

Détection sur `Agency.name`. Pas d'upsert granulaire — tout ou rien.

---

## 4. Données générées

### 20 Deals

Répartition :
- 8 appartements Lyon (3e, 6e, 7e)
- 4 maisons banlieue (Villeurbanne, Caluire, Décines)
- 4 appartements Paris (11e, 13e, 20e)
- 2 studios étudiants Lyon (22–28 m²)
- 2 biens signal faible ("succession" / "départ rapide" dans description)

Contraintes :
- 3 biens avec `aevum_score >= 9` (pépites dashboard)
- DPE réaliste : 2A, 3B, 5C, 5D, 3E, 2F
- Prix Lyon : 3 500–5 500 €/m²  |  Paris : 8 000–12 000 €/m²
- `url` fictif unique : `"https://pap.fr/annonce/demo-{slug}"` / LBC / BienIci
- `timestamp` échelonné sur les 30 derniers jours
- `price_per_m2` calculé (price // surface)
- `vertical = "immo"` pour tous

Champs non disponibles dans le modèle actuel (non générés) : `title`, `source` — le titre est intégré dans `description` (première ligne).

### 15 Leads

| Catégorie | Nb | score_chaleur | Statuts | Notes |
|---|---|---|---|---|
| Chauds | 5 | 8–10 | rdv_pris / offre / signé | "Accord bancaire reçu", "Visite confirmée vendredi" |
| Tièdes | 5 | 4–7 | qualified / contacted | "En attente retour banque", "Rappeler après le 20" |
| Froids | 5 | 1–3 | new / contacted | "Premier contact", "Curieux, pas pressé" |

- `created_at` échelonné sur les 60 derniers jours
- `deal_id` : chaque lead lié à un deal différent (15 deals sur 20 utilisés)
- `budget` : 150k–450k€ cohérent avec le deal associé
- `apport` : 10–20% du budget
- `delay` : "immédiat" / "3 mois" / "6 mois" / "1 an"
- Email : `prenom.nom@gmail.com` / `prenom.nom@outlook.fr`
- Téléphone : format `06 XX XX XX XX` ou `07 XX XX XX XX`

### 8 Notifications

| # | Message | is_read | deal_id |
|---|---|---|---|
| 1 | Nouveau lead chaud détecté : Marie Lefort, score 9/10 | False | deal lié |
| 2 | Pépite détectée : T3 Lyon 6e, 18% sous le marché | False | deal pépite |
| 3 | RDV confirmé : Jean-Pierre Martin, vendredi 14h | False | deal lié |
| 4 | Lead non contacté depuis 7 jours : Sophie Blanc | True | deal lié |
| 5 | Nouvelle baisse de prix : Maison Caluire -12 000€ | True | deal lié |
| 6 | Score mis à jour : 3 biens recalculés | True | None |
| 7 | Rapport mensuel disponible | True | None |
| 8 | Campagne email envoyée à 8 leads | True | None |

### 3 Campaigns

| Nom | type | status | scheduled_at |
|---|---|---|---|
| Nouveautés Mai 2026 | email | sent | None |
| Relance prospects tièdes | email | draft | None |
| Biens coup de cœur semaine | email | scheduled | demain 09:00 |

### 5 Alerts

| query | max_price | min_surface | notes |
|---|---|---|---|
| Lyon 6e appartement | 350 000 | 60 | — |
| Villeurbanne maison | 500 000 | None | — |
| Score AEVUM >= 8 | None | None | — |
| DPE A ou B Lyon | None | None | — |
| succession départ rapide | None | None | — |

---

## 5. Résumé affiché

```
✅ Agence démo créée
✅ 20 deals insérés
✅ 15 leads insérés
✅ 8 notifications insérées
✅ 3 campagnes insérées
✅ 5 alertes insérées
━━━━━━━━━━━━━━━━━━━━━━━━━
URL app     : http://localhost:5173
Email       : agent@demo-aevum.fr
Password    : Demo2026!
━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Validation finale

- [ ] `python backend/scripts/seed_demo.py` → 0 erreur
- [ ] Login `agent@demo-aevum.fr / Demo2026!` → OK
- [ ] Dashboard affiche les deals avec scores
- [ ] Kanban Leads affiche les 15 leads répartis
- [ ] Badge notification affiche les 3 non-lues
- [ ] `/campaigns` liste les 3 campagnes
- [ ] `python backend/scripts/seed_demo.py --reset` puis re-run → idempotent

---

## 7. Contraintes

- Branche `claude` uniquement, jamais merger sur `main`
- Le script ne doit pas nécessiter que uvicorn tourne
- Utiliser `get_password_hash` de `backend.auth` pour le mot de passe
- Pas de données en doublon si re-run sans `--reset`
