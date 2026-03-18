import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle, TrendingUp, ArrowUpRight, Clock, MapPin, Zap, Activity } from 'lucide-react';
import { generateRandomDeal, getScoreColor, getScoreLabel } from '../services/dealService';

const metrics = [
    { label: "Nouveaux Biens", value: "14", sub: "Dernières 24h", icon: Building2, color: "text-accent" },
    { label: "Alertes Prioritaires", value: "3", sub: "Action requise", icon: AlertCircle, color: "text-red-500" },
    { label: "Estimation Marché", value: "+1.2%", sub: "Secteur Paris 15", icon: TrendingUp, color: "text-green-500" },
];

export const Dashboard = () => {
    const [deals, setDeals] = useState([]);
    const [isScanning, setIsScanning] = useState(true);
    const [flashingDeal, setFlashingDeal] = useState(null);
    const [sortBy, setSortBy] = useState('score-desc'); // score-desc, score-asc, price-asc, price-desc

    // Génération automatique de nouveaux biens toutes les 10 secondes
    useEffect(() => {
        // Générer quelques biens initiaux
        const initialDeals = Array.from({ length: 3 }, () => ({
            ...generateRandomDeal(),
            isNew: false
        }));
        setDeals(initialDeals);

        const interval = setInterval(() => {
            const newDeal = generateRandomDeal();
            
            setDeals(prevDeals => {
                const updatedDeals = [newDeal, ...prevDeals.slice(0, 9)]; // Limite à 10 éléments
                return updatedDeals;
            });

            // Animation flash pour le nouveau bien
            setFlashingDeal(newDeal.id);
            setTimeout(() => {
                setFlashingDeal(null);
                setDeals(prevDeals => 
                    prevDeals.map(deal => 
                        deal.id === newDeal.id ? { ...deal, isNew: false } : deal
                    )
                );
            }, 2000);
        }, 10000); // 10 secondes

        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(price);
    };

    // Fonction de tri des biens
    const sortDeals = (dealsToSort) => {
        const sorted = [...dealsToSort];
        switch (sortBy) {
            case 'score-desc':
                return sorted.sort((a, b) => b.aevumScore - a.aevumScore);
            case 'score-asc':
                return sorted.sort((a, b) => a.aevumScore - b.aevumScore);
            case 'price-asc':
                return sorted.sort((a, b) => a.price - b.price);
            case 'price-desc':
                return sorted.sort((a, b) => b.price - a.price);
            default:
                return sorted;
        }
    };

    const getSortLabel = (sortValue) => {
        switch (sortValue) {
            case 'score-desc': return 'Score AEVUM (meilleur → moins bon)';
            case 'score-asc': return 'Score AEVUM (moins bon → meilleur)';
            case 'price-asc': return 'Prix (moins cher → plus cher)';
            case 'price-desc': return 'Prix (plus cher → moins cher)';
            default: return 'Tri par défaut';
        }
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header avec indicateur de flux */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Bonjour, Agent</h1>
                        <p className="text-accent-steel">Voici l'état de votre secteur aujourd'hui.</p>
                    </div>
                    
                    {/* Indicateur de flux en direct */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <Zap className="w-4 h-4 text-accent" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-accent">AEVUM ENGINE</p>
                            <p className="text-xs text-accent-steel">Flux en direct : SCAN EN COURS...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="glass p-6 rounded-xl border border-white/5">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-white/5 ${m.color}`}>
                                <m.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">{m.sub}</span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-accent-steel mb-1">{m.label}</p>
                        <p className="text-3xl font-bold text-white">{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Section des biens en temps réel */}
            <div className="glass p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent" />
                        Flux AEVUM - Opportunités Détectées
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-accent-steel">
                            <Clock className="w-4 h-4" />
                            <span>Mise à jour toutes les 10s</span>
                        </div>
                        
                        {/* Sélecteur de tri */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-accent-steel">Trier par :</span>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/50 cursor-pointer"
                            >
                                <option value="score-desc" className="bg-background text-white">Score AEVUM ↓</option>
                                <option value="score-asc" className="bg-background text-white">Score AEVUM ↑</option>
                                <option value="price-asc" className="bg-background text-white">Prix ↑</option>
                                <option value="price-desc" className="bg-background text-white">Prix ↓</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Indicateur de tri actuel */}
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span className="text-sm text-accent">Tri actuel : {getSortLabel(sortBy)}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortDeals(deals).map((deal) => {
                        const scoreColors = getScoreColor(deal.aevumScore);
                        const isFlashing = flashingDeal === deal.id;
                        
                        return (
                            <div 
                                key={deal.id} 
                                className={`p-4 border rounded-lg transition-all duration-500 cursor-pointer hover:bg-white/10 ${
                                    isFlashing 
                                        ? 'bg-green-500/20 border-green-500/50 animate-pulse' 
                                        : 'bg-white/5 border-white/10'
                                }`}
                            >
                                {/* Header avec score AEVUM */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-accent-steel" />
                                        <span className="text-sm font-medium text-white">
                                            {deal.city} {deal.district}
                                        </span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${scoreColors.bg} ${scoreColors.text} ${scoreColors.border} border`}>
                                        {deal.aevumScore}/100 • {getScoreLabel(deal.aevumScore)}
                                    </div>
                                </div>

                                {/* Détails du bien */}
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-accent-steel">{deal.propertyType}</span>
                                        <span className="text-sm font-medium text-white">{deal.surface} m²</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-accent-steel">Prix</span>
                                        <span className="text-sm font-bold text-white">{formatPrice(deal.price)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-accent-steel">Loyer/mois</span>
                                        <span className="text-sm font-medium text-accent">{formatPrice(deal.monthlyRent)}</span>
                                    </div>
                                </div>

                                {/* Métriques financières */}
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                                    <div className="text-center">
                                        <p className="text-xs text-accent-steel">Rendement</p>
                                        <p className="text-sm font-bold text-green-400">{deal.grossYield}%</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-accent-steel">Cash-flow</p>
                                        <p className={`text-sm font-bold ${deal.netCashFlow > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {deal.netCashFlow > 0 ? '+' : ''}{deal.netCashFlow}€
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-accent-steel">DPE</p>
                                        <p className={`text-sm font-bold ${
                                            ['A', 'B', 'C'].includes(deal.dpe) ? 'text-green-400' : 
                                            ['D', 'E'].includes(deal.dpe) ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                            {deal.dpe}
                                        </p>
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="mt-3 pt-2 border-t border-white/5">
                                    <p className="text-xs text-accent-steel">
                                        Détecté il y a {Math.floor((Date.now() - deal.timestamp) / 1000)}s
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {deals.length === 0 && (
                    <div className="text-center py-8">
                        <Activity className="w-8 h-8 text-accent-steel mx-auto mb-2 animate-spin" />
                        <p className="text-accent-steel">Initialisation du moteur AEVUM...</p>
                    </div>
                )}
            </div>

            {/* Graphique d'activité du marché */}
            <div className="glass p-6 rounded-xl">
                <h2 className="font-bold text-lg text-white mb-6">Activité du Marché</h2>
                <div className="flex-1 flex items-end gap-3 px-2 h-32">
                    {[30, 45, 60, 40, 70, 85, 65, 90, 75, 80].map((h, i) => (
                        <div key={i} className="flex-1 bg-accent/20 border-t border-accent/40 rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                </div>
                <div className="flex justify-between mt-4 text-[10px] text-accent-steel uppercase tracking-widest">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
