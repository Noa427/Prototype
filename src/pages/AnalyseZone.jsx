import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, MapPin, Building2, Star, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getStats } from '../services/dealService';
import api from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ── Mini-calendrier ──────────────────────────────────────────────────────────
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const MiniCalendar = ({ slots }) => {
    const [cur, setCur] = useState(new Date());
    const today = new Date();

    const year = cur.getFullYear();
    const month = cur.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=dim
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Convertir firstDay pour lundi=0
    const offset = (firstDay + 6) % 7;

    // Slots: {"2026-04-21": ["09:00", "10:00"], ...}
    const hasSlot = (d) => {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return slots[iso]?.length > 0;
    };
    const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const [selDay, setSelDay] = useState(null);
    const selIso = selDay ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selDay).padStart(2, '0')}` : null;
    const selSlots = selIso ? (slots[selIso] || []) : [];

    return (
        <div className="glass rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />Créneaux disponibles
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCur(new Date(year, month - 1))} className="p-1 rounded hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-white w-28 text-center">{MOIS[month]} {year}</span>
                    <button onClick={() => setCur(new Date(year, month + 1))} className="p-1 rounded hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {JOURS.map((j, i) => (
                    <div key={i} className="text-center text-[9px] font-bold text-accent-steel uppercase py-1">{j}</div>
                ))}
                {cells.map((d, i) => (
                    <div key={i}>
                        {d === null ? <div /> : (
                            <button
                                onClick={() => setSelDay(d === selDay ? null : d)}
                                className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors flex items-center justify-center relative
                                    ${isToday(d) ? 'border border-accent/50' : ''}
                                    ${d === selDay ? 'bg-accent text-white' : hasSlot(d) ? 'bg-accent/15 text-accent hover:bg-accent/25' : 'text-accent-steel hover:bg-white/5'}`}
                            >
                                {d}
                                {hasSlot(d) && d !== selDay && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {selDay && (
                <div className="border-t border-white/10 pt-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-steel">
                        {selDay} {MOIS[month]} — {selSlots.length} créneau(x)
                    </p>
                    {selSlots.length === 0 ? (
                        <p className="text-xs text-accent-steel">Aucun créneau ce jour.</p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {selSlots.map(s => (
                                <span key={s} className="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-xs text-accent font-medium">{s}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Tooltip personnalisé ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-xs shadow-xl">
            <p className="font-bold text-white mb-1">{label}</p>
            <p className="text-accent">{payload[0]?.value?.toLocaleString()} €/m²</p>
            <p className="text-accent-steel">{payload[0]?.payload?.count} bien(s)</p>
        </div>
    );
};

// ── Couleur barre selon prix ─────────────────────────────────────────────────
const barColor = (val) => {
    if (val >= 12000) return '#ef4444';
    if (val >= 9000) return '#f59e0b';
    return '#10b981';
};

// ── Page principale ──────────────────────────────────────────────────────────
const AnalyseZone = () => {
    const [zoneData, setZoneData] = useState([]);
    const [topDeals, setTopDeals] = useState([]);
    const [stats, setStats] = useState({ total_deals: 0, avg_price: 0, avg_yield: 0 });
    const [slots, setSlots] = useState({});
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [z, t, s] = await Promise.all([
                api.get('/api/trends/price_by_zone').then(r => r.data).catch(() => []),
                api.get('/api/trends/top_deals').then(r => r.data).catch(() => []),
                getStats().catch(() => ({ total_deals: 0, avg_price: 0, avg_yield: 0 })),
            ]);
            setZoneData(z);
            setTopDeals(t);
            setStats(s);

            // Charger les créneaux des 30 prochains jours
            const today = new Date();
            const slotMap = {};
            const promises = [];
            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const iso = d.toISOString().slice(0, 10);
                promises.push(
                    api.get(`/api/calendar/slots?date=${iso}`)
                        .then(r => { if (r.data.slots?.length) slotMap[iso] = r.data.slots; })
                        .catch(() => {})
                );
            }
            await Promise.all(promises);
            setSlots(slotMap);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const statCards = [
        { label: 'Biens analysés', value: stats.total_deals.toLocaleString(), color: 'text-blue-400', sub: 'dans la DB' },
        { label: 'Prix moyen', value: stats.avg_price > 0 ? `${Math.round(stats.avg_price).toLocaleString()} €` : '—', color: 'text-amber-400', sub: 'par bien' },
        { label: 'Rendement moyen', value: stats.avg_yield > 0 ? `${stats.avg_yield}%` : '—', color: 'text-emerald-400', sub: 'brut annuel' },
        { label: 'Zones couvertes', value: zoneData.length, color: 'text-purple-400', sub: 'codes postaux' },
    ];

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-accent" />Analyse de Zone
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-accent-steel">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-sm">Secteur analysé en temps réel</span>
                    </div>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-accent-steel hover:text-white transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className="glass p-5 rounded-xl border border-white/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel mb-2">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</p>
                        <p className="text-[10px] text-accent-steel mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Layout 2 colonnes */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Graphique prix par zone — 2/3 */}
                <div className="xl:col-span-2 glass p-6 rounded-xl border border-white/10 space-y-4">
                    <h2 className="font-bold text-white text-sm">Prix moyen au m² par code postal</h2>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : zoneData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-accent-steel">
                            <Building2 className="w-10 h-10 opacity-30" />
                            <p className="text-sm">Aucun bien dans la base encore.</p>
                            <p className="text-xs opacity-60">Lancez un scraper pour alimenter les données.</p>
                        </div>
                    ) : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={zoneData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="zone" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false}
                                        tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="avg_pm2" radius={[6, 6, 0, 0]}>
                                        {zoneData.map((entry, i) => (
                                            <Cell key={i} fill={barColor(entry.avg_pm2)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex gap-4 mt-2 justify-center">
                                {[['≥12k €', '#ef4444'], ['9-12k €', '#f59e0b'], ['<9k €', '#10b981']].map(([l, c]) => (
                                    <div key={l} className="flex items-center gap-1.5 text-[10px] text-accent-steel">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                                        {l}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mini-calendrier — 1/3 */}
                <MiniCalendar slots={slots} />
            </div>

            {/* Top deals */}
            <div className="glass rounded-xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" />
                    <h2 className="font-bold text-white text-sm">Top 5 — Meilleures opportunités</h2>
                </div>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : topDeals.length === 0 ? (
                    <p className="text-center text-accent-steel text-sm py-10">Aucun bien scoré disponible.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Zone', 'Prix', 'Surface', 'Rendement', 'Score', ''].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {topDeals.map(d => (
                                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3 font-medium text-white">
                                        {d.city} <span className="text-accent-steel text-xs">{d.postal_code}</span>
                                    </td>
                                    <td className="px-5 py-3 text-white font-bold">
                                        {d.price ? `${d.price.toLocaleString()} €` : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-accent-steel">{d.surface ? `${d.surface} m²` : '—'}</td>
                                    <td className="px-5 py-3">
                                        <span className={`font-bold ${(d.gross_yield || 0) >= 6 ? 'text-emerald-400' : (d.gross_yield || 0) >= 4 ? 'text-amber-400' : 'text-accent-steel'}`}>
                                            {d.gross_yield ? `${d.gross_yield}%` : '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                                            ${(d.score || 0) >= 8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : (d.score || 0) >= 5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : 'bg-white/5 text-accent-steel border-white/10'}`}>
                                            {d.score ?? '—'}/10
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {d.url && (
                                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                                                className="text-accent-steel hover:text-accent transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AnalyseZone;
