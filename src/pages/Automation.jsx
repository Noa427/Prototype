import React from 'react';
import { Zap, Play, Pause, RefreshCw, Activity, CheckCircle2, Clock } from 'lucide-react';

const webhooks = [
    { name: "Scraper Immobilier - LeBonCoin", url: "https://n8n.sol-invictus.io/webhook/lbc-scraper", status: "Active", lastRun: "2m ago" },
    { name: "Analyse de Zone - API Perval", url: "https://n8n.sol-invictus.io/webhook/perval-sync", status: "Active", lastRun: "15m ago" },
    { name: "Notification Telegram - Alertes", url: "https://n8n.sol-invictus.io/webhook/tg-alerts", status: "Paused", lastRun: "1h ago" },
];

const Automation = () => {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Automatisation & Workflows</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg text-sm font-bold text-white hover:bg-accent/90 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <Zap className="w-4 h-4" />
                    Nouveau Workflow
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass p-6 rounded-xl">
                        <h2 className="font-bold mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-accent" />
                            Webhooks Actifs
                        </h2>
                        <div className="space-y-4">
                            {webhooks.map((hook, i) => (
                                <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${hook.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                                            <span className="font-bold text-sm">{hook.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                                                {hook.status === 'Active' ? <Pause className="w-4 h-4 text-accent-steel" /> : <Play className="w-4 h-4 text-green-500" />}
                                            </button>
                                            <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                                                <RefreshCw className="w-4 h-4 text-accent-steel" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-accent-steel font-mono">
                                        <span className="truncate max-w-[300px]">{hook.url}</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {hook.lastRun}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass p-6 rounded-xl">
                        <h3 className="font-bold mb-6">Statistiques d'Exécution</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-accent-steel uppercase font-bold tracking-widest">Succès</p>
                                        <p className="text-xl font-bold">1,245</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">99.2%</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-accent-steel uppercase font-bold tracking-widest">Échecs</p>
                                        <p className="text-xl font-bold">12</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">0.8%</span>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="flex justify-between text-[10px] text-accent-steel uppercase tracking-widest mb-2">
                                    <span>Charge Serveur</span>
                                    <span>14%</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent w-[14%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Automation;
