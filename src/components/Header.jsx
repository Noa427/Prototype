import React from 'react';
import { Bell, Search, User } from 'lucide-react';

export const Header = () => {
    const [isOnline, setIsOnline] = React.useState(true);

    return (
        <header className="h-16 glass border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-steel" />
                    <input
                        type="text"
                        placeholder="Rechercher un bien, une zone..."
                        className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-all text-white"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <button className="p-2 text-accent-steel hover:text-white transition-colors relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background" />
                    </button>
                    <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-bold text-white">Agent Immobilier</p>
                            <p className="text-[10px] text-accent-steel uppercase tracking-widest">Secteur Paris</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                            <User className="w-5 h-5 text-accent" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold text-accent-steel uppercase tracking-widest">Status: {isOnline ? 'Online' : 'Offline'}</span>
                </div>
            </div>
        </header>
    );
};
