import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Shield, Plus, Trash2, UserCheck, Activity } from 'lucide-react';
import api from '../services/api';

export const AgencyDetails = ({ agency, onBack }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        if (!agency?.id) return;
        api.get(`/admin/agencies/${agency.id}/users`)
            .then(res => setUsers(res.data))
            .catch(console.error)
            .finally(() => setLoadingUsers(false));
    }, [agency?.id]);

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 text-accent-steel hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${
                            agency.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <h1 className="text-3xl font-bold tracking-tight text-white">{agency.name}</h1>
                    </div>
                    <p className="text-accent-steel mt-2">{agency.location} • {agency.user_count} utilisateurs</p>
                </div>
            </div>

            <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'users'
                            ? 'bg-accent text-white'
                            : 'text-accent-steel hover:text-white hover:bg-white/10'
                    }`}
                >
                    Utilisateurs
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'stats'
                            ? 'bg-accent text-white'
                            : 'text-accent-steel hover:text-white hover:bg-white/10'
                    }`}
                >
                    Statistiques
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="glass rounded-xl border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-accent" />
                            <h2 className="text-xl font-bold text-white">Gestion des Utilisateurs</h2>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200">
                            <Plus className="w-4 h-4" />
                            Ajouter Utilisateur
                        </button>
                    </div>

                    {loadingUsers ? (
                        <p className="text-accent-steel text-center py-8">Chargement…</p>
                    ) : users.length === 0 ? (
                        <p className="text-accent-steel text-center py-8">Aucun utilisateur dans cette agence.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">Utilisateur</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">Rôle</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">Statut</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                                                        {user.role === 'admin' || user.role === 'manager' ? (
                                                            <Shield className="w-4 h-4 text-accent" />
                                                        ) : (
                                                            <UserCheck className="w-4 h-4 text-blue-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{user.full_name}</p>
                                                        <p className="text-xs text-accent-steel">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    user.role === 'admin' || user.role === 'manager'
                                                        ? 'bg-accent/20 text-accent border border-accent/30'
                                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <span className={`text-xs font-medium ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                                        {user.is_active ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <button
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="glass rounded-xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold text-white">Statistiques</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-lg">
                            <p className="text-accent-steel text-sm">Deals indexés</p>
                            <p className="text-2xl font-bold text-white mt-1">{agency.deal_count ?? 0}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <p className="text-accent-steel text-sm">Leads actifs</p>
                            <p className="text-2xl font-bold text-white mt-1">{agency.lead_count ?? 0}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <p className="text-accent-steel text-sm">Score moyen</p>
                            <p className="text-2xl font-bold text-white mt-1">{agency.avg_score ?? 0}/10</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <p className="text-accent-steel text-sm">Utilisateurs</p>
                            <p className="text-2xl font-bold text-white mt-1">{agency.user_count ?? 0}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
