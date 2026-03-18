import React, { useState } from 'react';
import { ArrowLeft, Users, Shield, Plus, Trash2, UserCheck, Activity, AlertTriangle, Eye, Edit } from 'lucide-react';

export const AgencyDetails = ({ agency, onBack }) => {
    const [activeTab, setActiveTab] = useState('users');

    // Logs spécifiques à cette agence
    const agencyLogs = {
        1: [ // Paris Centre
            { time: '14:30', user: 'marie.dubois', action: 'Consultation nouveau bien - 15ème arrondissement', type: 'view', status: 'success' },
            { time: '14:15', user: 'pierre.martin', action: 'Création rapport de visite', type: 'create', status: 'success' },
            { time: '13:45', user: 'sophie.laurent', action: 'Validation dossier client #2847', type: 'update', status: 'success' },
            { time: '13:20', user: 'marie.dubois', action: 'Connexion mobile', type: 'login', status: 'success' },
            { time: '12:55', user: 'pierre.martin', action: 'Upload photos bien #1234', type: 'upload', status: 'success' }
        ],
        2: [ // Lyon Presqu'île
            { time: '16:45', user: 'thomas.rousseau', action: 'Négociation prix - Appartement Bellecour', type: 'update', status: 'success' },
            { time: '16:20', user: 'antoine.leroy', action: 'Approbation commission agent', type: 'approve', status: 'success' },
            { time: '15:30', user: 'julie.moreau', action: 'Tentative de connexion échouée', type: 'error', status: 'error' },
            { time: '14:45', user: 'thomas.rousseau', action: 'Rendez-vous client programmé', type: 'create', status: 'success' },
            { time: '14:20', user: 'antoine.leroy', action: 'Révision objectifs trimestriels', type: 'update', status: 'success' }
        ],
        3: [ // Marseille Vieux-Port
            { time: '12:30', user: 'camille.blanc', action: 'Signature compromis de vente', type: 'success', status: 'success' },
            { time: '11:45', user: 'nicolas.fabre', action: 'Formation équipe - Nouvelles réglementations', type: 'training', status: 'success' },
            { time: '11:20', user: 'camille.blanc', action: 'Mise à jour fiche bien', type: 'update', status: 'success' },
            { time: '10:30', user: 'nicolas.fabre', action: 'Analyse marché local', type: 'analysis', status: 'success' },
            { time: '09:15', user: 'camille.blanc', action: 'Connexion système', type: 'login', status: 'success' }
        ],
        4: [ // Bordeaux Centre
            { time: '15:20', user: 'emilie.girard', action: 'Tentative de connexion échouée', type: 'error', status: 'error' },
            { time: '15:18', user: 'emilie.girard', action: 'Tentative de connexion échouée', type: 'error', status: 'error' },
            { time: '15:15', user: 'emilie.girard', action: 'Tentative de connexion échouée', type: 'error', status: 'error' },
            { time: '10:45', user: 'julien.roux', action: 'Dernière connexion avant maintenance', type: 'logout', status: 'warning' },
            { time: '10:30', user: 'system', action: 'Début maintenance programmée', type: 'system', status: 'warning' }
        ]
    };

    const logs = agencyLogs[agency.id] || [];

    return (
        <div className="p-8 space-y-8">
            {/* Header avec retour */}
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
                    <p className="text-accent-steel mt-2">{agency.location} • {agency.clientsCount} utilisateurs</p>
                </div>
            </div>

            {/* Onglets */}
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
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'logs' 
                            ? 'bg-accent text-white' 
                            : 'text-accent-steel hover:text-white hover:bg-white/10'
                    }`}
                >
                    Journal d'Activité
                </button>
            </div>

            {/* Contenu des onglets */}
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
                                {agency.clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                                                    {client.role === 'manager' ? (
                                                        <Shield className="w-4 h-4 text-accent" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4 text-blue-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{client.fullName}</p>
                                                    <p className="text-xs text-accent-steel">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                client.role === 'manager' 
                                                    ? 'bg-accent/20 text-accent border border-accent/30' 
                                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                                {client.role === 'manager' ? 'Manager' : 'Agent'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
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
                                        <td className="py-4 px-4">
                                            <span className="text-sm text-accent-steel">{client.lastLogin}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    className="p-2 text-accent-steel hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                    title="Voir détails"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                                                    title="Modifier"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            {activeTab === 'logs' && (
                <div className="glass rounded-xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold text-white">Journal d'Activité</h2>
                        <span className="text-sm text-accent-steel">({logs.length} activités aujourd'hui)</span>
                    </div>

                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-400">Succès</span>
                            </div>
                            <p className="text-xl font-bold text-white mt-1">
                                {logs.filter(log => log.status === 'success').length}
                            </p>
                        </div>
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm font-medium text-yellow-400">Avertissements</span>
                            </div>
                            <p className="text-xl font-bold text-white mt-1">
                                {logs.filter(log => log.status === 'warning').length}
                            </p>
                        </div>
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-medium text-red-400">Erreurs</span>
                            </div>
                            <p className="text-xl font-bold text-white mt-1">
                                {logs.filter(log => log.status === 'error').length}
                            </p>
                        </div>
                    </div>

                    {/* Liste des activités */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {logs.map((log, index) => (
                            <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <div className="text-xs text-accent-steel font-mono min-w-[40px]">{log.time}</div>
                                <div className={`w-2 h-2 rounded-full ${
                                    log.status === 'success' ? 'bg-green-500' :
                                    log.status === 'warning' ? 'bg-yellow-500' :
                                    log.status === 'error' ? 'bg-red-500' :
                                    'bg-accent'
                                }`} />
                                <div className="flex-1">
                                    <span className="text-sm text-white">{log.action}</span>
                                    <span className="text-xs text-accent-steel ml-2">par {log.user}</span>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    log.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                    log.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                    log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                                    'bg-accent/20 text-accent'
                                }`}>
                                    {log.status === 'error' ? 'Erreur' :
                                     log.status === 'warning' ? 'Attention' :
                                     log.status === 'success' ? 'Succès' :
                                     'Info'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
