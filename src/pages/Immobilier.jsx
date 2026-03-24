import React from 'react';
import { Search, Filter, Phone, Info, MapPin, Clock, ArrowUpRight } from 'lucide-react';

const opportunities = [
    {
        id: 1,
        title: "Appartement T3 - Paris 15",
        type: "Appartement",
        price: "450,000 €",
        yield: "5.2%",
        cashflow: "+450 €/m",
        location: "Paris 15e",
        time: "2m ago",
        desc: "Bel appartement lumineux, proche commerces et transports."
    },
    {
        id: 2,
        title: "Local Commercial - Lyon 2",
        type: "Commerce",
        price: "1.2M €",
        yield: "7.8%",
        cashflow: "+1,200 €/m",
        location: "Lyon 2e",
        time: "15m ago",
        desc: "Emplacement premium, forte visibilité, bail en cours."
    },
    {
        id: 3,
        title: "Immeuble de Rapport - Bordeaux",
        type: "Immeuble",
        price: "890,000 €",
        yield: "6.5%",
        cashflow: "+2,100 €/m",
        location: "Bordeaux Centre",
        time: "1h ago",
        desc: "6 lots, entièrement loué, toiture refaite."
    },
    {
        id: 4,
        title: "Studio Étudiant - Lille",
        type: "Studio",
        price: "120,000 €",
        yield: "4.9%",
        cashflow: "+120 €/m",
        location: "Lille Vauban",
        time: "3h ago",
        desc: "Idéal premier investissement, proche facultés."
    }
];

export const Immobilier = () => {
    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Le Flux</h1>
                    <p className="text-xs text-accent-steel uppercase tracking-widest mt-1">Opportunités en temps réel</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-steel" />
                        <input
                            type="text"
                            placeholder="Filtrer..."
                            className="bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 w-48 text-white"
                        />
                    </div>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-accent-steel hover:text-white">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {opportunities.map((op) => (
                    <div key={op.id} className="glass glass-hover rounded-lg p-4 flex flex-col border border-white/5">
                        <div className="flex justify-between items-start mb-3">
                            <span className="px-1.5 py-0.5 rounded bg-accent/10 text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/20">
                                {op.type}
                            </span>
                            <span className="text-[10px] text-accent-steel font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {op.time}
                            </span>
                        </div>

                        <h3 className="text-base font-bold text-white mb-2 truncate">{op.title}</h3>
                        <p className="text-xs text-accent-steel line-clamp-2 mb-4 h-8 leading-relaxed">{op.desc}</p>

                        <div className="grid grid-cols-2 gap-3 mb-6 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            <div>
                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Prix</p>
                                <p className="text-sm font-bold text-white">{op.price}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Rendement</p>
                                <p className="text-sm font-bold text-green-500">{op.yield}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-accent-steel mb-6">
                            <MapPin className="w-3.5 h-3.5" />
                            {op.location}
                        </div>

                        <div className="mt-auto grid grid-cols-2 gap-2">
                            <button className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all">
                                <Info className="w-3.5 h-3.5" />
                                Détails
                            </button>
                            <button className="flex items-center justify-center gap-2 py-2 rounded-md bg-accent text-xs font-bold text-white hover:bg-accent/90 transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                <Phone className="w-3.5 h-3.5" />
                                Appeler
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Immobilier;
