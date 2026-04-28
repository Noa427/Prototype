import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Settings, Shield, Map, Users, BarChart3, Zap, Mail, TrendingUp, PenLine, FileText, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Navigation pour les clients
const clientNavItems = [
    { icon: LayoutDashboard, label: 'Tableau de Bord', id: 'dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Le Flux', id: 'immo', path: '/immobilier' },
    { icon: Users, label: 'Leads', id: 'leads', path: '/leads' },
    { icon: Zap, label: 'Automatisation', id: 'automation', path: '/automation' },
    { icon: Map, label: 'Analyse de Zone', id: 'zone', path: '/analyse' },
    { icon: Settings, label: 'Paramètres', id: 'settings', path: '/settings' },
    { icon: BarChart3, label: 'Calendrier', id: 'calendar', path: '/settings/calendar' },
    { icon: Mail, label: 'Campagnes', id: 'campaigns', path: '/campaigns' },
    { icon: PenLine, label: 'Signatures', id: 'signatures', path: '/signatures' },
    { icon: FileText, label: 'Mandats', id: 'mandates', path: '/mandates' },
    { icon: TrendingUp, label: 'Reporting', id: 'reporting', path: '/reporting' },
];

// Navigation pour les admins
const adminNavItems = [
    { icon: Users, label: 'Administration', id: 'admin', path: '/admin' },
    { icon: BarChart3, label: 'Admin KPI', id: 'kpi', path: '/admin/kpi' },
    { icon: Building2, label: 'Agences', id: 'agencies', path: '/admin/agencies' },
    { icon: Settings, label: 'Paramètres', id: 'settings', path: '/settings' },
];

export const Sidebar = ({ isOpen, onClose }) => {
    const { isAdmin, user } = useAuth();

    const navItems = isAdmin ? adminNavItems : clientNavItems;

    return (
        <>
            {/* Mobile backdrop */}
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

            <nav className="flex-1 px-4 py-4 space-y-2">
                {/* Indicateur de rôle */}
                <div className="px-3 pb-4">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isAdmin ? 'bg-accent/10 border border-accent/20' : 'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                        {isAdmin ? (
                            <Shield className="w-4 h-4 text-accent" />
                        ) : (
                            <LayoutDashboard className="w-4 h-4 text-blue-400" />
                        )}
                        <span className={`text-xs font-medium ${isAdmin ? 'text-accent' : 'text-blue-400'
                            }`}>
                            {isAdmin ? 'Mode Administrateur' : 'Mode Client'}
                        </span>
                    </div>
                </div>

                {navItems.map((item) => (
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
