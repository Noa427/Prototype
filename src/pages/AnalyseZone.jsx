import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { getTrends, getStats } from '../services/dealService';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend
} from 'recharts';

export const AnalyseZone = () => {
    const [trends, setTrends] = useState([]);
    const [stats, setStats] = useState({ total_deals: 0, avg_price: 0, avg_yield: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const trendData = await getTrends();
                const statData = await getStats();
                setTrends(trendData);
                setStats(statData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const displayStats = [
        { label: "Prix Moyen m²", value: `${stats.avg_price.toLocaleString()} €`, change: "+2.4%", trend: "up" },
        { label: "Rendement Moyen", value: `${stats.avg_yield}%`, change: "+0.5", trend: "up" },
        { label: "Total Opportunités", value: stats.total_deals, change: "Live", trend: "up" },
    ];

    // Prepare data for Recharts
    // The API returns [{ month: '2024-01', '75012': 8500, ... }, ...]
    // We want to show the average of all postal codes if multiple exist, or just the ones present.
    const chartData = trends.map(t => {
        const keys = Object.keys(t).filter(k => k !== 'month');
        const avg = keys.length > 0
            ? keys.reduce((sum, k) => sum + t[k], 0) / keys.length
            : 0;
        return {
            ...t,
            average: Math.round(avg)
        };
    });

    const postalCodes = trends.length > 0
        ? Object.keys(trends[0]).filter(k => k !== 'month')
        : [];

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Analyse de Zone</h1>
                    <div className="flex items-center gap-2 mt-2 text-accent-steel">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">Secteur: Paris Intra-muros</span>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-accent-steel hover:text-white transition-all">
                    <Info className="w-4 h-4" />
                    Méthodologie
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayStats.map((stat, i) => (
                    <div key={i} className="glass p-6 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel mb-2">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {stat.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass p-8 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-lg text-white">Évolution des Prix au m²</h3>
                </div>

                {loading ? (
                    <div className="h-80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    </div>
                ) : (
                    <div className="h-80 w-full">
                        {trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(str) => str.split('-')[1] + '/' + str.split('-')[0].slice(2)}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}€`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                    {postalCodes.map((pc, i) => (
                                        <Line
                                            key={pc}
                                            type="monotone"
                                            dataKey={pc}
                                            stroke={colors[i % colors.length]}
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: colors[i % colors.length], strokeWidth: 0 }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            name={`CP ${pc}`}
                                        />
                                    ))}
                                    <Line
                                        type="monotone"
                                        dataKey="average"
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        name="Moyenne"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-accent-steel text-sm">
                                Pas assez de données historiques pour le graphique.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyseZone;
