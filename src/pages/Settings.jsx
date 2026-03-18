import React from 'react';
import { User, Lock, Bell, Shield, ChevronRight, LogOut } from 'lucide-react';

export const Settings = () => {
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
                            <input type="text" defaultValue="Agent Sol Invictus" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Email Professionnel</label>
                            <input type="email" defaultValue="agent@sol-invictus.io" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent/50" />
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-5 h-5 text-accent" />
                        <h2 className="font-bold text-white">Sécurité</h2>
                    </div>
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group text-left">
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
                            { label: "Alertes Nouveaux Biens", desc: "Recevoir une notification dès qu'un bien correspond à vos critères." },
                            { label: "Rapports de Zone", desc: "Résumé hebdomadaire de l'évolution des prix dans votre secteur." },
                            { label: "Alertes de Sécurité", desc: "Notifications sur les tentatives de connexion suspectes." },
                        ].map((pref, i) => (
                            <div key={i} className="flex items-center justify-between py-2">
                                <div>
                                    <p className="text-sm font-bold text-white">{pref.label}</p>
                                    <p className="text-xs text-accent-steel mt-0.5">{pref.desc}</p>
                                </div>
                                <button className="w-10 h-5 bg-accent rounded-full relative">
                                    <div className="absolute top-1 left-6 w-3 h-3 bg-white rounded-full" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <button className="flex items-center gap-2 text-red-500 font-bold text-sm hover:text-red-400 transition-colors">
                        <LogOut className="w-4 h-4" />
                        Déconnexion de la session
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
