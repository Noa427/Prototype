import React from 'react';
import { Users, Shield, Plus, Trash2, UserCheck, AlertTriangle, Activity, Server, Bell, Eye } from 'lucide-react';

export const AdminPanel = () => {
    // Données simulées des utilisateurs
    const users = [
        { 
            id: 1, 
            username: 'admin', 
            fullName: 'Administrateur Système',
            email: 'admin@sol-invictus.io',
            role: 'admin', 
            status: 'active', 
            lastLogin: '2024-01-15 14:30' 
        },
        { 
            id: 2, 
            username: 'client', 
            fullName: 'Agent Commercial',
            email: 'agent@sol-invictus.io',
            role: 'client', 
            status: 'active', 
            lastLogin: '2024-01-15 09:15' 
        },
        { 
            id: 3, 
            username: 'agent_paris', 
            fullName: 'Agent Paris Nord',
            email: 'paris@sol-invictus.io',
            role: 'client', 
            status: 'inactive', 
            lastLogin: '2024-01-10 16:45' 
        },
        { 
            id: 4, 
            username: 'manager_lyon', 
            fullName: 'Manager Lyon',
            email: 'lyon@sol-invictus.io',
            role: 'client', 
            status: 'active', 
            lastLogin: '2024-01-14 11:20' 
        }
    ];

    // Statistiques système simulées
    const systemStats = [
        { 
            label: 'Requêtes 24h', 
            value: '2,847', 
            change: '+12%', 
            icon: Activity, 
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20'
        },
        { 
            label: 'Serveurs Actifs', 
            value: '3/3', 
            change: '100%', 
            icon: Server, 
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20'
        },
        { 
            label: 'Alertes 24h', 
            value: '7', 
            change: '-23%', 
            icon: Bell, 
            color: 'text-accent',
            bgColor: 'bg-accent/10',
            borderColor: 'border-accent/20'
        }
    ];

    // Journal d'activité simulé
    const activityLogs = [
        { time: '14:30', user: 'admin', action: 'Connexion système', type: 'login' },
        { time: '09:15', user: 'client', action: 'Consultation dashboard', type: 'view' },
        { time: '08:45', user: 'agent_paris', action: 'Tentative de connexion échouée', type: 'error' },
        { time: '23:12', user: 'system', action: 'Sauvegarde automatique', type: 'system' },
        { time: '22:30', user: 'manager_lyon', action: 'Modification profil', type: 'update' }
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Panneau d'Administration</h1>
                    <p className="text-accent-steel mt-2">Gestion des utilisateurs et surveillance système</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg">
                    <Shield className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Accès Administrateur</span>
                </div>
            </div>

            {/* Statistiques Système */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {systemStats.map((stat, index) => (
                    <div key={index} className={`glass rounded-xl border ${stat.borderColor} p-6`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 ${stat.bgColor} border ${stat.borderColor} rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className={`text-xs font-medium ${stat.color}`}>{stat.change}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                            <p className="text-sm text-accent-steel">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section Gestion des Utilisateurs */}
            <div className="glass rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold text-white">Gestion des Utilisateurs</h2>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200">
                        <Plus className="w-4 h-4" />
                        Créer Utilisateur
                    </button>
                </div>

                {/* Tableau des utilisateurs */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">
                                    Utilisateur
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">
                                    Rôle
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">
                                    Dernière Connexion
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-accent-steel uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                                                {user.role === 'admin' ? (
                                                    <Shield className="w-4 h-4 text-accent" />
                                                ) : (
                                                    <UserCheck className="w-4 h-4 text-blue-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{user.fullName}</p>
                                                <p className="text-xs text-accent-steel">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            user.role === 'admin' 
                                                ? 'bg-accent/20 text-accent border border-accent/30' 
                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        }`}>
                                            {user.role === 'admin' ? 'Administrateur' : 'Client'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                            <span className={`text-xs font-medium ${
                                                user.status === 'active' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {user.status === 'active' ? 'Actif' : 'Inactif'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm text-accent-steel">{user.lastLogin}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                className="p-2 text-accent-steel hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                title="Voir détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {user.role !== 'admin' && (
                                                <button 
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Supprimer (Admin uniquement)"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Journal d'Activité */}
            <div className="glass rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-bold text-white">Journal d'Activité</h2>
                </div>
                <div className="space-y-3">
                    {activityLogs.map((log, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                            <div className="text-xs text-accent-steel font-mono">{log.time}</div>
                            <div className={`w-2 h-2 rounded-full ${
                                log.type === 'login' ? 'bg-green-500' :
                                log.type === 'error' ? 'bg-red-500' :
                                log.type === 'system' ? 'bg-blue-500' :
                                'bg-accent'
                            }`} />
                            <div className="flex-1">
                                <span className="text-sm text-white">{log.action}</span>
                                <span className="text-xs text-accent-steel ml-2">par {log.user}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Note d'information */}
            <div className="p-4 bg-accent/5 border border-accent/10 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-accent">Permissions Administrateur</p>
                        <p className="text-xs text-accent-steel mt-1">
                            Seuls les administrateurs peuvent créer, modifier ou supprimer des comptes utilisateur. 
                            Toutes les actions sont enregistrées dans le journal d'activité.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
