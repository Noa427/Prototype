import React from 'react';
import { Building2, AlertCircle, TrendingUp, ArrowUpRight, Clock, MapPin } from 'lucide-react';

const metrics = [
    { label: "Nouveaux Biens", value: "14", sub: "Dernières 24h", icon: Building2, color: "text-accent" },
    { label: "Alertes Prioritaires", value: "3", sub: "Action requise", icon: AlertCircle, color: "text-red-500" },
    { label: "Estimation Marché", value: "+1.2%", sub: "Secteur Paris 15", icon: TrendingUp, color: "text-green-500" },
];

const recentAlerts = [
    { id: 1, title: "Baisse de prix: T3 Paris 15", price: "420k €", oldPrice: "450k €", time: "12m ago" },
    { id: 2, title: "Nouveau Bien: Studio Lille", price: "115k €", time: "1h ago" },
];

export const Dashboard = () => {
    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Bonjour, Agent</h1>
                <p className="text-accent-steel">Voici l'état de votre secteur aujourd'hui.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="glass p-6 rounded-xl border border-white/5">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-white/5 ${m.color}`}>
                                <m.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">{m.sub}</span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-accent-steel mb-1">{m.label}</p>
                        <p className="text-3xl font-bold text-white">{m.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass p-6 rounded-xl space-y-6">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Alertes Prioritaires
                    </h2>
                    <div className="space-y-4">
                        {recentAlerts.map((alert) => (
                            <div key={alert.id} className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                                <div>
                                    <p className="font-bold text-sm text-white">{alert.title}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-accent font-bold">{alert.price}</span>
                                        {alert.oldPrice && <span className="text-[10px] text-accent-steel line-through">{alert.oldPrice}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-accent-steel uppercase tracking-widest">{alert.time}</p>
                                    <ArrowUpRight className="w-4 h-4 text-accent-steel group-hover:text-accent mt-1 ml-auto" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass p-6 rounded-xl flex flex-col justify-between">
                    <h2 className="font-bold text-lg text-white mb-6">Activité du Marché</h2>
                    <div className="flex-1 flex items-end gap-3 px-2">
                        {[30, 45, 60, 40, 70, 85, 65, 90, 75, 80].map((h, i) => (
                            <div key={i} className="flex-1 bg-accent/20 border-t border-accent/40 rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-accent-steel uppercase tracking-widest">
                        <span>08:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
