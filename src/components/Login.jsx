import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff } from 'lucide-react';

export const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulation d'une authentification
        setTimeout(() => {
            if (credentials.username === 'admin' && credentials.password === '1234') {
                onLogin({ username: 'admin', role: 'admin' });
            } else {
                setError('Identifiants incorrects');
            }
            setIsLoading(false);
        }, 1000);
    };

    const handleInputChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
            
            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="glass rounded-2xl border border-white/10 p-8 backdrop-blur-xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">SOL INVICTUS</h1>
                        <p className="text-accent-steel text-sm">Accès Agent Immobilier</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/90">Nom d'utilisateur</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-accent-steel" />
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-accent-steel focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                    placeholder="Entrez votre nom d'utilisateur"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/90">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-accent-steel" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-accent-steel focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                    placeholder="Entrez votre mot de passe"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-steel hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Connexion...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </button>
                    </form>

                    {/* Demo Info */}
                    <div className="mt-8 p-4 bg-accent/5 border border-accent/10 rounded-lg">
                        <p className="text-xs text-accent-steel text-center">
                            <strong className="text-accent">Demo:</strong> admin / 1234
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
