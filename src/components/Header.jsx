import React from 'react';
import { Bell, Search, User, LogOut, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../App';

export const Header = () => {
    const [isOnline, setIsOnline] = React.useState(true);
    const { user, logout, isAdmin } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <header className="h-16 glass border-b border-white/5 flex items-center px-8 sticky top-0 z-10">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pl-2 border-l-2 border-accent/50">
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
                            Rôle: {user?.role === 'admin' ? 'Administrateur' : 'Client'} • Secteur Paris
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                        <User className="w-5 h-5 text-accent" />
                    </div>
                </div>
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
                <button className="p-2 text-accent-steel hover:text-white transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background" />
                </button>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-accent-steel uppercase tracking-widest">Status: {isOnline ? 'Online' : 'Offline'}</span>
                </div>

                <button
                    onClick={handleLogout}
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
