import React, { useState, useEffect, useCallback } from 'react';
import { Building2, CheckCircle, PauseCircle, XCircle, Trash2, RefreshCw, Clock } from 'lucide-react';
import api from '../services/api';

const STATUS_CONFIG = {
    active:    { label: 'Actif',    cls: 'bg-green-500/10 text-green-400',  icon: CheckCircle },
    suspended: { label: 'Suspendu', cls: 'bg-amber-500/10 text-amber-400',  icon: PauseCircle },
    revoked:   { label: 'Révoqué',  cls: 'bg-red-500/10 text-red-400',      icon: XCircle },
};

const heartbeatAge = (dt) => {
    if (!dt) return null;
    const diffMs = Date.now() - new Date(dt).getTime();
    const diffH = diffMs / 3600000;
    if (diffH < 1) return { label: `${Math.round(diffMs / 60000)} min`, stale: false };
    if (diffH < 2) return { label: `${Math.round(diffH)} h`, stale: false };
    return { label: `${Math.round(diffH)} h`, stale: true };
};

const AdminAgencies = () => {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);

    const fetchAgencies = useCallback(() => {
        api.get('/api/admin/agencies/stats')
            .then(r => setAgencies(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchAgencies();
        const id = setInterval(fetchAgencies, 30000);
        return () => clearInterval(id);
    }, [fetchAgencies]);

    const setStatus = async (id, status) => {
        setBusy(id + status);
        try {
            await api.put(`/api/admin/agencies/${id}/status`, { status });
            setAgencies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const deleteAgency = async (id, name) => {
        if (!window.confirm(`Supprimer définitivement « ${name} » ?`)) return;
        setBusy('del' + id);
        try {
            await api.delete(`/api/admin/agencies/${id}`);
            setAgencies(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Agences</h1>
                    <p className="text-xs text-accent-steel uppercase tracking-widest mt-1">
                        Gestion des licences client — refresh auto 30 s
                    </p>
                </div>
                <button
                    onClick={fetchAgencies}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-accent-steel hover:text-white text-xs transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rafraîchir
                </button>
            </div>

            <div className="glass rounded-xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/10">
                            {['Agence', 'Email/Lieu', 'Plan', 'Statut', 'Heartbeat', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto" />
                            </td></tr>
                        ) : agencies.filter(a => a.id !== null).map(a => {
                            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.active;
                            const hb = heartbeatAge(a.last_heartbeat);
                            return (
                                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-accent shrink-0" />
                                            <span className="font-medium text-white text-sm">{a.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-accent-steel text-xs">{a.location}</td>
                                    <td className="px-4 py-3 text-accent-steel text-xs">—</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${cfg.cls}`}>
                                            <cfg.icon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {hb ? (
                                            <span className={`flex items-center gap-1 text-xs ${hb.stale ? 'text-red-400' : 'text-green-400'}`}>
                                                <Clock className="w-3 h-3" />
                                                {hb.label}
                                            </span>
                                        ) : (
                                            <span className="text-accent-steel text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {a.status !== 'active' && (
                                                <button
                                                    onClick={() => setStatus(a.id, 'active')}
                                                    disabled={busy === a.id + 'active'}
                                                    className="px-2 py-1 rounded text-[10px] font-bold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                                                >
                                                    Réactiver
                                                </button>
                                            )}
                                            {a.status === 'active' && (
                                                <button
                                                    onClick={() => setStatus(a.id, 'suspended')}
                                                    disabled={busy === a.id + 'suspended'}
                                                    className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                                                >
                                                    Suspendre
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteAgency(a.id, a.name)}
                                                disabled={busy === 'del' + a.id}
                                                className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && agencies.filter(a => a.id !== null).length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-accent-steel text-sm">Aucune agence.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminAgencies;
