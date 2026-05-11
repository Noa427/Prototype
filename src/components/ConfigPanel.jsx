import React from 'react';
import { Settings2, Power, Map, Globe, Cpu } from 'lucide-react';

const modules = [
    { id: 'immo', name: 'Immobilier', active: import.meta.env.VITE_MODULE_IMMO_ACTIVE === 'true', icon: Globe },
    { id: 'zone', name: 'Analyse de Zone', active: true, icon: Map },
    { id: 'ai', name: 'AI Analyzer', active: true, icon: Cpu },
];

export const ConfigPanel = () => {
    return (
        <aside className="w-80 h-screen glass border-l border-white/5 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-8">
                <Settings2 className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold tracking-tight">Module Configuration</h2>
            </div>

            <div className="space-y-6">
                {modules.map((mod) => (
                    <div key={mod.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <mod.icon className="w-5 h-5 text-accent-steel" />
                                <span className="font-medium text-sm">{mod.name}</span>
                            </div>
                            <button
                                className={`w-10 h-5 rounded-full transition-colors relative ${mod.active ? 'bg-accent' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${mod.active ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                        <p className="text-[10px] text-accent-steel leading-relaxed">
                            {mod.active ? 'Module is currently active and processing data.' : 'Module is disabled. Enable to start monitoring.'}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/5">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium">
                    <Power className="w-4 h-4 text-red-500" />
                    Emergency Shutdown
                </button>
            </div>
        </aside>
    );
};
