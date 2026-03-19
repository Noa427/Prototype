import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle, TrendingUp, ArrowUpRight, Clock, MapPin, Zap, Activity, Wifi, WifiOff, X, ExternalLink, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateRandomDeal, getScoreColor, getScoreLabel, getNextDeal, getDataStatus } from '../services/dealService';

const metrics = [
    { label: "Nouveaux Biens", value: "14", sub: "Dernières 24h", icon: Building2, color: "text-accent" },
    { label: "Alertes Prioritaires", value: "3", sub: "Action requise", icon: AlertCircle, color: "text-red-500" },
    { label: "Estimation Marché", value: "+1.2%", sub: "Secteur Paris 15", icon: TrendingUp, color: "text-green-500" },
];

const DealDetailPanel = ({ deal, onClose, formatPrice, getScoreColor }) => {
    const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);
    const photos = deal.photos && deal.photos.length > 0 ? deal.photos : ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"];

    const nextPhoto = (e) => {
        e.stopPropagation();
        setActivePhotoIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-[500px]">
                    <div className="h-full flex flex-col bg-gray-900 shadow-2xl border-l border-white/10 animate-in slide-in-from-right duration-300">
                        {/* Header with Carousel */}
                        <div className="relative h-72 w-full overflow-hidden group/carousel">
                            <img
                                src={`https://images.weserv.nl/?url=${encodeURIComponent(photos[activePhotoIndex] || (deal.photos && deal.photos[0]))}`}
                                alt={`${deal.propertyType} - Photo ${activePhotoIndex + 1}`}
                                className="w-full h-full object-cover transition-all duration-500"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'; }}
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

                            {/* Navigation Buttons */}
                            {photos.length > 1 && (
                                <>
                                    <button
                                        onClick={prevPhoto}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all border border-white/10 opacity-0 group-hover/carousel:opacity-100"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={nextPhoto}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all border border-white/10 opacity-0 group-hover/carousel:opacity-100"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    {/* Photo Indicator */}
                                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {photos.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activePhotoIndex ? 'bg-accent w-4' : 'bg-white/30'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1 bg-black/50 hover:bg-gray-800 hover:text-red-500 rounded-full text-white transition-colors duration-200 border border-white/10 z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-4 left-6 right-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest rounded border border-accent/30">
                                        {deal.propertyType}
                                    </span>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getScoreColor(deal.aevumScore).bg} ${getScoreColor(deal.aevumScore).text} ${getScoreColor(deal.aevumScore).border}`}>
                                        SCORE: {deal.aevumScore}/100
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white">{formatPrice(deal.price)}</h3>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Surface</p>
                                    <p className="text-lg font-bold text-white">{deal.surface} m²</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Loyer Estimé</p>
                                    <p className="text-lg font-bold text-accent">{formatPrice(deal.monthlyRent)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Rendement Brut</p>
                                    <p className="text-lg font-bold text-green-400">{deal.grossYield}%</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Cash-flow Net</p>
                                    <p className={`text-lg font-bold ${deal.netCashFlow > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {deal.netCashFlow > 0 ? '+' : ''}{deal.netCashFlow}€
                                    </p>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-xl border border-accent/10">
                                <MapPin className="w-5 h-5 text-accent" />
                                <div>
                                    <p className="text-xs text-accent-steel uppercase tracking-widest">Localisation</p>
                                    <p className="text-sm font-medium text-white">{deal.city} {deal.district}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-accent" />
                                    Analyse de la cible
                                </h4>
                                <p className="text-sm text-accent-steel leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5 italic">
                                    "{deal.description || "Aucune description détaillée disponible pour cette opportunité."}"
                                </p>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="p-6 border-t border-white/10 bg-gray-900/50 backdrop-blur-md">
                            <button
                                onClick={() => window.open(deal.url, '_blank', 'noopener,noreferrer')}
                                className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)] group"
                            >
                                <span>ATTAQUER CETTE CIBLE</span>
                                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Dashboard = () => {
    const [deals, setDeals] = useState([]);
    const [isScanning, setIsScanning] = useState(true);
    const [flashingDeal, setFlashingDeal] = useState(null);
    const [sortBy, setSortBy] = useState('score-desc'); // score-desc, score-asc, price-asc, price-desc
    const [apiStatus, setApiStatus] = useState('checking'); // 'online', 'offline', 'checking', 'error'
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [dataStatus, setDataStatus] = useState(null);

    // Génération automatique avec protection anti-race conditions
    useEffect(() => {
        let isMounted = true; // Protection contre les race conditions
        let intervalId = null;

        // Map pour garantir l'unicité absolue des IDs
        const dealIds = new Set();

        const initializeDeals = async () => {
            if (!isMounted) return;

            try {
                const result = await getNextDeal();
                
                if (!isMounted) return; // Vérification après async

                // Gestion silencieuse des erreurs - pas de blocage utilisateur
                if (result.error) {
                    setApiStatus('offline');
                    setIsScanning(false);
                    // Continuer avec des données de secours au lieu de bloquer
                }

                setApiStatus(result.source === 'api' ? 'online' : 'offline');

                const initialDeals = result.deals
                    .filter(deal => deal && deal.id) // Validation stricte
                    .map(deal => {
                        dealIds.add(deal.id);
                        return { ...deal, isNew: false };
                    });

                // Ajouter quelques biens supplémentaires pour la démo
                const additionalDeals = [];
                for (let i = 0; i < 2; i++) {
                    const randomDeal = generateRandomDeal();
                    if (!dealIds.has(randomDeal.id)) {
                        dealIds.add(randomDeal.id);
                        additionalDeals.push({ ...randomDeal, isNew: false });
                    }
                }

                if (isMounted) {
                    setDeals([...initialDeals, ...additionalDeals]);
                    setIsScanning(false);
                }
            } catch (error) {
                console.error('💥 Erreur initialisation:', error);
                if (isMounted) {
                    setApiStatus('error');
                    setIsScanning(false);
                }
            }
        };

        const addNewDeal = async () => {
            if (!isMounted) return;

            try {
                const result = await getNextDeal();
                
                if (!isMounted || !result.deals || result.deals.length === 0) return;

                const newDeal = result.deals[0];
                
                // Validation et protection anti-doublon ABSOLUE
                if (!newDeal || !newDeal.id || dealIds.has(newDeal.id)) {
                    return;
                }

                setApiStatus(result.source === 'api' ? 'online' : 'offline');

                setDeals(prevDeals => {
                    // Double vérification anti-doublon
                    if (prevDeals.some(deal => deal.id === newDeal.id)) {
                        return prevDeals;
                    }

                    // Ajouter à la Map de tracking
                    dealIds.add(newDeal.id);

                    // Animation flash UNIQUEMENT pour les vrais nouveaux
                    if (isMounted) {
                        setFlashingDeal(newDeal.id);
                        setTimeout(() => {
                            if (isMounted) {
                                setFlashingDeal(null);
                                setDeals(currentDeals =>
                                    currentDeals.map(deal =>
                                        deal.id === newDeal.id ? { ...deal, isNew: false } : deal
                                    )
                                );
                            }
                        }, 2000);
                    }

                    // Ajout en haut + limite à 12 biens
                    return [newDeal, ...prevDeals.slice(0, 11)];
                });
            } catch (error) {
                console.error('💥 Erreur ajout deal:', error);
            }
        };

        // Initialisation
        initializeDeals();

        // Intervalle protégé
        intervalId = setInterval(addNewDeal, 10000);

        // Cleanup function
        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []); // Dépendances vides pour éviter les re-renders

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
                            <div className={`w-2 h-2 rounded-full animate-pulse ${apiStatus === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                            {apiStatus === 'online' ? (
                                <Wifi className="w-4 h-4 text-accent" />
                            ) : (
                                <WifiOff className="w-4 h-4 text-yellow-500" />
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-accent">AEVUM ENGINE</p>
                            <p className="text-xs text-accent-steel">
                                {apiStatus === 'online'
                                    ? 'Flux en direct : API CONNECTÉE'
                                    : 'MODE SIMULATION - API HORS LIGNE'
                                }
                            </p>
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

            {/* Notifications d'état */}
            {apiStatus === 'offline' && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <WifiOff className="w-5 h-5 text-yellow-400" />
                    <div>
                        <p className="text-sm font-medium text-yellow-400">Mode Simulation Activé</p>
                        <p className="text-xs text-accent-steel">
                            L'API AEVUM n'est pas disponible. Utilisation du générateur de données simulées.
                        </p>
                    </div>
                </div>
            )}


            {/* Section des biens en temps réel */}
            <div className="glass p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent" />
                        Flux AEVUM - Opportunités Détectées
                        {apiStatus === 'online' && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                                LIVE
                            </span>
                        )}
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
                                onClick={() => setSelectedDeal(deal)}
                                className={`overflow-hidden border rounded-lg transition-all duration-500 cursor-pointer hover:bg-white/10 group ${isFlashing
                                    ? 'bg-green-500/20 border-green-500/50 animate-pulse'
                                    : 'bg-white/5 border-white/10'
                                    }`}
                            >
                                {/* Image avec fallback intelligent */}
                                {deal.photos && deal.photos.length > 0 ? (
                                    <img
                                        src={deal.photos[0]}
                                        alt={deal.propertyType}
                                        className="w-full h-48 object-cover rounded-t-lg transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                                        }}
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-gradient-to-br from-accent/20 to-accent/5 rounded-t-lg flex items-center justify-center">
                                        <Building2 className="w-12 h-12 text-accent/50" />
                                    </div>
                                )}
                                <div className="p-4">
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
                                            <span className="text-sm text-accent-steel">Loyer Estimé</span>
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
                                            <p className={`text-sm font-bold ${['A', 'B', 'C'].includes(deal.dpe) ? 'text-green-400' :
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
                            </div>
                        );
                    })}
                </div>

                {deals.length === 0 && (
                    <div className="text-center py-8">
                        <Activity className="w-8 h-8 text-accent-steel mx-auto mb-2 animate-spin" />
                        <p className="text-accent-steel">Initialisation du scanner...</p>
                        <p className="text-xs text-accent-steel/60 mt-1">Recherche d'opportunités en cours</p>
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

            {/* Slide-over Panel */}
            {selectedDeal && (
                <DealDetailPanel
                    deal={selectedDeal}
                    onClose={() => setSelectedDeal(null)}
                    formatPrice={formatPrice}
                    getScoreColor={getScoreColor}
                />
            )}
        </div>
    );
};

export default Dashboard;
