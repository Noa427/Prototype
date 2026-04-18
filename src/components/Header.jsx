import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, LogOut, Shield, UserCheck, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../App';
import api from '../services/api';

const POLL_MS = 30_000;

export const Header = () => {
    const [isOnline, setIsOnline] = React.useState(true);
    const { user, logout, isAdmin } = useAuth();

    // ── Notifications ──────────────────────────────────────────────────────
    const [notifs, setNotifs] = useState([]);
    const [open, setOpen] = useState(false);
    const dropRef = useRef(null);

    const fetchNotifs = () => {
        api.get('/api/notifications').then(r => setNotifs(r.data)).catch(() => {});
    };

    useEffect(() => {
        fetchNotifs();
        const id = setInterval(fetchNotifs, POLL_MS);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unread = notifs.filter(n => !n.is_read).length;

    const markRead = async (id) => {
        await api.put(`/api/notifications/${id}/read`).catch(() => {});
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const clearAll = async () => {
        await api.delete('/api/notifications/clear').catch(() => {});
        setNotifs([]);
        setOpen(false);
    };

    return (
        <header className="h-16 glass border-b border-white/5 flex items-center px-8 sticky top-0 z-10">
            <div className="flex items-center gap-6">
                <div className="w-48 hidden md:block" />
            </div>

            <div className="flex items-center gap-4 flex-1 justify-center">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-steel" />
                    <input
                        type="text"
                        placeholder="Rechercher un bien, une zone..."
                        className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-all text-white"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6 ml-auto">
                <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                    <div className="text-right hidden md:block">
                        <div className="flex items-center gap-2 justify-end">
                            <p className="text-xs font-bold text-white">{user?.fullName || user?.username}</p>
                            {isAdmin ? (
                                <Shield className="w-3 h-3 text-accent" />
                            ) : (
                                <UserCheck className="w-3 h-3 text-blue-400" />
                            )}
                        </div>
                        <p className="text-[10px] text-accent-steel uppercase tracking-widest">
                            {user?.role === 'admin' ? 'Administrateur' : 'Agent Commercial'} • Secteur Paris
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                        <User className="w-5 h-5 text-accent" />
                    </div>
                </div>

                {/* ── Cloche notifs ── */}
                <div className="relative" ref={dropRef}>
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="p-2 text-accent-steel hover:text-white transition-colors relative"
                    >
                        <Bell className="w-5 h-5" />
                        {unread > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>

                    {open && (
                        <div className="absolute right-0 top-10 w-80 glass border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                <span className="text-xs font-bold uppercase tracking-widest text-white">Notifications</span>
                                {notifs.length > 0 && (
                                    <button onClick={clearAll} className="text-accent-steel hover:text-red-400 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifs.length === 0 ? (
                                    <p className="text-center text-accent-steel text-xs py-6">Aucune notification</p>
                                ) : notifs.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => markRead(n.id)}
                                        className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors flex items-start gap-3 ${n.is_read ? 'opacity-50' : ''}`}
                                    >
                                        <CheckCheck className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.is_read ? 'text-accent-steel' : 'text-accent'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white leading-snug truncate">{n.message}</p>
                                            <p className="text-[10px] text-accent-steel mt-0.5">
                                                {new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-accent-steel uppercase tracking-widest">Statut: {isOnline ? 'En ligne' : 'Hors ligne'}</span>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-1.5 text-accent-steel hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                    title="Se déconnecter"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:block">Déconnexion</span>
                </button>
            </div>
        </header>
    );
};
