import React, { useState, useEffect } from 'react';
import { Users, Target, CheckCircle, TrendingUp, ArrowUpRight, UserCheck } from 'lucide-react';
import { getAdminKPIs } from '../services/dealService';

export const AdminKPI = () => {
    const [kpis, setKpis] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchKPIs();
    }, []);

    const fetchKPIs = async () => {
        setLoading(true);
        const data = await getAdminKPIs();
        setKpis(data);
        setLoading(false);
    };

    const totalStats = kpis.reduce((acc, curr) => ({
        leads: acc.leads + curr.total_leads,
        visits: acc.visits + curr.visits,
        conversions: acc.conversions + curr.conversions
    }), { leads: 0, visits: 0, conversions: 0 });

    const avgConversionRate = kpis.length > 0
        ? (totalStats.conversions / totalStats.leads * 100).toFixed(2)
        : 0;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Performance Commerciale</h1>
                <p className="text-accent-steel">Analyse des KPIs et du tunnel de conversion</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Total Leads" value={totalStats.leads} icon={Users} color="text-blue-500" />
                <StatCard label="Visites Prévues" value={totalStats.visits} icon={Target} color="text-purple-500" />
                <StatCard label="Conversions" value={totalStats.conversions} icon={CheckCircle} color="text-emerald-500" />
                <StatCard label="Taux Moyen" value={`${avgConversionRate}%`} icon={TrendingUp} color="text-amber-500" />
            </div>

            <div className="glass rounded-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h3 className="font-bold text-white">Performance par Commercial</h3>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/10">
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Commercial</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Leads</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Visites</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Conversions</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Taux</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel text-right">Progression</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                                </td>
                            </tr>
                        ) : kpis.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-accent-steel">Aucun commercial trouvé.</td>
                            </tr>
                        ) : (
                            kpis.map((comm) => (
                                <tr key={comm.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                <UserCheck className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-white">{comm.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">{comm.total_leads}</td>
                                    <td className="px-6 py-4 text-white font-medium">{comm.visits}</td>
                                    <td className="px-6 py-4 text-emerald-400 font-bold">{comm.conversions}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{comm.conversion_rate}%</span>
                                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="w-32 h-1.5 bg-white/5 rounded-full ml-auto overflow-hidden">
                                            <div
                                                className="h-full bg-accent rounded-full"
                                                style={{ width: `${Math.min(100, comm.conversion_rate * 2)}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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

export default AdminKPI;
