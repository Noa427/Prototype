import React, { useState } from 'react';
import { User, Lock, Bell, Shield, ChevronRight, LogOut, Save } from 'lucide-react';
import { useAuth } from '../App';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

export const Settings = () => {
    const { user, userSettings, updateUserProfile, updateUserSettings, logout } = useAuth();
    const [profile, setProfile] = useState({
        fullName: user?.fullName || '',
        email: user?.email || ''
    });
    const [notifications, setNotifications] = useState(userSettings.notifications);
    const [isSaving, setIsSaving] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

    const handleProfileSave = async () => {
        setIsSaving(true);
        // Simulation d'une sauvegarde
        setTimeout(() => {
            updateUserProfile(profile);
            setIsSaving(false);
        }, 500);
    };

    const handleNotificationToggle = (key) => {
        const newNotifications = {
            ...notifications,
            [key]: !notifications[key]
        };
        setNotifications(newNotifications);
        updateUserSettings({ notifications: newNotifications });
    };

    const handlePasswordChange = (passwords) => {
        // Ici vous pourriez valider le mot de passe actuel avec le serveur
        // Pour la démo, on simule juste le succès
        console.log('Changement de mot de passe:', passwords);
        setPasswordChangeSuccess(true);
        setTimeout(() => setPasswordChangeSuccess(false), 3000);
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="p-8 max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Paramètres du Compte</h1>

            <div className="space-y-6">
                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5 text-accent" />
                        <h2 className="font-bold text-white">Profil de l'Agent</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Nom Complet</label>
                            <input 
                                type="text" 
                                value={profile.fullName}
                                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Email Professionnel</label>
                            <input 
                                type="email" 
                                value={profile.email}
                                onChange={(e) => setProfile({...profile, email: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Rôle</label>
                            <input 
                                type="text" 
                                value={user?.role === 'admin' ? 'Administrateur' : 'Client'}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-accent-steel cursor-not-allowed" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Nom d'utilisateur</label>
                            <input 
                                type="text" 
                                value={user?.username}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-accent-steel cursor-not-allowed" 
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={handleProfileSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-lg transition-all duration-200"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Sauvegarde...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Sauvegarder le profil
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-5 h-5 text-accent" />
                        <h2 className="font-bold text-white">Sécurité</h2>
                    </div>
                    
                    {/* Message de succès */}
                    {passwordChangeSuccess && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-green-400 text-sm">Mot de passe modifié avec succès !</p>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group text-left"
                    >
                        <div>
                            <p className="text-sm font-bold text-white">Changer le mot de passe</p>
                            <p className="text-xs text-accent-steel mt-1">Dernière modification il y a 3 mois</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-accent-steel group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-5 h-5 text-accent" />
                        <h2 className="font-bold text-white">Préférences de Notifications</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { key: 'newProperties', label: "Alertes Nouveaux Biens", desc: "Recevoir une notification dès qu'un bien correspond à vos critères." },
                            { key: 'zoneReports', label: "Rapports de Zone", desc: "Résumé hebdomadaire de l'évolution des prix dans votre secteur." },
                            { key: 'securityAlerts', label: "Alertes de Sécurité", desc: "Notifications sur les tentatives de connexion suspectes." },
                        ].map((pref) => (
                            <div key={pref.key} className="flex items-center justify-between py-2">
                                <div>
                                    <p className="text-sm font-bold text-white">{pref.label}</p>
                                    <p className="text-xs text-accent-steel mt-0.5">{pref.desc}</p>
                                </div>
                                <button 
                                    onClick={() => handleNotificationToggle(pref.key)}
                                    className={`w-10 h-5 rounded-full relative transition-all duration-200 ${
                                        notifications[pref.key] ? 'bg-accent' : 'bg-white/20'
                                    }`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${
                                        notifications[pref.key] ? 'left-6' : 'left-1'
                                    }`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-red-500 font-bold text-sm hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Déconnexion de la session
                    </button>
                </div>
            </div>

            {/* Modal de changement de mot de passe */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSave={handlePasswordChange}
            />
        </div>
    );
};

export default Settings;
