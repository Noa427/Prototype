import React from 'react';
import { Shield, Key, Eye, EyeOff, Lock, Terminal, AlertTriangle } from 'lucide-react';

const apiKeys = [
    { name: "Perval API", key: "sk_live_************************4a2b", status: "Active" },
    { name: "DVF Data Engine", key: "sk_live_************************9f1e", status: "Active" },
    { name: "n8n Webhook Secret", key: "wh_sec_************************7c3d", status: "Warning" },
];

const logs = [
    { time: "17:45:12", event: "Connexion réussie - Admin", status: "success" },
    { time: "17:32:05", event: "Tentative d'accès bloquée - IP 192.168.1.45", status: "warning" },
    { time: "16:20:44", event: "Clé API 'Perval' utilisée", status: "info" },
    { time: "15:10:22", event: "Mise à jour du pare-feu terminée", status: "success" },
];

const Security = () => {
    const [showKeys, setShowKeys] = React.useState(false);

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Sécurité & Accès</h1>
                <button
                    onClick={() => setShowKeys(!showKeys)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg text-sm font-bold text-accent hover:bg-accent/20 transition-all"
                >
                    {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showKeys ? "Masquer les clés" : "Révéler les clés"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Key className="w-5 h-5 text-accent" />
                            <h2 className="font-bold">Gestion des Clés API</h2>
                        </div>
                        <div className="space-y-4">
                            {apiKeys.map((api, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                                    <div>
                                        <p className="text-sm font-bold mb-1">{api.name}</p>
                                        <code className="text-xs text-accent-steel font-mono">
                                            {showKeys ? api.key.replace(/\*/g, 'x') : api.key}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${api.status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {api.status}
                                        </span>
                                        <button className="p-2 hover:bg-white/10 rounded-md transition-colors">
                                            <Lock className="w-4 h-4 text-accent-steel" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Terminal className="w-5 h-5 text-accent" />
                            <h2 className="font-bold">Flux de Sécurité (Live)</h2>
                        </div>
                        <div className="space-y-3 font-mono text-xs">
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-4 p-2 border-l-2 border-white/10 hover:bg-white/5 transition-colors">
                                    <span className="text-accent-steel">[{log.time}]</span>
                                    <span className={
                                        log.status === 'success' ? 'text-green-500' :
                                            log.status === 'warning' ? 'text-red-500' : 'text-blue-400'
                                    }>
                                        {log.event}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass p-6 rounded-xl border-red-500/20 bg-red-500/5">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                            <h2 className="font-bold">Zone de Danger</h2>
                        </div>
                        <p className="text-xs text-accent-steel mb-6 leading-relaxed">
                            La révocation des clés API entraînera l'arrêt immédiat de tous les processus d'automatisation dépendants.
                        </p>
                        <button className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-bold hover:bg-red-500 hover:text-white transition-all">
                            Révoquer tous les accès
                        </button>
                    </div>

                    <div className="glass p-6 rounded-xl">
                        <h3 className="font-bold mb-4">Score de Santé</h3>
                        <div className="flex items-center justify-center py-8">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                                    <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="364" strokeDashoffset="36" className="text-accent" />
                                </svg>
                                <span className="absolute text-2xl font-bold">92%</span>
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-accent-steel uppercase tracking-widest">Système Sécurisé</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Security;
