# Spec : RBAC 3 rôles + seed data — AEVUM

**Date** : 2026-05-05  
**Branche** : claude  
**Scope** : Seed data superadmin & admin/agent + RBAC frontend (sidebar) + garde backend canaux

---

## Contexte

Le système a 3 rôles définis :
- **`"agent"`** — commercial employé, voit uniquement ses propres leads
- **`"gérant"`** — patron de l'agence, voit tous les leads de l'agence + config agence
- **`"admin"`** — superadmin AEVUM (Noa), voit toutes les agences

Le backend distingue déjà `agent` vs `gérant` dans `leads.py`. Le frontend ne fait aucune distinction entre les deux : sidebar identique, pas de section réservée gérant, canaux accessibles à tous.

---

## Ce qui change

### 1. Seed data

#### Superadmin (nouveau)

Compte superadmin ajouté dans `seed_demo.py` :
- username : `noa.aevum`
- password : `Demo2026!`
- role : `"admin"`, `agency_id=None`

4 agences légères ajoutées (agency + 1 gérant + N deals synthétiques) :

| Agence | Ville | Statut | Deals |
|--------|-------|--------|-------|
| Moreau Immobilier | Paris | active | 8 |
| Côte d'Azur Prestige | Nice | active | 5 |
| Cabinet Rivière | Bordeaux | suspended | 3 |
| Zénith Immo | Marseille | active | 10 |

Ces agences n'ont pas de leads riches — juste assez pour alimenter les KPIs de `/admin/agencies` (deal_count, user_count, avg_score, statut).

#### Admin/agent (existant modifié)

Actuellement tous les leads démo sont assignés à `thomas.dupont` (gérant). Redistribution :
- **8 leads** → `julie.martin` (agent), choisis parmi les leads "tièdes" et "froids" (status new/contacted/qualified)
- Le reste → `thomas.dupont`

Résultat : `julie.martin` a une vue peuplée mais isolée (ne voit pas les leads de Thomas).

Le reset `--reset` nettoie tout y compris les nouvelles agences et le compte superadmin.

---

### 2. Backend — garde gérant

**Fichier** : `backend/auth.py`

Nouvelle dépendance ajoutée :

```python
def get_gerant_user(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("gérant", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au gérant de l'agence"
        )
    return current_user
```

**Fichier** : `backend/api/channels.py`

Tous les endpoints de gestion `ChannelAccount` (CRUD : créer, modifier, supprimer un compte canal) remplacent `get_current_user` par `get_gerant_user`.

Les endpoints `ChannelConversation` (lecture conversations, takeover agent) restent avec `get_current_user` — accessibles à tous les rôles.

`get_admin_user()` existant inchangé.

---

### 3. Frontend — RBAC sidebar + routes

#### AuthContext (`src/App.jsx`)

Ajout dans `authValue` :
```js
isGerant: user?.role === 'gérant',
```
`isAdmin` reste pour `role === 'admin'` (superadmin).

#### ProtectedRoute (`src/App.jsx`)

Nouveau niveau `"gerant"` :
```js
if (roles === "gerant" && !["gérant", "admin"].includes(user.role))
  return <Navigate to="/dashboard" replace />;
```

Route `/settings/canaux` : passe de `roles="staff"` → `roles="gerant"`.

#### Sidebar (`src/components/Sidebar.jsx`)

**Section "Chat IA"** : retirer l'item "Canaux" (`/settings/canaux`). Ne garde que "Conversations".

**Section "Mon Agence" 🏢** (nouvelle, gérant uniquement) :
```
Mon Agence
└── Canaux  → /settings/canaux
```
Insérée après la section "Reporting". Un seul item suffit : Canaux est la seule config agence non accessible via les settings personnels. Évite le doublon avec la section "Paramètres".

**Section "Paramètres"** existante : reste pour tous les rôles (settings personnels : profil, alertes, mot de passe).

**Badge mode** (sidebar header) :
- `role === 'admin'` → "Mode Administrateur" (couleur accent existante)
- `role === 'gérant'` → "Mode Gérant" (orange : `bg-orange-500/10 border-orange-500/20 text-orange-400`)
- autres → "Mode Agent" (bleu existant)

---

## Ce qui ne change pas

- `get_admin_user()` — superadmin guard inchangé
- Routes `/admin/*` — toujours réservées `role === "admin"`
- Isolation multi-tenant backend — inchangée
- Le seed Dupont Immobilier (thomas.dupont + julie.martin) — structure conservée, seule l'assignation de 8 leads change

---

## Comptes démo après implémentation

| Username | Password | Rôle | Accès |
|----------|----------|------|-------|
| `noa.aevum` | `Demo2026!` | superadmin | `/admin` — toutes les agences |
| `thomas.dupont` | `Demo2026!` | gérant | sidebar client + Mon Agence, tous les leads Dupont |
| `julie.martin` | `Demo2026!` | agent | sidebar client sans Mon Agence, ses 8 leads uniquement |
