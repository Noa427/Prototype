# Sidebar Sections Rétractables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la liste plate de navigation par des sections rétractables groupées avec persistance localStorage.

**Architecture:** Tout le changement est dans `src/components/Sidebar.jsx`. On restructure les données en `clientSections` (tableau de groupes), on ajoute un sous-composant `SidebarSection` pour le rendu de chaque groupe, et on gère l'état ouvert/fermé via `useState` initialisé depuis localStorage.

**Tech Stack:** React 18 · react-router-dom `useLocation` · localStorage · TailwindCSS (grid-rows animation trick) · lucide-react `ChevronDown`

---

### Task 1: Mettre à jour les imports et restructurer les données

**Files:**
- Modify: `src/components/Sidebar.jsx:1-26`

- [ ] **Step 1 : Remplacer les imports ligne 1-6**

```jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, Home, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';
```

Changements : `useState`, `useEffect` ajoutés · `useLocation` ajouté · `X` supprimé · `ChevronDown` ajouté.

- [ ] **Step 2 : Remplacer `clientNavItems` par `clientSections` (après la fonction `cn`)**

Supprimer les lignes 13-26 (ancien `clientNavItems`) et les remplacer par :

```jsx
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

const LS_KEY = 'sidebar-open';
```

`adminNavItems` reste inchangé.

---

### Task 2: Créer le sous-composant `SidebarSection`

**Files:**
- Modify: `src/components/Sidebar.jsx` — ajouter avant `export const Sidebar`

- [ ] **Step 1 : Insérer `SidebarSection` entre `adminNavItems` et `export const Sidebar`**

```jsx
function SidebarSection({ section, isOpen, onToggle }) {
    return (
        <div>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-widest text-accent-steel/60 hover:text-accent-steel transition-colors duration-200"
            >
                <span>{section.emoji} {section.label}</span>
                <ChevronDown className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>
            <div className={cn(
                "grid transition-all duration-200",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}>
                <div className="overflow-hidden space-y-1 pb-1">
                    {section.items.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/settings'}
                            className={({ isActive }) => cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                "text-accent-steel hover:text-white hover:bg-white/5",
                                isActive && "text-white bg-white/10 border-l-2 border-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

L'animation `grid-rows-[0fr]` → `grid-rows-[1fr]` est le "grid trick" CSS — pas de calcul JS de hauteur.

---

### Task 3: Réécrire le corps du composant `Sidebar`

**Files:**
- Modify: `src/components/Sidebar.jsx` — remplacer `export const Sidebar` en entier

- [ ] **Step 1 : Remplacer le composant `Sidebar` complet**

```jsx
export const Sidebar = ({ isOpen, onClose }) => {
    const { isAdmin, user } = useAuth();
    const location = useLocation();

    const [openSections, setOpenSections] = useState(() => {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        const validIds = new Set(clientSections.map(s => s.id));
        const safe = new Set(stored.filter(id => validIds.has(id)));
        const activeSection = clientSections.find(s =>
            s.items.some(item =>
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/')
            )
        );
        if (activeSection) safe.add(activeSection.id);
        return safe;
    });

    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify([...openSections]));
    }, [openSections]);

    const toggleSection = (id) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />
            )}
            <aside className={`
                fixed md:relative z-40 w-64 h-screen glass border-r border-white/5 flex flex-col
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold tracking-tight text-xl text-white">AEVUM</span>
                </div>

                <nav className="flex-1 min-h-0 px-4 py-4 overflow-y-auto">
                    <div className="px-3 pb-4">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            isAdmin
                                ? 'bg-accent/10 border border-accent/20'
                                : 'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                            {isAdmin ? (
                                <Shield className="w-4 h-4 text-accent" />
                            ) : (
                                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                            )}
                            <span className={`text-xs font-medium ${isAdmin ? 'text-accent' : 'text-blue-400'}`}>
                                {isAdmin ? 'Mode Administrateur' : 'Mode Client'}
                            </span>
                        </div>
                    </div>

                    {isAdmin ? (
                        <div className="space-y-1">
                            {adminNavItems.map((item) => (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    end={item.path === '/settings'}
                                    className={({ isActive }) => cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        "text-accent-steel hover:text-white hover:bg-white/5",
                                        isActive && "text-white bg-white/10 border-l-2 border-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {clientSections.map((section) => (
                                <SidebarSection
                                    key={section.id}
                                    section={section}
                                    isOpen={openSections.has(section.id)}
                                    onToggle={() => toggleSection(section.id)}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">
                            {user?.username} Connecté
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
};
```

---

### Task 4: Vérification manuelle et commit

**Files:** aucun

- [ ] **Step 1 : Lancer le dev server**

```bash
npm run dev
```

- [ ] **Step 2 : Vérifier dans le navigateur**

Checklist :
- [ ] Les 5 sections apparaissent fermées au premier chargement (localStorage vide)
- [ ] La section contenant la page courante s'ouvre automatiquement
- [ ] Clic sur un header ouvre/ferme la section avec animation
- [ ] Plusieurs sections peuvent être ouvertes simultanément
- [ ] Recharger la page : les sections ouvertes sont restaurées
- [ ] Naviguer vers `/settings/calendar` → section "Automatisation" s'ouvre, pas "Paramètres"
- [ ] Mode admin : liste plate inchangée (pas de sections)
- [ ] Mobile : backdrop + slide toujours fonctionnels

- [ ] **Step 3 : Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat(sidebar): sections rétractables avec persistance localStorage"
```
