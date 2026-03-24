import React from 'react';
import { TrendingUp, MapPin, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

const stats = [
    { label: "Prix Moyen m²", value: "12,450 €", change: "+2.4%", trend: "up" },
    { label: "Tension Locative", value: "8.9/10", change: "+0.5", trend: "up" },
    { label: "Délai de Vente", value: "42 jours", change: "-5 jours", trend: "down" },
];

export const AnalyseZone = () => {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Analyse de Zone</h1>
                    <div className="flex items-center gap-2 mt-2 text-accent-steel">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">Secteur: Paris Intra-muros</span>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-accent-steel hover:text-white transition-all">
                    <Info className="w-4 h-4" />
                    Méthodologie
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="glass p-6 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel mb-2">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {stat.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass p-8 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-lg text-white">Évolution des Prix au m²</h3>
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-accent rounded-sm" />
                            Secteur Actuel
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-white/10 rounded-sm" />
                            Moyenne Ville
                        </div>
                    </div>
                </div>
                <div className="h-64 flex items-end gap-3 px-4">
                    {[40, 45, 38, 52, 60, 58, 65, 72, 68, 80, 85, 90].map((h, i) => (
                        <div key={i} className="flex-1 group relative">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {10000 + h * 50}€
                            </div>
                            <div className="w-full bg-accent/20 border-t border-accent/40 rounded-t-sm transition-all hover:bg-accent/40" style={{ height: `${h}%` }} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-6 text-[10px] text-accent-steel uppercase tracking-widest border-t border-white/5 pt-4">
                    <span>Janvier</span>
                    <span>Avril</span>
                    <span>Juillet</span>
                    <span>Octobre</span>
                    <span>Décembre</span>
                </div>
            </div>
        </div>
    );
};

export default AnalyseZone;
