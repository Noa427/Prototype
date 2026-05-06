import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, Home, ChevronDown, MessageSquare, Plug } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Order matters: find() returns the first section whose item matches the active route.
// More specific paths (e.g. /settings/calendar) must belong to sections listed before
// sections containing prefix-matching paths (e.g. /settings).
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
    id: 'omnichannel',
    label: 'Chat IA',
    emoji: '💬',
    items: [
      { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
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
      { icon: Settings, label: 'Paramètres', path: '/settings', end: true },
    ],
  },
];

const LS_KEY = 'sidebar-open';

// Navigation pour les admins
const adminNavItems = [
    { icon: Users, label: 'Administration', id: 'admin', path: '/admin' },
    { icon: BarChart3, label: 'Admin KPI', id: 'kpi', path: '/admin/kpi' },
    { icon: Building2, label: 'Agences', id: 'agencies', path: '/admin/agencies' },
    { icon: Settings, label: 'Paramètres', id: 'settings', path: '/settings', end: true },
];

const gerantSections = [
  {
    id: 'mon-agence',
    label: 'Mon Agence',
    emoji: '🏢',
    items: [
      { icon: Plug, label: 'Canaux', path: '/settings/canaux' },
    ],
  },
];

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
                            end={!!item.end}
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

export const Sidebar = ({ isOpen, onClose }) => {
    const { isAdmin, isGerant, user } = useAuth();
    const location = useLocation();

    const [openSections, setOpenSections] = useState(() => {
        let stored = [];
        try {
            const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
            if (Array.isArray(raw)) stored = raw;
        } catch {
            // ignore corrupted storage
        }
        const allSections = [...clientSections, ...gerantSections];
        const validIds = new Set(allSections.map(s => s.id));
        const safe = new Set(stored.filter(id => validIds.has(id)));
        const activeSection = allSections.find(s =>
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
                                : isGerant
                                ? 'bg-orange-500/10 border border-orange-500/20'
                                : 'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                            {isAdmin ? (
                                <Shield className="w-4 h-4 text-accent" />
                            ) : isGerant ? (
                                <Shield className="w-4 h-4 text-orange-400" />
                            ) : (
                                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                            )}
                            <span className={`text-xs font-medium ${
                                isAdmin ? 'text-accent' : isGerant ? 'text-orange-400' : 'text-blue-400'
                            }`}>
                                {isAdmin ? 'Mode Administrateur' : isGerant ? 'Mode Gérant' : 'Mode Agent'}
                            </span>
                        </div>
                    </div>

                    {isAdmin ? (
                        <div className="space-y-1">
                            {adminNavItems.map((item) => (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    end={!!item.end}
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
                            {isGerant && gerantSections.map((section) => (
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
