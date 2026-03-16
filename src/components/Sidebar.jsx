import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Settings, Shield, Map } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de Bord', id: 'dashboard', path: '/' },
    { icon: Building2, label: 'Le Flux', id: 'immo', path: '/immobilier' },
    { icon: Map, label: 'Analyse de Zone', id: 'zone', path: '/analyse' },
    { icon: Settings, label: 'Paramètres', id: 'settings', path: '/settings' },
];

export const Sidebar = () => {
    return (
        <aside className="w-64 h-screen glass border-r border-white/5 flex flex-col">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold tracking-tight text-xl text-white">SOL INVICTUS</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.path}
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Agent Connecté</span>
                </div>
            </div>
        </aside>
    );
};
