import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Save } from 'lucide-react';

export const ChangePasswordModal = ({ isOpen, onClose, onSave }) => {
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setPasswords(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            setError('Tous les champs sont obligatoires');
            return;
        }

        if (passwords.new.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (passwords.new !== passwords.confirm) {
            setError('Les nouveaux mots de passe ne correspondent pas');
            return;
        }

        setIsLoading(true);

        // Simulation d'une sauvegarde
        setTimeout(() => {
            onSave(passwords);
            setIsLoading(false);
            setPasswords({ current: '', new: '', confirm: '' });
            onClose();
        }, 1000);
    };

    const handleClose = () => {
        setPasswords({ current: '', new: '', confirm: '' });
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass rounded-xl border border-white/10 p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold text-white">Changer le mot de passe</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 text-accent-steel hover:text-white rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Mot de passe actuel */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/90">Mot de passe actuel</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-accent-steel" />
                            <input
                                type={showPasswords.current ? "text" : "password"}
                                value={passwords.current}
                                onChange={(e) => handleInputChange('current', e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-accent-steel focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                placeholder="Entrez votre mot de passe actuel"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-steel hover:text-white transition-colors"
                            >
                                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Nouveau mot de passe */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/90">Nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-accent-steel" />
                            <input
                                type={showPasswords.new ? "text" : "password"}
                                value={passwords.new}
                                onChange={(e) => handleInputChange('new', e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-accent-steel focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                placeholder="Entrez votre nouveau mot de passe"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-steel hover:text-white transition-colors"
                            >
                                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirmer le nouveau mot de passe */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/90">Confirmer le nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-accent-steel" />
                            <input
                                type={showPasswords.confirm ? "text" : "password"}
                                value={passwords.confirm}
                                onChange={(e) => handleInputChange('confirm', e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-accent-steel focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                placeholder="Confirmez votre nouveau mot de passe"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-steel hover:text-white transition-colors"
                            >
                                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Message d'erreur */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Boutons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Sauvegarde...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Sauvegarder
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Conseils de sécurité */}
                <div className="mt-6 p-3 bg-accent/5 border border-accent/10 rounded-lg">
                    <p className="text-xs text-accent-steel">
                        <strong className="text-accent">Conseils :</strong> Utilisez un mot de passe fort avec au moins 8 caractères, 
                        incluant des majuscules, minuscules, chiffres et symboles.
                    </p>
                </div>
            </div>
        </div>
    );
};
