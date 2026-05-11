# Sidebar — Sections rétractables

**Date :** 2026-05-01  
**Scope :** `src/components/Sidebar.jsx` uniquement

---

## Objectif

Remplacer la liste plate des liens de navigation par des **sections rétractables groupées**, avec persistance de l'état via `localStorage`.

---

## Groupement des pages (client)

| Section | ID | Pages |
|---|---|---|
| 📊 Commercial | `commercial` | Tableau de Bord, Le Flux, Leads, Analyse de Zone |
| ⚙️ Automatisation | `automatisation` | Automatisation, Campagnes, Calendrier |
| 📄 Gestion | `gestion` | Signatures, Mandats, Gestion locative |
| 📈 Reporting | `reporting` | Reporting |
| 🔧 Paramètres | `parametres` | Paramètres |

La navigation admin reste inchangée (liste plate, pas de sections).

---

## Comportement

- **Par défaut :** toutes les sections sont fermées.
- **Au montage :** la section contenant la route active s'ouvre automatiquement.
- **Multi-open :** plusieurs sections peuvent être ouvertes simultanément (pas d'accordéon).
- **Toggle :** clic sur le header d'une section ouvre/ferme cette section.
- **Persistance :** l'état (set d'IDs ouverts) est sauvegardé dans `localStorage` sous la clé `sidebar-open`.

---

## Robustesse localStorage

Au chargement, les IDs lus depuis `localStorage` sont **filtrés** pour ne conserver que ceux qui correspondent à une section existante. Les IDs orphelins (section renommée ou supprimée) sont ignorés silencieusement. Si le résultat est vide et aucune section active n'est trouvée, toutes les sections restent fermées.

```js
const stored = JSON.parse(localStorage.getItem('sidebar-open') ?? '[]');
const validIds = new Set(sections.map(s => s.id));
const safeOpen = new Set(stored.filter(id => validIds.has(id)));
// + ajouter l'ID de la section active au montage
```

---

## Structure des données

```js
const clientSections = [
  {
    id: 'commercial',
    label: 'Commercial',
    emoji: '📊',
    items: [
      { icon: LayoutDashboard, label: 'Tableau de Bord', path: '/dashboard' },
      { icon: Building2, label: 'Le Flux', path: '/immobilier' },
      { icon: Users, label: 'Leads', path: '/leads' },
      { icon: Map, label: 'Analyse de Zone', path: '/analyse' },
    ],
  },
  {
    id: 'automatisation',
    label: 'Automatisation',
    emoji: '⚙️',
    items: [
      { icon: Zap, label: 'Automatisation', path: '/automation' },
      { icon: Mail, label: 'Campagnes', path: '/campaigns' },
      { icon: BarChart3, label: 'Calendrier', path: '/settings/calendar' },
    ],
  },
  {
    id: 'gestion',
    label: 'Gestion',
    emoji: '📄',
    items: [
      { icon: PenLine, label: 'Signatures', path: '/signatures' },
      { icon: FileText, label: 'Mandats', path: '/mandates' },
      { icon: Home, label: 'Gestion locative', path: '/rentals' },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    emoji: '📈',
    items: [
      { icon: TrendingUp, label: 'Reporting', path: '/reporting' },
    ],
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    emoji: '🔧',
    items: [
      { icon: Settings, label: 'Paramètres', path: '/settings' },
    ],
  },
];
```

---

## Visuel des headers de section

- Texte uppercase, tracking-wide, `text-xs`, couleur `text-accent-steel/60`
- Icône chevron (`ChevronDown` de lucide-react) rotate 180° quand ouvert — transition CSS `duration-200`
- Pas de bordure ni background sur le header — sobre, dans le style glass existant
- Items identiques au style actuel (hover, active avec `border-l-2 border-accent`)

---

## Animations

- `grid-rows` trick : `grid-rows-[0fr]` → `grid-rows-[1fr]` avec `overflow-hidden` et `transition-all duration-200`
- Pas de calcul JavaScript de hauteur, fonctionne avec du contenu dynamique

---

## Ce qui ne change pas

- Style des NavLink items (actif, hover, icônes)
- Indicateur de rôle en haut de nav
- Footer utilisateur connecté
- Navigation admin (liste plate inchangée)
- Mobile backdrop et comportement `isOpen/onClose`
