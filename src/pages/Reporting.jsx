import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, CheckCircle, Download, RefreshCw, FileText } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';

const StatCard = ({ label, value, sub, icon: Icon, accent = false }) => (
    <div className={`glass p-5 rounded-xl border ${accent ? 'border-accent/30' : 'border-white/10'} flex items-center gap-4`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-accent/20' : 'bg-white/5'}`}>
            <Icon className={`w-5 h-5 ${accent ? 'text-accent' : 'text-accent-steel'}`} />
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-accent-steel">{label}</p>
            {sub && <p className="text-[10px] text-accent mt-0.5 font-medium">{sub}</p>}
        </div>
    </div>
);

const SimpleBar = ({ label, value, max, color = 'bg-accent' }) => (
    <div className="flex items-center gap-3">
        <span className="text-xs text-accent-steel w-24 text-right capitalize">{label}</span>
        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: max ? `${(value / max) * 100}%` : '0%' }} />
        </div>
        <span className="text-xs font-bold text-white w-8 text-right">{value}</span>
    </div>
);

const STATUS_COLORS = {
    new: 'bg-blue-400', contacted: 'bg-amber-400',
    qualified: 'bg-purple-400', visit_scheduled: 'bg-cyan-400',
    converted: 'bg-green-400', lost: 'bg-red-400',
};

const Reporting = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/leads/stats');
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handlePDFReport = () => {
        if (!user?.agency_id) return;
        api.get(`/api/admin/agencies/${user.agency_id}/report`, { responseType: 'blob' })
            .then(r => {
                const url = URL.createObjectURL(r.data);
                const a = document.createElement('a');
                a.href = url; a.download = 'rapport_mensuel.docx'; a.click();
                URL.revokeObjectURL(url);
            })
            .catch(console.error);
    };

    const handleExport = () => {
        api.get('/api/leads/export', { responseType: 'blob' })
            .then(r => {
                const url = URL.createObjectURL(r.data);
                const a = document.createElement('a');
                a.href = url; a.download = 'leads.csv'; a.click();
                URL.revokeObjectURL(url);
            })
            .catch(console.error);
    };

    const parStatut = stats?.par_statut || {};
    const maxVal = Math.max(1, ...Object.values(parStatut));

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <TrendingUp className="w-7 h-7 text-accent" />Reporting
                    </h1>
                    <p className="text-accent-steel text-sm mt-1">Vue d'ensemble de votre pipeline commercial</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchStats}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-accent-steel hover:text-white text-sm transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                        <Download className="w-4 h-4" />Export CSV
                    </button>
                    {user?.role === 'admin' && (
                        <button onClick={handlePDFReport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors">
                            <FileText className="w-4 h-4" />Rapport .docx
                        </button>
                    )}
                </div>
            </div>

            {loading && !stats ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard label="Total leads" value={stats?.total ?? 0} icon={Users} accent />
                        <StatCard label="Taux de conversion" value={`${stats?.taux_conversion ?? 0}%`} icon={TrendingUp} />
                        <StatCard label="Convertis" value={parStatut['converted'] ?? 0} icon={CheckCircle} />
                    </div>

                    <div className="glass p-6 rounded-xl border border-white/10 space-y-4">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider">Répartition par statut</h2>
                        <div className="space-y-3">
                            {Object.entries(parStatut).length === 0 ? (
                                <p className="text-accent-steel text-xs text-center py-4">Aucune donnée</p>
                            ) : Object.entries(parStatut).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                                <SimpleBar key={status} label={status} value={count} max={maxVal}
                                    color={STATUS_COLORS[status] || 'bg-accent'} />
                            ))}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl border border-white/10">
                        <h2 className="font-bold text-white text-sm uppercase tracking-wider mb-4">Données brutes</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        {['Statut', 'Nombre', '% du total'].map(h => (
                                            <th key={h} className="text-left py-2 px-3 text-accent-steel font-bold uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(parStatut).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                                        <tr key={status} className="border-b border-white/5 hover:bg-white/3">
                                            <td className="py-2 px-3 text-white capitalize">{status}</td>
                                            <td className="py-2 px-3 font-bold text-white">{count}</td>
                                            <td className="py-2 px-3 text-accent-steel">
                                                {stats?.total ? Math.round(count / stats.total * 100) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reporting;
