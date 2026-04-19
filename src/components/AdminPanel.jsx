import React from 'react';
import { Users, Shield, Plus, AlertTriangle, Activity, Bell, ChevronRight, X, AlertCircle, Info, Key } from 'lucide-react';
import { AgencyDetails } from './AgencyDetails';
import api from '../services/api';

export const AdminPanel = () => {
    const [selectedAgencyDetails, setSelectedAgencyDetails] = React.useState(null);
    const [agencies, setAgencies] = React.useState([]);
    const [notifications, setNotifications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [apiConfig, setApiConfig] = React.useState({ sms_api_key: '', email_api_key: '' });
    const [configLoading, setConfigLoading] = React.useState(false);
    const [configSaved, setConfigSaved] = React.useState(false);

    React.useEffect(() => {
        Promise.all([
            api.get('/admin/agencies/stats'),
            api.get('/notifications/'),
            api.get('/admin/config'),
        ]).then(([agenciesRes, notifRes, configRes]) => {
            setAgencies(agenciesRes.data.filter(a => a.id !== null));
            setNotifications(notifRes.data.slice(0, 5));
            setApiConfig(configRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const getAgencyHealth = (agency) => {
        if (agency.status === 'inactive' || agency.status === 'suspended' || agency.status === 'revoked') return 'critical';
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
            case 'healthy': return 'Actif';
            case 'warning': return 'Attention';
            case 'critical': return 'Critique';
            default: return 'Inconnu';
        }
    };

    const dismissNotification = async (notifId) => {
        try {
            await api.put(`/notifications/${notifId}/read`);
            setNotifications(notifications.filter(n => n.id !== notifId));
        } catch {
            setNotifications(notifications.filter(n => n.id !== notifId));
        }
    };

    const saveApiConfig = async () => {
        setConfigLoading(true);
        try {
            await api.put('/admin/config', apiConfig);
            setConfigSaved(true);
            setTimeout(() => setConfigSaved(false), 3000);
        } catch {
            // ignore
        } finally {
            setConfigLoading(false);
        }
    };

    const totalUsers = agencies.reduce((sum, a) => sum + (a.user_count || 0), 0);
    const activeAgencies = agencies.filter(a => a.status === 'active').length;
    const totalDeals = agencies.reduce((sum, a) => sum + (a.deal_count || 0), 0);

    const systemStats = [
        {
            label: 'Agences Actives',
            value: `${activeAgencies}/${agencies.length}`,
            icon: Activity,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20'
        },
        {
            label: 'Utilisateurs Total',
            value: String(totalUsers),
            icon: Users,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20'
        },
        {
            label: 'Deals Indexés',
            value: String(totalDeals),
            icon: Bell,
            color: 'text-accent',
            bgColor: 'bg-accent/10',
            borderColor: 'border-accent/20'
        }
    ];

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
                                    <p className="text-xs text-accent-steel">{notification.created_at}</p>
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
                    <p className="text-accent-steel mt-2">Gestion des agences et surveillance système</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg">
                    <Shield className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Accès Administrateur</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {systemStats.map((stat, index) => (
                    <div key={index} className={`glass rounded-xl border ${stat.borderColor} p-6`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 ${stat.bgColor} border ${stat.borderColor} rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white mb-1">{loading ? '…' : stat.value}</p>
                            <p className="text-sm text-accent-steel">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

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

                {loading ? (
                    <p className="text-accent-steel text-center py-8">Chargement…</p>
                ) : agencies.length === 0 ? (
                    <p className="text-accent-steel text-center py-8">Aucune agence configurée.</p>
                ) : (
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
                                            <span className="text-white font-medium">{agency.user_count}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-accent-steel">Deals</span>
                                            <span className="text-white font-medium">{agency.deal_count}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-accent-steel">Score moyen</span>
                                            <span className="text-white font-medium">{agency.avg_score}/10</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-accent-steel">Statut</span>
                                            <span className={`font-medium ${
                                                agency.status === 'active' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {agency.status === 'active' ? 'Actif' : agency.status}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedAgencyDetails(agency)}
                                        className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        Plus de détails
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="glass rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Key className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-bold text-white">Configuration des Services</h2>
                </div>
                {configSaved && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-green-400 text-sm">Configuration sauvegardée !</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Clé API SMS (Twilio)</label>
                        <input
                            type="password"
                            value={apiConfig.sms_api_key}
                            onChange={e => setApiConfig(c => ({ ...c, sms_api_key: e.target.value }))}
                            placeholder="SK••••••••••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Clé API Email (SendGrid)</label>
                        <input
                            type="password"
                            value={apiConfig.email_api_key}
                            onChange={e => setApiConfig(c => ({ ...c, email_api_key: e.target.value }))}
                            placeholder="SG.••••••••••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50"
                        />
                    </div>
                </div>
                <button
                    onClick={saveApiConfig}
                    disabled={configLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium"
                >
                    {configLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Key className="w-4 h-4" />
                    )}
                    Sauvegarder les clés
                </button>
            </div>

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
