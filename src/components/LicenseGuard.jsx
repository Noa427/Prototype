import React from 'react';
import { ShieldX, RefreshCw } from 'lucide-react';
import { useLicense } from '../hooks/useLicense';

// Wraps l'app cliente : bloque l'UI si licence suspended/revoked
const LicenseGuard = ({ children }) => {
    const { status, agencyName, isBlocked } = useLicense();

    // Pas de clé configurée → on laisse passer (dev / admin)
    if (status === 'no_key') return children;

    if (status === 'checking') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
        );
    }

    if (isBlocked) {
        const label = status === 'suspended' ? 'Licence suspendue' : 'Licence révoquée';
        const msg = status === 'suspended'
            ? 'Votre accès a été temporairement suspendu. Contactez votre administrateur.'
            : 'Votre licence a été révoquée. Veuillez renouveler votre abonnement.';
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="glass rounded-2xl border border-red-500/20 p-10 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                        <ShieldX className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white">{label}</h1>
                    {agencyName && <p className="text-xs text-accent-steel uppercase tracking-widest">{agencyName}</p>}
                    <p className="text-sm text-accent-steel">{msg}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-accent-steel hover:text-white text-sm transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default LicenseGuard;
