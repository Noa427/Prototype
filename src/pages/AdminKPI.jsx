import React, { useState, useEffect } from 'react';
import { Users, Target, CheckCircle, TrendingUp, ArrowUpRight, UserCheck, Building2, Car, Home } from 'lucide-react';
import { getAdminKPIs } from '../services/dealService';
import api from '../services/api';

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="glass p-6 rounded-xl border border-white/5">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
    </div>
);

// ── Tableau agences ──────────────────────────────────────────────────────────
const AgenciesTable = () => {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/admin/agencies/stats')
            .then(r => setAgencies(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const totalDeals = agencies.reduce((s, a) => s + (a.deal_count || 0), 0);
    const totalLeads = agencies.reduce((s, a) => s + (a.lead_count || 0), 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <StatCard label="Deals total" value={totalDeals} icon={Home} color="text-blue-500" />
                <StatCard label="Leads total" value={totalLeads} icon={Users} color="text-purple-500" />
            </div>
            <div className="glass rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-white text-sm">Agences</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/10">
                            {["Agence", "Lieu", "Statut", "Deals", "Leads", "Users", "Score moy."].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto" />
                            </td></tr>
                        ) : agencies.map((a, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3 font-medium text-white text-sm">{a.name}</td>
                                <td className="px-4 py-3 text-accent-steel text-xs">{a.location}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${a.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-accent-steel'}`}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-white font-bold text-sm">{a.deal_count}</td>
                                <td className="px-4 py-3 text-white text-sm">{a.lead_count}</td>
                                <td className="px-4 py-3 text-white text-sm">{a.user_count}</td>
                                <td className="px-4 py-3">
                                    <span className={`font-bold text-sm ${a.avg_score >= 7 ? 'text-emerald-400' : a.avg_score >= 5 ? 'text-amber-400' : 'text-accent-steel'}`}>
                                        {a.avg_score > 0 ? `${a.avg_score}/10` : '—'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── KPIs commerciaux ─────────────────────────────────────────────────────────
const CommercialsTable = () => {
    const [kpis, setKpis] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { getAdminKPIs().then(setKpis).finally(() => setLoading(false)); }, []);

    const totals = kpis.reduce((a, c) => ({
        leads: a.leads + c.total_leads,
        visits: a.visits + c.visits,
        conversions: a.conversions + c.conversions,
    }), { leads: 0, visits: 0, conversions: 0 });

    const avgRate = totals.leads > 0 ? (totals.conversions / totals.leads * 100).toFixed(1) : 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Leads" value={totals.leads} icon={Users} color="text-blue-500" />
                <StatCard label="Visites" value={totals.visits} icon={Target} color="text-purple-500" />
                <StatCard label="Conversions" value={totals.conversions} icon={CheckCircle} color="text-emerald-500" />
                <StatCard label="Taux moyen" value={`${avgRate}%`} icon={TrendingUp} color="text-amber-500" />
            </div>
            <div className="glass rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h3 className="font-bold text-white text-sm">Performance par commercial</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/10">
                            {["Commercial", "Leads", "Visites", "Conversions", "Taux", ""].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto" />
                            </td></tr>
                        ) : kpis.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-accent-steel text-sm">Aucun commercial.</td></tr>
                        ) : kpis.map(c => (
                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                                            <UserCheck className="w-3.5 h-3.5 text-accent" />
                                        </div>
                                        <span className="text-sm font-medium text-white">{c.full_name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-white text-sm">{c.total_leads}</td>
                                <td className="px-4 py-3 text-white text-sm">{c.visits}</td>
                                <td className="px-4 py-3 text-emerald-400 font-bold text-sm">{c.conversions}</td>
                                <td className="px-4 py-3 text-white text-sm">{c.conversion_rate}%</td>
                                <td className="px-4 py-3">
                                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent" style={{ width: `${Math.min(100, c.conversion_rate * 2)}%` }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Page principale ──────────────────────────────────────────────────────────
const AdminKPI = () => {
    const [tab, setTab] = useState('agencies');

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Super-Admin</h1>
                <p className="text-xs text-accent-steel uppercase tracking-widest mt-1">Vue globale multi-agences</p>
            </div>
            <div className="flex gap-2">
                {[
                    { id: 'agencies', label: 'Agences', icon: Building2 },
                    { id: 'commercials', label: 'Commerciaux', icon: UserCheck },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-accent text-white' : 'bg-white/5 text-accent-steel hover:text-white border border-white/10'}`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'agencies' ? <AgenciesTable /> : <CommercialsTable />}
        </div>
    );
};

export default AdminKPI;
