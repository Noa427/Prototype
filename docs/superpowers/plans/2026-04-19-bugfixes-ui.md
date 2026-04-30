# Bugfixes UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 7 bugs UI/UX + seeder les données de démo pour rendre l'app pleinement fonctionnelle.

**Architecture:** Corrections indépendantes sur frontend React + backend FastAPI. Seed données via script existant. Ajout champs Agency pour clés API via migration Alembic.

**Tech Stack:** React 18, FastAPI, SQLModel, Alembic, Tailwind CSS, axios

---

## File Map

| Fichier | Modifications |
|---|---|
| `src/pages/Immobilier.jsx` | Bouton Détail (URL nulle) + bouton Appeler (tel:) |
| `src/pages/Settings.jsx` | Fallback `userSettings.notifications` undefined |
| `src/pages/Campaigns.jsx` | CampaignCard message expandable |
| `src/components/MatchingModal.jsx` | Gestion erreur + état vide explicite |
| `src/components/AdminPanel.jsx` | Section clés API |
| `backend/models.py` | Champs `sms_api_key`, `email_api_key` sur Agency |
| `backend/api/admin.py` | Endpoint GET/PUT `/admin/config` |
| `alembic/versions/` | Nouvelle migration add_agency_api_keys |

---

## Task 1: Seeder les données de démo

**Files:**
- Run: `backend/scripts/seed_demo.py` (existant)

- [ ] **Step 1: Exécuter le seed**

```powershell
.venv\Scripts\Activate.ps1
python backend/scripts/seed_demo.py
```

Expected output: lignes "✓ agence créée", "✓ 20 deals", "✓ 15 leads", etc.

- [ ] **Step 2: Vérifier avec le smoke test**

```powershell
.venv\Scripts\python.exe -m pytest backend/tests/test_seed_smoke.py -v
```

Expected: tous les tests PASS.

- [ ] **Step 3: Vérifier dans le navigateur**

Aller sur `/leads` → la liste doit afficher des leads.
Aller sur `/automation` → le sélecteur "Sélectionner un bien" doit lister des deals.

---

## Task 2: Bouton "Détail" — désactiver si URL nulle

**Files:**
- Modify: `src/pages/Immobilier.jsx:192-200`

- [ ] **Step 1: Remplacer le lien Détails**

Dans `src/pages/Immobilier.jsx`, remplacer le bloc `<a href={op.url} ...>` (lignes 192-200) par :

```jsx
{op.url ? (
    <a
        href={op.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
    >
        <Info className="w-3.5 h-3.5" />
        Détails
    </a>
) : (
    <span
        className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-accent-steel cursor-not-allowed opacity-50"
        title="URL non disponible"
    >
        <Info className="w-3.5 h-3.5" />
        Détails
    </span>
)}
```

- [ ] **Step 2: Vérifier dans le navigateur**

Sur `/immobilier` (Le Flux), les cartes avec URL valide ouvrent l'annonce dans un nouvel onglet. Les cartes sans URL affichent le bouton grisé.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Immobilier.jsx
git commit -m "fix: désactiver bouton Détails si URL nulle"
```

---

## Task 3: Bouton "Appeler" — lien tel: si numéro disponible

**Files:**
- Modify: `src/pages/Immobilier.jsx:201-204`

Note : le modèle `Deal` n'a pas de champ `phone` — les deals scrapés ne contiennent pas de numéro direct. Le bouton sera donc toujours grisé avec l'info "Numéro non disponible" jusqu'à ce que les scrapers capturent ce champ.

- [ ] **Step 1: Remplacer le bouton Appeler**

Dans `src/pages/Immobilier.jsx`, remplacer le `<button>` Appeler (lignes 201-204) par :

```jsx
{op.phone ? (
    <a
        href={`tel:${op.phone}`}
        className="flex items-center justify-center gap-2 py-2 rounded-md bg-accent text-xs font-bold text-white hover:bg-accent/90 transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]"
    >
        <Phone className="w-3.5 h-3.5" />
        {op.phone}
    </a>
) : (
    <span
        className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-accent-steel cursor-not-allowed opacity-50"
        title="Numéro non disponible"
    >
        <Phone className="w-3.5 h-3.5" />
        Appeler
    </span>
)}
```

- [ ] **Step 2: Vérifier dans le navigateur**

Sur `/immobilier`, le bouton Appeler est grisé avec tooltip "Numéro non disponible".

- [ ] **Step 3: Commit**

```bash
git add src/pages/Immobilier.jsx
git commit -m "fix: bouton Appeler grisé si pas de numéro, lien tel: si disponible"
```

---

## Task 4: Settings — crash si notifications undefined

**Files:**
- Modify: `src/pages/Settings.jsx:12`

- [ ] **Step 1: Ajouter le fallback**

Dans `src/pages/Settings.jsx`, remplacer la ligne 12 :

```js
// AVANT
const [notifications, setNotifications] = useState(userSettings.notifications);

// APRÈS
const [notifications, setNotifications] = useState(
    userSettings?.notifications ?? { newProperties: true, zoneReports: true, securityAlerts: true }
);
```

- [ ] **Step 2: Vérifier dans le navigateur**

Aller sur `/settings` → les 3 toggles de notification sont cliquables et changent d'état visuellement.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "fix: fallback notifications undefined dans Settings"
```

---

## Task 5: MatchingModal — état vide et gestion d'erreur

**Files:**
- Modify: `src/components/MatchingModal.jsx`

- [ ] **Step 1: Ajouter état d'erreur**

Dans `src/components/MatchingModal.jsx`, remplacer le useState initial et le useEffect :

```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
const [sending, setSending] = useState(null);
const [sent, setSent] = useState({});

useEffect(() => {
    setLoading(true);
    setError(false);
    api.get(`/api/matching/deals/${deal.id}/leads`)
        .then(r => setData(r.data))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
}, [deal.id]);
```

- [ ] **Step 2: Ajouter l'affichage d'erreur dans le corps du modal**

Dans la section `<div className="overflow-y-auto flex-1 p-5 space-y-3">`, après le bloc loading, ajouter avant les checks `!loading` :

```jsx
{error && (
    <p className="text-center text-red-400 text-sm py-8">
        Erreur lors du chargement des clients matchés.
    </p>
)}
```

Et changer la condition d'affichage des matches de `{!loading && data?.matches?.length === 0 &&` à :

```jsx
{!loading && !error && data?.matches?.length === 0 && (
    <p className="text-center text-accent-steel text-sm py-8">
        Aucun client avec un budget suffisant pour ce bien.
    </p>
)}
{!loading && !error && data?.matches?.map(lead => (
```

- [ ] **Step 3: Vérifier dans le navigateur**

Après seed (Task 1), cliquer "Voir clients matchés" sur un deal → le modal affiche soit des clients matchés, soit "Aucun client avec budget suffisant", mais plus d'écran vide.

- [ ] **Step 4: Commit**

```bash
git add src/components/MatchingModal.jsx
git commit -m "fix: MatchingModal gestion erreur + message vide explicite"
```

---

## Task 6: Campagnes — message expandable au clic

**Files:**
- Modify: `src/pages/Campaigns.jsx` — composant `CampaignCard` (lignes 12-51)

- [ ] **Step 1: Ajouter l'état expanded dans CampaignCard**

Remplacer entièrement le composant `CampaignCard` (lignes 12-51) par :

```jsx
const CampaignCard = ({ campaign, onSend, onDelete, busy }) => {
    const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
    const Icon = cfg.icon;
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="glass p-5 rounded-xl border border-white/10 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{campaign.name}</h3>
                    <p
                        onClick={() => setExpanded(e => !e)}
                        className={`text-xs text-accent-steel mt-1 cursor-pointer hover:text-white transition-colors ${expanded ? '' : 'line-clamp-2'}`}
                    >
                        {campaign.message}
                    </p>
                    {campaign.message && campaign.message.length > 120 && (
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="text-[10px] text-accent hover:text-accent/80 transition-colors mt-0.5"
                        >
                            {expanded ? 'Voir moins' : 'Voir plus'}
                        </button>
                    )}
                </div>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${cfg.cls}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-accent-steel">
                <span className="uppercase font-bold">{campaign.type}</span>
                <span>{campaign.leads_ids?.length ?? 0} destinataire(s)</span>
                <span className="ml-auto">{new Date(campaign.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {campaign.status === 'draft' && (
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => onSend(campaign.id)}
                        disabled={busy === campaign.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
                    >
                        {busy === campaign.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Envoyer maintenant
                    </button>
                    <button
                        onClick={() => onDelete(campaign.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Vérifier dans le navigateur**

Sur `/campaigns`, cliquer sur le texte d'un message long → il se développe. Cliquer "Voir moins" → il se referme.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Campaigns.jsx
git commit -m "feat: message campagne expandable au clic"
```

---

## Task 7: Admin — section configuration clés API

**Files:**
- Modify: `backend/models.py` — ajout champs Agency
- Create: `alembic/versions/<hash>_add_agency_api_keys.py`
- Modify: `backend/api/admin.py` — endpoints GET/PUT config
- Modify: `src/components/AdminPanel.jsx` — section UI

### 7a — Modèle + migration

- [ ] **Step 1: Ajouter les champs à Agency dans models.py**

Dans `backend/models.py`, dans la classe `Agency` après `expires_at` (ligne 85), ajouter :

```python
sms_api_key: Optional[str] = None
email_api_key: Optional[str] = None
```

- [ ] **Step 2: Générer la migration Alembic**

```powershell
.venv\Scripts\Activate.ps1
.venv\Scripts\alembic.exe revision --autogenerate -m "add_agency_api_keys"
```

Vérifier le fichier créé dans `alembic/versions/` — il doit contenir `op.add_column('agency', sa.Column('sms_api_key', ...))` et `op.add_column('agency', sa.Column('email_api_key', ...))`.

- [ ] **Step 3: Appliquer la migration**

```powershell
.venv\Scripts\alembic.exe upgrade head
```

Expected: `Running upgrade ... -> ..., add_agency_api_keys`

### 7b — Endpoints backend

- [ ] **Step 4: Ajouter les endpoints dans admin.py**

Dans `backend/api/admin.py`, à la fin du fichier ajouter :

```python
@router.get("/config")
async def get_admin_config(
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Retourne la config API keys de la première agence (super-admin)."""
    agency = session.exec(select(Agency)).first()
    if not agency:
        return {"sms_api_key": "", "email_api_key": ""}
    return {
        "sms_api_key": agency.sms_api_key or "",
        "email_api_key": agency.email_api_key or "",
    }


@router.put("/config")
async def update_admin_config(
    body: Dict[str, Any],
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    """Met à jour les clés API de la première agence."""
    agency = session.exec(select(Agency)).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Aucune agence configurée")
    if "sms_api_key" in body:
        agency.sms_api_key = body["sms_api_key"] or None
    if "email_api_key" in body:
        agency.email_api_key = body["email_api_key"] or None
    session.add(agency)
    session.commit()
    return {"detail": "Configuration sauvegardée"}
```

- [ ] **Step 5: Vérifier le backend**

```powershell
.venv\Scripts\python.exe -c "import requests; r = requests.get('http://localhost:8000/admin/config', cookies={'session': 'admin'}); print(r.status_code)"
```

(Nécessite d'être connecté — tester via `/docs` FastAPI à `http://localhost:8000/docs`)

### 7c — UI AdminPanel

- [ ] **Step 6: Ajouter la section dans AdminPanel.jsx**

Dans `src/components/AdminPanel.jsx`, après les imports existants ajouter `Key` à l'import lucide-react :

```jsx
import { Users, Shield, Plus, AlertTriangle, Activity, Bell, ChevronRight, X, AlertCircle, Info, Key } from 'lucide-react';
```

Ajouter un state en haut du composant `AdminPanel`, après les states existants :

```jsx
const [apiConfig, setApiConfig] = React.useState({ sms_api_key: '', email_api_key: '' });
const [configLoading, setConfigLoading] = React.useState(false);
const [configSaved, setConfigSaved] = React.useState(false);
```

Ajouter dans le `useEffect` existant, en parallèle des autres appels API :

```jsx
React.useEffect(() => {
    Promise.all([
        api.get('/admin/agencies/stats'),
        api.get('/notifications/'),
        api.get('/admin/config'),
    ]).then(([agenciesRes, notifRes, configRes]) => {
        setAgencies(agenciesRes.data.filter(a => a.id !== null));
        setNotifications(notifRes.data.slice(0, 5));
        setApiConfig(configRes.data);
    }).catch(console.error).finally(() => setLoading(false));
}, []);
```

Ajouter la fonction de sauvegarde après `dismissNotification` :

```jsx
const saveApiConfig = async () => {
    setConfigLoading(true);
    try {
        await api.put('/admin/config', apiConfig);
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 3000);
    } catch {
        // ignore
    } finally {
        setConfigLoading(false);
    }
};
```

Ajouter la section UI juste avant le `<div className="p-4 bg-accent/5 ...">` de fin (avant la ligne ~237) :

```jsx
<div className="glass rounded-xl border border-white/10 p-6">
    <div className="flex items-center gap-3 mb-6">
        <Key className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-bold text-white">Configuration des Services</h2>
    </div>
    {configSaved && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">Configuration sauvegardée !</p>
        </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Clé API SMS (Twilio)</label>
            <input
                type="password"
                value={apiConfig.sms_api_key}
                onChange={e => setApiConfig(c => ({ ...c, sms_api_key: e.target.value }))}
                placeholder="SK••••••••••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50"
            />
        </div>
        <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Clé API Email (SendGrid)</label>
            <input
                type="password"
                value={apiConfig.email_api_key}
                onChange={e => setApiConfig(c => ({ ...c, email_api_key: e.target.value }))}
                placeholder="SG.••••••••••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50"
            />
        </div>
    </div>
    <button
        onClick={saveApiConfig}
        disabled={configLoading}
        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium"
    >
        {configLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
            <Key className="w-4 h-4" />
        )}
        Sauvegarder les clés
    </button>
</div>
```

- [ ] **Step 7: Vérifier dans le navigateur**

Aller sur `/admin` → une section "Configuration des Services" apparaît avec 2 champs masqués (type password) et un bouton "Sauvegarder les clés". Entrer une valeur, cliquer sauvegarder → message "Configuration sauvegardée !".

- [ ] **Step 8: Commit**

```bash
git add backend/models.py alembic/versions/ backend/api/admin.py src/components/AdminPanel.jsx
git commit -m "feat: admin section clés API SMS/email + migration Alembic"
```

---

## Task 8: Vérification finale Reporting

- [ ] **Step 1: Ouvrir la page Reporting**

Aller sur `/reporting` → vérifier que les graphes et stats s'affichent avec les données seedées.

Si vide ou erreur, noter le message d'erreur dans la console navigateur et ouvrir un ticket séparé.

- [ ] **Step 2: Vérification globale**

Parcourir toutes les pages et confirmer :
- [ ] Le Flux → Détails grisé si URL nulle, Appeler grisé avec tooltip
- [ ] Le Flux → "Voir clients matchés" affiche des clients ou le message vide explicite
- [ ] Leads → liste peuplée avec données démo
- [ ] Campagnes → clic sur message long = expansion
- [ ] Paramètres → toggles notifications cliquables
- [ ] Admin → section clés API présente et fonctionnelle
