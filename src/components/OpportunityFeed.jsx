import React from 'react';
import { TrendingUp, MapPin, Clock, ArrowUpRight } from 'lucide-react';

const opportunities = [
    {
        id: 1,
        title: "Appartement T3 - Paris 15",
        type: "Immobilier",
        price: "450,000 €",
        yield: "5.2%",
        cashflow: "+450 €/m",
        location: "Paris, FR",
        time: "2m ago",
        status: "New"
    },
    {
        id: 2,
        title: "Local Commercial - Lyon",
        type: "Immobilier",
        price: "1.2M €",
        yield: "7.8%",
        cashflow: "+1,200 €/m",
        location: "Lyon, FR",
        time: "15m ago",
        status: "Hot"
    },
    {
        id: 3,
        title: "Immeuble de Rapport - Bordeaux",
        type: "Immobilier",
        price: "890,000 €",
        yield: "6.5%",
        cashflow: "+2,100 €/m",
        location: "Bordeaux, FR",
        time: "1h ago",
        status: "Analyzing"
    },
    {
        id: 4,
        title: "Studio Étudiant - Lille",
        type: "Immobilier",
        price: "120,000 €",
        yield: "4.9%",
        cashflow: "+120 €/m",
        location: "Lille, FR",
        time: "3h ago",
        status: "New"
    }
];

export const OpportunityFeed = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Live Opportunities</h2>
                <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-medium uppercase tracking-wider">
                        {opportunities.length} Detected
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {opportunities.map((op) => (
                    <div key={op.id} className="glass glass-hover rounded-lg p-4 group cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold uppercase tracking-wider text-accent-steel">
                                {op.type}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-accent-steel group-hover:text-accent transition-colors" />
                        </div>

                        <h3 className="text-base font-semibold mb-3 group-hover:text-accent transition-colors truncate">{op.title}</h3>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div>
                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Price</p>
                                <p className="text-sm font-bold">{op.price}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Yield</p>
                                <p className="text-sm font-bold text-green-500">{op.yield}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Cash-flow</p>
                                <p className="text-sm font-bold text-blue-400">{op.cashflow}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-accent-steel border-t border-white/5 pt-3">
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {op.location}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {op.time}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
