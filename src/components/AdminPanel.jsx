import React from 'react';
import { Users, Shield, Plus, Trash2, UserCheck, AlertTriangle, Activity, Server, Bell, Eye, ChevronRight } from 'lucide-react';

export const AdminPanel = () => {
    const [selectedAgency, setSelectedAgency] = React.useState(null);
    const [expandedAgencies, setExpandedAgencies] = React.useState(new Set());

    // Données simulées des agences et leurs clients
    const agencies = [
        {
            id: 1,
            name: 'Sol Invictus Paris Centre',
            location: 'Paris 1er',
            status: 'active',
            clientsCount: 12,
            lastActivity: '2024-01-15 14:30',
            clients: [
                { id: 1, username: 'agent_paris_1', fullName: 'Marie Dubois', email: 'marie.dubois@sol-invictus.io', status: 'active', lastLogin: '2024-01-15 09:15', role: 'agent' },
                { id: 2, username: 'agent_paris_2', fullName: 'Pierre Martin', email: 'pierre.martin@sol-invictus.io', status: 'active', lastLogin: '2024-01-15 08:45', role: 'agent' },
                { id: 3, username: 'manager_paris', fullName: 'Sophie Laurent', email: 'sophie.laurent@sol-invictus.io', status: 'active', lastLogin: '2024-01-15 10:20', role: 'manager' }
            ]
        },
        {
            id: 2,
            name: 'Sol Invictus Lyon Presqu\'île',
            location: 'Lyon 2ème',
            status: 'active',
            clientsCount: 8,
            lastActivity: '2024-01-14 16:45',
            clients: [
                { id: 4, username: 'agent_lyon_1', fullName: 'Thomas Rousseau', email: 'thomas.rousseau@sol-invictus.io', status: 'active', lastLogin: '2024-01-14 16:45', role: 'agent' },
                { id: 5, username: 'agent_lyon_2', fullName: 'Julie Moreau', email: 'julie.moreau@sol-invictus.io', status: 'inactive', lastLogin: '2024-01-10 14:20', role: 'agent' },
                { id: 6, username: 'manager_lyon', fullName: 'Antoine Leroy', email: 'antoine.leroy@sol-invictus.io', status: 'active', lastLogin: '2024-01-14 11:20', role: 'manager' }
            ]
        },
        {
            id: 3,
            name: 'Sol Invictus Marseille Vieux-Port',
            location: 'Marseille 1er',
            status: 'active',
            clientsCount: 6,
            lastActivity: '2024-01-13 12:30',
            clients: [
                { id: 7, username: 'agent_marseille_1', fullName: 'Camille Blanc', email: 'camille.blanc@sol-invictus.io', status: 'active', lastLogin: '2024-01-13 12:30', role: 'agent' },
                { id: 8, username: 'manager_marseille', fullName: 'Nicolas Fabre', email: 'nicolas.fabre@sol-invictus.io', status: 'active', lastLogin: '2024-01-13 09:15', role: 'manager' }
            ]
        },
        {
            id: 4,
            name: 'Sol Invictus Bordeaux Centre',
            location: 'Bordeaux',
            status: 'inactive',
            clientsCount: 4,
            lastActivity: '2024-01-08 15:20',
            clients: [
                { id: 9, username: 'agent_bordeaux_1', fullName: 'Émilie Girard', email: 'emilie.girard@sol-invictus.io', status: 'inactive', lastLogin: '2024-01-08 15:20', role: 'agent' },
                { id: 10, username: 'manager_bordeaux', fullName: 'Julien Roux', email: 'julien.roux@sol-invictus.io', status: 'inactive', lastLogin: '2024-01-08 10:45', role: 'manager' }
            ]
        }
    ];

    const toggleAgencyExpansion = (agencyId) => {
        const newExpanded = new Set(expandedAgencies);
        if (newExpanded.has(agencyId)) {
            newExpanded.delete(agencyId);
        } else {
            newExpanded.add(agencyId);
        }
        setExpandedAgencies(newExpanded);
    };

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

            {/* Section Gestion des Agences */}
            <div className="glass rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold text-white">Gestion des Agences</h2>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200">
                            <Plus className="w-4 h-4" />
                            Nouvelle Agence
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200">
                            <Plus className="w-4 h-4" />
                            Nouvel Utilisateur
                        </button>
                    </div>
                </div>

                {/* Liste des agences */}
                <div className="space-y-4">
                    {agencies.map((agency) => (
                        <div key={agency.id} className="border border-white/10 rounded-lg overflow-hidden">
                            {/* En-tête de l'agence */}
                            <div 
                                className="p-4 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200"
                                onClick={() => toggleAgencyExpansion(agency.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${
                                            agency.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                        }`} />
                                        <div>
                                            <h3 className="text-white font-semibold">{agency.name}</h3>
                                            <p className="text-xs text-accent-steel">{agency.location}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm text-white font-medium">{agency.clientsCount} utilisateurs</p>
                                            <p className="text-xs text-accent-steel">Dernière activité: {agency.lastActivity}</p>
                                        </div>
                                        <div className={`transform transition-transform duration-200 ${
                                            expandedAgencies.has(agency.id) ? 'rotate-90' : ''
                                        }`}>
                                            <ChevronRight className="w-5 h-5 text-accent-steel" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Liste des clients de l'agence */}
                            {expandedAgencies.has(agency.id) && (
                                <div className="border-t border-white/10">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/5">
                                                    <th className="text-left py-2 px-4 text-xs font-medium text-accent-steel uppercase tracking-wider">
                                                        Utilisateur
                                                    </th>
                                                    <th className="text-left py-2 px-4 text-xs font-medium text-accent-steel uppercase tracking-wider">
                                                        Rôle
                                                    </th>
                                                    <th className="text-left py-2 px-4 text-xs font-medium text-accent-steel uppercase tracking-wider">
                                                        Statut
                                                    </th>
                                                    <th className="text-left py-2 px-4 text-xs font-medium text-accent-steel uppercase tracking-wider">
                                                        Dernière Connexion
                                                    </th>
                                                    <th className="text-left py-2 px-4 text-xs font-medium text-accent-steel uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {agency.clients.map((client) => (
                                                    <tr key={client.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                                                                    {client.role === 'manager' ? (
                                                                        <Shield className="w-3 h-3 text-accent" />
                                                                    ) : (
                                                                        <UserCheck className="w-3 h-3 text-blue-400" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-white text-sm font-medium">{client.fullName}</p>
                                                                    <p className="text-xs text-accent-steel">{client.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                client.role === 'manager' 
                                                                    ? 'bg-accent/20 text-accent border border-accent/30' 
                                                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            }`}>
                                                                {client.role === 'manager' ? 'Manager' : 'Agent'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    client.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                                                }`} />
                                                                <span className={`text-xs font-medium ${
                                                                    client.status === 'active' ? 'text-green-400' : 'text-red-400'
                                                                }`}>
                                                                    {client.status === 'active' ? 'Actif' : 'Inactif'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="text-xs text-accent-steel">{client.lastLogin}</span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    className="p-1.5 text-accent-steel hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                                    title="Voir détails"
                                                                >
                                                                    <Eye className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
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
