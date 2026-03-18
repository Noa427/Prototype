import React from 'react';
import { Users, Shield, Plus, Trash2, UserCheck, AlertTriangle, Activity, Server, Bell, Eye, ChevronRight, X, AlertCircle, Info } from 'lucide-react';
import { AgencyDetails } from './AgencyDetails';

export const AdminPanel = () => {
    const [selectedAgencyDetails, setSelectedAgencyDetails] = React.useState(null);
    const [notifications, setNotifications] = React.useState([
        { id: 1, type: 'error', message: 'Agence Bordeaux Centre: 3 tentatives de connexion échouées', timestamp: '14:45', agency: 'Bordeaux Centre' },
        { id: 2, type: 'warning', message: 'Agence Lyon: Serveur de sauvegarde en maintenance', timestamp: '12:30', agency: 'Lyon Presqu\'île' },
        { id: 3, type: 'info', message: 'Nouvelle agence créée: AEVUM Nice', timestamp: '09:15', agency: 'Système' }
    ]);

    // Données simulées des agences et leurs clients
    const agencies = [
        {
            id: 1,
            name: 'AEVUM Paris Centre',
            location: 'Paris 1er',
            status: 'active',
            clientsCount: 12,
            lastActivity: '2024-01-15 14:30',
            clients: [
                { id: 1, username: 'agent_paris_1', fullName: 'Marie Dubois', email: 'marie.dubois@aevum.io', status: 'active', lastLogin: '2024-01-15 09:15', role: 'agent' },
                { id: 2, username: 'agent_paris_2', fullName: 'Pierre Martin', email: 'pierre.martin@aevum.io', status: 'active', lastLogin: '2024-01-15 08:45', role: 'agent' },
                { id: 3, username: 'manager_paris', fullName: 'Sophie Laurent', email: 'sophie.laurent@aevum.io', status: 'active', lastLogin: '2024-01-15 10:20', role: 'manager' }
            ]
        },
        {
            id: 2,
            name: 'AEVUM Lyon Presqu\'île',
            location: 'Lyon 2ème',
            status: 'active',
            clientsCount: 8,
            lastActivity: '2024-01-14 16:45',
            clients: [
                { id: 4, username: 'agent_lyon_1', fullName: 'Thomas Rousseau', email: 'thomas.rousseau@aevum.io', status: 'active', lastLogin: '2024-01-14 16:45', role: 'agent' },
                { id: 5, username: 'agent_lyon_2', fullName: 'Julie Moreau', email: 'julie.moreau@aevum.io', status: 'inactive', lastLogin: '2024-01-10 14:20', role: 'agent' },
                { id: 6, username: 'manager_lyon', fullName: 'Antoine Leroy', email: 'antoine.leroy@aevum.io', status: 'active', lastLogin: '2024-01-14 11:20', role: 'manager' }
            ]
        },
        {
            id: 3,
            name: 'AEVUM Marseille Vieux-Port',
            location: 'Marseille 1er',
            status: 'active',
            clientsCount: 6,
            lastActivity: '2024-01-13 12:30',
            clients: [
                { id: 7, username: 'agent_marseille_1', fullName: 'Camille Blanc', email: 'camille.blanc@aevum.io', status: 'active', lastLogin: '2024-01-13 12:30', role: 'agent' },
                { id: 8, username: 'manager_marseille', fullName: 'Nicolas Fabre', email: 'nicolas.fabre@aevum.io', status: 'active', lastLogin: '2024-01-13 09:15', role: 'manager' }
            ]
        },
        {
            id: 4,
            name: 'AEVUM Bordeaux Centre',
            location: 'Bordeaux',
            status: 'inactive',
            clientsCount: 4,
            lastActivity: '2024-01-08 15:20',
            clients: [
                { id: 9, username: 'agent_bordeaux_1', fullName: 'Émilie Girard', email: 'emilie.girard@aevum.io', status: 'inactive', lastLogin: '2024-01-08 15:20', role: 'agent' },
                { id: 10, username: 'manager_bordeaux', fullName: 'Julien Roux', email: 'julien.roux@aevum.io', status: 'inactive', lastLogin: '2024-01-08 10:45', role: 'manager' }
            ]
        }
    ];

    // Fonction pour calculer la santé d'une agence
    const getAgencyHealth = (agency) => {
        const errorLogs = agencyLogs[agency.id]?.filter(log => log.type === 'error').length || 0;
        const totalLogs = agencyLogs[agency.id]?.length || 0;
        
        if (agency.status === 'inactive') return 'critical';
        if (errorLogs >= 3) return 'critical';
        if (errorLogs >= 1) return 'warning';
        return 'healthy';
    };

    const getHealthColor = (health) => {
        switch (health) {
            case 'healthy': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'critical': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getHealthText = (health) => {
        switch (health) {
            case 'healthy': return 'Excellent';
            case 'warning': return 'Attention';
            case 'critical': return 'Critique';
            default: return 'Inconnu';
        }
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

    // Journal d'activité par agence
    const agencyLogs = {
        1: [ // Paris Centre
            { time: '14:30', user: 'marie.dubois', action: 'Consultation nouveau bien - 15ème arrondissement', type: 'view' },
            { time: '14:15', user: 'pierre.martin', action: 'Création rapport de visite', type: 'create' },
            { time: '13:45', user: 'sophie.laurent', action: 'Validation dossier client #2847', type: 'update' },
            { time: '13:20', user: 'marie.dubois', action: 'Connexion mobile', type: 'login' },
            { time: '12:55', user: 'pierre.martin', action: 'Upload photos bien #1234', type: 'upload' }
        ],
        2: [ // Lyon Presqu'île
            { time: '16:45', user: 'thomas.rousseau', action: 'Négociation prix - Appartement Bellecour', type: 'update' },
            { time: '16:20', user: 'antoine.leroy', action: 'Approbation commission agent', type: 'approve' },
            { time: '15:30', user: 'julie.moreau', action: 'Tentative de connexion échouée', type: 'error' },
            { time: '14:45', user: 'thomas.rousseau', action: 'Rendez-vous client programmé', type: 'create' },
            { time: '14:20', user: 'antoine.leroy', action: 'Révision objectifs trimestriels', type: 'update' }
        ],
        3: [ // Marseille Vieux-Port
            { time: '12:30', user: 'camille.blanc', action: 'Signature compromis de vente', type: 'success' },
            { time: '11:45', user: 'nicolas.fabre', action: 'Formation équipe - Nouvelles réglementations', type: 'training' },
            { time: '11:20', user: 'camille.blanc', action: 'Mise à jour fiche bien', type: 'update' },
            { time: '10:30', user: 'nicolas.fabre', action: 'Analyse marché local', type: 'analysis' },
            { time: '09:15', user: 'camille.blanc', action: 'Connexion système', type: 'login' }
        ],
        4: [ // Bordeaux Centre
            { time: '15:20', user: 'emilie.girard', action: 'Tentative de connexion échouée', type: 'error' },
            { time: '15:18', user: 'emilie.girard', action: 'Tentative de connexion échouée', type: 'error' },
            { time: '15:15', user: 'emilie.girard', action: 'Tentative de connexion échouée', type: 'error' },
            { time: '10:45', user: 'julien.roux', action: 'Dernière connexion avant maintenance', type: 'logout' },
            { time: '10:30', user: 'system', action: 'Début maintenance programmée', type: 'system' }
        ]
    };

    const dismissNotification = (notificationId) => {
        setNotifications(notifications.filter(notif => notif.id !== notificationId));
    };

    // Si une agence est sélectionnée pour les détails, afficher le composant AgencyDetails
    if (selectedAgencyDetails) {
        return (
            <AgencyDetails 
                agency={selectedAgencyDetails} 
                onBack={() => setSelectedAgencyDetails(null)} 
            />
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Système de notifications en haut */}
            {notifications.length > 0 && (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div key={notification.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                            notification.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                            notification.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                            'bg-blue-500/10 border-blue-500/20'
                        }`}>
                            <div className="flex items-center gap-3">
                                {notification.type === 'error' ? (
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                ) : notification.type === 'warning' ? (
                                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                ) : (
                                    <Info className="w-5 h-5 text-blue-400" />
                                )}
                                <div>
                                    <p className={`text-sm font-medium ${
                                        notification.type === 'error' ? 'text-red-400' :
                                        notification.type === 'warning' ? 'text-yellow-400' :
                                        'text-blue-400'
                                    }`}>
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-accent-steel">{notification.timestamp} - {notification.agency}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => dismissNotification(notification.id)}
                                className="p-1 text-accent-steel hover:text-white rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

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

            {/* Section Gestion des Agences avec indicateurs de santé */}
            <div className="glass rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold text-white">Gestion des Agences</h2>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200">
                        <Plus className="w-4 h-4" />
                        Nouvelle Agence
                    </button>
                </div>

                {/* Grille des agences avec indicateurs de santé */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {agencies.map((agency) => {
                        const health = getAgencyHealth(agency);
                        return (
                            <div key={agency.id} className="border border-white/10 rounded-lg p-6 bg-white/5 hover:bg-white/10 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full ${getHealthColor(health)} animate-pulse`} />
                                        <div>
                                            <h3 className="text-white font-semibold">{agency.name}</h3>
                                            <p className="text-xs text-accent-steel">{agency.location}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        health === 'healthy' ? 'bg-green-500/20 text-green-400' :
                                        health === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                        {getHealthText(health)}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-accent-steel">Utilisateurs</span>
                                        <span className="text-white font-medium">{agency.clientsCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-accent-steel">Statut</span>
                                        <span className={`font-medium ${
                                            agency.status === 'active' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {agency.status === 'active' ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-accent-steel">Dernière activité</span>
                                        <span className="text-white font-medium">{agency.lastActivity}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-accent-steel">Activités aujourd'hui</span>
                                        <span className="text-white font-medium">{agencyLogs[agency.id]?.length || 0}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedAgencyDetails(agency)}
                                    className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200 text-sm font-medium"
                                >
                                    Plus de détails
                                </button>
                            </div>
                        );
                    })}
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
