import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Activity, Shield, UserCheck, BarChart3, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';

const ROLE_CONFIG = {
    gérant:  { label: 'Gérant',     cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    agent:   { label: 'Agent',      cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    admin:   { label: 'Superadmin', cls: 'bg-accent/20 text-accent border-accent/30' },
};

export const AgencyDetails = ({ agency, onBack, onStatusChange }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [togglingId, setTogglingId] = useState(null);

    useEffect(() => {
        if (!agency?.id) return;
        setLoadingUsers(true);
        api.get(`/api/admin/agencies/${agency.id}/users`)
            .then(res => setUsers(res.data))
            .catch(console.error)
            .finally(() => setLoadingUsers(false));
    }, [agency?.id]);

    const toggleUser = async (userId) => {
        setTogglingId(userId);
        try {
            const res = await api.put(`/api/admin/users/${userId}/toggle`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
        } catch (e) { console.error(e); }
        finally { setTogglingId(null); }
    };

    const activeUsers = users.filter(u => u.is_active).length;
    const gerants = users.filter(u => u.role === 'gérant').length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 text-accent-steel hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${agency.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <h1 className="text-2xl font-bold tracking-tight text-white">{agency.name}</h1>
                        <span className="text-accent-steel text-sm">·</span>
                        <span className="text-accent-steel text-sm">{agency.location}</span>
                    </div>
                    <p className="text-xs text-accent-steel mt-1 uppercase tracking-widest">
                        {agency.user_count} utilisateur{agency.user_count !== 1 ? 's' : ''} · {agency.deal_count} deals · score moy. {agency.avg_score}/10
                    </p>
                </div>
                {/* Status actions */}
                <div className="flex gap-2">
                    {agency.status !== 'active' && (
                        <button
                            onClick={() => onStatusChange && api.put(`/api/admin/agencies/${agency.id}/status`, { status: 'active' }).then(() => onStatusChange('active'))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                        >Réactiver</button>
                    )}
                    {agency.status === 'active' && (
                        <button
                            onClick={() => onStatusChange && api.put(`/api/admin/agencies/${agency.id}/status`, { status: 'suspended' }).then(() => onStatusChange('suspended'))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                        >Suspendre</button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
                {[
                    { id: 'users', label: 'Utilisateurs', Icon: Users },
                    { id: 'stats', label: 'Statistiques', Icon: Activity },
                ].map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === id
                                ? 'bg-accent text-white'
                                : 'text-accent-steel hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Users tab */}
            {activeTab === 'users' && (
                <div className="glass rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-accent" />
                            <h2 className="font-semibold text-white">Comptes</h2>
                            <span className="text-xs text-accent-steel">{activeUsers} actif{activeUsers !== 1 ? 's' : ''} · {gerants} gérant{gerants !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {loadingUsers ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
                        </div>
                    ) : users.length === 0 ? (
                        <p className="text-accent-steel text-center py-10 text-sm">Aucun utilisateur dans cette agence.</p>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/10">
                                    {['Utilisateur', 'Identifiant', 'Rôle', 'Statut', 'Action'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map(u => {
                                    const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.agent;
                                    const RoleIcon = u.role === 'gérant' ? Shield : UserCheck;
                                    return (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                        <RoleIcon className={`w-4 h-4 ${u.role === 'gérant' ? 'text-orange-400' : 'text-blue-400'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-sm font-medium">{u.full_name}</p>
                                                        <p className="text-xs text-accent-steel">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-accent-steel text-xs font-mono">{u.username}</td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${roleCfg.cls}`}>
                                                    {roleCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                                        {u.is_active ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => toggleUser(u.id)}
                                                    disabled={togglingId === u.id || u.role === 'admin'}
                                                    title={u.is_active ? 'Désactiver' : 'Activer'}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40 ${
                                                        u.is_active
                                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                    }`}
                                                >
                                                    {togglingId === u.id ? (
                                                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : u.is_active ? (
                                                        <><ToggleRight className="w-3.5 h-3.5" />Désactiver</>
                                                    ) : (
                                                        <><ToggleLeft className="w-3.5 h-3.5" />Activer</>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Stats tab */}
            {activeTab === 'stats' && (
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Deals indexés', value: agency.deal_count ?? 0, Icon: BarChart3, color: 'text-accent' },
                        { label: 'Leads actifs', value: agency.lead_count ?? 0, Icon: TrendingUp, color: 'text-green-400' },
                        { label: 'Score moyen', value: `${agency.avg_score ?? 0}/10`, Icon: Activity, color: 'text-amber-400' },
                        { label: 'Utilisateurs', value: agency.user_count ?? 0, Icon: Users, color: 'text-blue-400' },
                    ].map(({ label, value, Icon, color }) => (
                        <div key={label} className="glass rounded-xl border border-white/5 p-6 flex items-center gap-4">
                            <Icon className={`w-8 h-8 ${color} shrink-0`} />
                            <div>
                                <p className="text-2xl font-bold text-white">{value}</p>
                                <p className="text-sm text-accent-steel mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
