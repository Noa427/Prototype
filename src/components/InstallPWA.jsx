import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISSED_KEY = 'aevum_pwa_dismissed_until';

export const InstallPWA = () => {
    const [prompt, setPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Ne pas afficher si déjà installée (mode standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        // Ne pas afficher si dismissée récemment
        const until = localStorage.getItem(DISMISSED_KEY);
        if (until && Date.now() < parseInt(until)) return;

        const handler = (e) => {
            e.preventDefault();
            setPrompt(e);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!prompt) return;
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') setVisible(false);
        setPrompt(null);
    };

    const handleDismiss = () => {
        localStorage.setItem(DISMISSED_KEY, Date.now() + 7 * 24 * 3600 * 1000);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm mx-4 px-4">
            <div className="glass border border-accent/30 rounded-xl p-4 flex items-center gap-3 shadow-2xl">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Installer AEVUM</p>
                    <p className="text-[11px] text-accent-steel">Accès rapide depuis votre écran d'accueil</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleInstall}
                        className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                        Installer
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-accent-steel hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWA;
