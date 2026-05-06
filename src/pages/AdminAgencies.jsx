import React, { useState, useEffect, useCallback } from 'react';
import { Building2, CheckCircle, PauseCircle, XCircle, Trash2, RefreshCw, Users, BarChart3, TrendingUp, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { AgencyDetails } from '../components/AgencyDetails';

const STATUS_CONFIG = {
    active:    { label: 'Actif',    cls: 'bg-green-500/10 text-green-400 border-green-500/20',  Icon: CheckCircle },
    suspended: { label: 'Suspendu', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  Icon: PauseCircle },
    revoked:   { label: 'Révoqué',  cls: 'bg-red-500/10 text-red-400 border-red-500/20',        Icon: XCircle },
};

const AdminAgencies = () => {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [selected, setSelected] = useState(null);

    const fetchAgencies = useCallback(() => {
        api.get('/api/admin/agencies/stats')
            .then(r => setAgencies(r.data.filter(a => a.id !== null)))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchAgencies();
        const id = setInterval(fetchAgencies, 30000);
        return () => clearInterval(id);
    }, [fetchAgencies]);

    const setStatus = async (e, id, status) => {
        e.stopPropagation();
        setBusy(id + status);
        try {
            await api.put(`/api/admin/agencies/${id}/status`, { status });
            setAgencies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
            if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
        } catch (e) { console.error(e); }
        finally { setBusy(null); }
    };

    const deleteAgency = async (e, id, name) => {
        e.stopPropagation();
        if (!window.confirm(`Supprimer définitivement « ${name} » ?`)) return;
        setBusy('del' + id);
        try {
            await api.delete(`/api/admin/agencies/${id}`);
            setAgencies(prev => prev.filter(a => a.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch (e) { console.error(e); }
        finally { setBusy(null); }
    };

    if (selected) {
        return (
            <AgencyDetails
                agency={selected}
                onBack={() => setSelected(null)}
                onStatusChange={(status) => {
                    setAgencies(prev => prev.map(a => a.id === selected.id ? { ...a, status } : a));
                    setSelected(prev => ({ ...prev, status }));
                }}
            />
        );
    }

    const totals = agencies.reduce((acc, a) => ({
        deals: acc.deals + (a.deal_count || 0),
        leads: acc.leads + (a.lead_count || 0),
        users: acc.users + (a.user_count || 0),
    }), { deals: 0, leads: 0, users: 0 });

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Agences</h1>
                    <p className="text-xs text-accent-steel uppercase tracking-widest mt-1">
                        {agencies.length} agence{agencies.length !== 1 ? 's' : ''} · refresh auto 30s
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

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Deals indexés', value: totals.deals, Icon: BarChart3, color: 'text-accent' },
                    { label: 'Leads actifs', value: totals.leads, Icon: TrendingUp, color: 'text-green-400' },
                    { label: 'Utilisateurs', value: totals.users, Icon: Users, color: 'text-blue-400' },
                ].map(({ label, value, Icon, color }) => (
                    <div key={label} className="glass rounded-xl border border-white/5 p-4 flex items-center gap-4">
                        <Icon className={`w-6 h-6 ${color} shrink-0`} />
                        <div>
                            <p className="text-2xl font-bold text-white">{value}</p>
                            <p className="text-xs text-accent-steel mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass rounded-xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/10">
                            {['Agence', 'Ville', 'Deals / Leads', 'Utilisateurs', 'Score moy.', 'Statut', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-10 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto" />
                            </td></tr>
                        ) : agencies.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-accent-steel text-sm">Aucune agence.</td></tr>
                        ) : agencies.map(a => {
                            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.active;
                            return (
                                <tr
                                    key={a.id}
                                    onClick={() => setSelected(a)}
                                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-accent shrink-0" />
                                            <span className="font-medium text-white text-sm group-hover:text-accent transition-colors">{a.name}</span>
                                            <ChevronRight className="w-3 h-3 text-accent-steel opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-accent-steel text-sm">{a.location}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-white text-sm font-medium">{a.deal_count ?? 0}</span>
                                        <span className="text-accent-steel text-xs"> / {a.lead_count ?? 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-accent-steel" />
                                            <span className="text-white text-sm">{a.user_count ?? 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm font-medium ${(a.avg_score || 0) >= 7 ? 'text-green-400' : (a.avg_score || 0) >= 5 ? 'text-amber-400' : 'text-accent-steel'}`}>
                                            {(a.avg_score || 0).toFixed(1)}<span className="text-accent-steel text-xs">/10</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${cfg.cls}`}>
                                            <cfg.Icon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            {a.status !== 'active' && (
                                                <button
                                                    onClick={e => setStatus(e, a.id, 'active')}
                                                    disabled={busy === a.id + 'active'}
                                                    className="px-2 py-1 rounded text-[10px] font-bold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                                                >Réactiver</button>
                                            )}
                                            {a.status === 'active' && (
                                                <button
                                                    onClick={e => setStatus(e, a.id, 'suspended')}
                                                    disabled={busy === a.id + 'suspended'}
                                                    className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                                                >Suspendre</button>
                                            )}
                                            <button
                                                onClick={e => deleteAgency(e, a.id, a.name)}
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
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminAgencies;
