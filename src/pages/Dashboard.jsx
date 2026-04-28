import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle, TrendingUp, ArrowUpRight, Clock, MapPin, Zap, Activity, Wifi, WifiOff, X, ExternalLink, Maximize2, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { generateRandomDeal, getScoreColor, getScoreLabel, getNextDeal, createLead } from '../services/dealService';

const metrics = [
    { label: "Nouveaux Biens", value: "14", sub: "Dernières 24h", icon: Building2, color: "text-accent" },
    { label: "Alertes Prioritaires", value: "3", sub: "Action requise", icon: AlertCircle, color: "text-red-500" },
    { label: "Estimation Marché", value: "+1.2%", sub: "Secteur Paris 15", icon: TrendingUp, color: "text-green-500" },
];

const getValuationBadges = (deal) => {
    const avgPrices = { "75001": 13500, "75010": 10200, "75011": 10800, "75018": 9500, "75020": 8900 };
    const district = deal.district || "";
    const avgPrice = avgPrices[district];

    const badges = [];

    if (avgPrice && deal.price_per_m2 > 0) {
        const delta = ((deal.price_per_m2 - avgPrice) / avgPrice) * 100;
        if (delta < -10) {
            badges.push({
                label: "PÉPITE DÉTECTÉE",
                color: "bg-green-500/20 text-green-400 border-green-500/30",
                icon: Zap
            });
        }
    }

    if (['F', 'G'].includes(deal.dpe)) {
        badges.push({
            label: "PASSOIRE THERMIQUE",
            color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
            icon: AlertCircle
        });
    }

    if (deal.need_work) {
        badges.push({
            label: "TRAVAUX À PRÉVOIR",
            color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            icon: Activity
        });
    }

    return badges;
};

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
        <div className="fixed inset-0 z-50 overflow-hidden" onWheel={e => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-[500px]">
                    <div className="h-full flex flex-col bg-gray-900 shadow-2xl border-l border-white/10 animate-in slide-in-from-right duration-300">
                        {/* Header with Carousel */}
                        <div className="relative h-72 w-full overflow-hidden group/carousel">
                            <img
                                src={photos[activePhotoIndex]}
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
                        <div className="flex-1 overflow-y-auto p-6 space-y-8" onWheel={e => e.stopPropagation()}>
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

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-accent" />
                                    Analyse de l'opportunité
                                </h4>
                                <div className="text-sm text-accent-steel leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
                                    <p className="italic mb-2">"{deal.description || "Aucune description détaillée disponible."}"</p>
                                    <p className="text-xs font-medium border-t border-white/5 pt-2 mt-2">
                                        Classe Énergétique : <span className="text-white font-bold">{deal.dpe}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Map Block */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-accent" />
                                    Localisation {deal.location?.address && <span className="text-[10px] text-accent-steel normal-case font-normal">— {deal.location.address}</span>}
                                </h4>
                                <div className="w-full h-48 rounded-xl overflow-hidden border border-white/10 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight="0"
                                        marginWidth="0"
                                        src={deal.location ?
                                            `https://maps.google.com/maps?q=${deal.location.lat},${deal.location.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed` :
                                            `https://maps.google.com/maps?q=${encodeURIComponent(deal.map_query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                                        }
                                    ></iframe>
                                </div>
                            </div>

                            {/* Strategic Analysis Block */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-accent" />
                                    Analyse Stratégique
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Market Comparison */}
                                    <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-accent-steel uppercase tracking-wider">Prix au m²</span>
                                            <span className="text-sm font-bold text-white">{Math.round(deal.price / deal.surface).toLocaleString()} €/m²</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-accent-steel uppercase tracking-wider">Écart Marché</span>
                                            <span className={`text-sm font-bold ${deal.price_vs_market <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {deal.price_vs_market > 0 ? '+' : ''}{deal.price_vs_market}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Defects */}
                                    {deal.defects && deal.defects.length > 0 && (
                                        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2">Points de Vigilance</p>
                                            <div className="flex flex-wrap gap-2">
                                                {deal.defects.map((defect, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold uppercase rounded border border-red-500/30">
                                                        {defect}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Financial Estimations */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                            <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-1">Charges (est.)</p>
                                            <p className="text-sm font-bold text-white">{deal.estimated_monthly_charges} €/mois</p>
                                        </div>
                                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                            <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-1">Taxe Foncière (est.)</p>
                                            <p className="text-sm font-bold text-white">{deal.estimated_annual_tax} €/an</p>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-accent-steel italic text-center opacity-50">* Estimations basées sur les moyennes du secteur et la surface.</p>
                                </div>
                            </div>

                            <button
                                onClick={() => window.open(deal.url, '_blank', 'noopener,noreferrer')}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 border border-white/10 group"
                            >
                                <span>VOIR L'ANNONCE SOURCE</span>
                                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>

                            <button
                                onClick={async () => {
                                    const name = prompt("Nom du lead :");
                                    if (!name) return;
                                    const email = prompt("Email du lead :");
                                    if (!email) return;
                                    try {
                                        await createLead({
                                            full_name: name,
                                            email: email,
                                            deal_id: deal.id,
                                            budget: deal.price,
                                            apport: Math.round(deal.price * 0.1),
                                            delay: "immédiat",
                                            status: "new"
                                        });
                                        alert("Lead créé avec succès !");
                                    } catch (e) {
                                        alert("Erreur lors de la création du lead");
                                    }
                                }}
                                className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            >
                                <UserPlus className="w-5 h-5" />
                                <span>CRÉER UN LEAD (CRM)</span>
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
    const [flashingDeal, setFlashingDeal] = useState(null);
    const [sortBy, setSortBy] = useState('score-desc');
    const [selectedDeal, setSelectedDeal] = useState(null);

    useEffect(() => {
        const initialize = async () => {
            const result = await getNextDeal();
            if (result.deals) setDeals(result.deals);
        };
        initialize();

        const interval = setInterval(async () => {
            const result = await getNextDeal();
            if (!result.deals || result.deals.length === 0) return;
            const newDeal = result.deals[0];

            setDeals(prevDeals => {
                // VERROUILLAGE DOUBLONS STRICT
                if (prevDeals.find(d => d.id === newDeal.id)) return prevDeals;

                setFlashingDeal(newDeal.id);
                setTimeout(() => setFlashingDeal(null), 2000);

                return [newDeal, ...prevDeals.slice(0, 9)];
            });
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const sortDeals = (dealsToSort) => {
        const sorted = [...dealsToSort];
        switch (sortBy) {
            case 'score-desc': return sorted.sort((a, b) => b.aevumScore - a.aevumScore);
            case 'score-asc': return sorted.sort((a, b) => a.aevumScore - b.aevumScore);
            case 'price-asc': return sorted.sort((a, b) => a.price - b.price);
            case 'price-desc': return sorted.sort((a, b) => b.price - a.price);
            default: return sorted;
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Bonjour, Agent</h1>
                    <p className="text-accent-steel">Voici l'état de votre secteur aujourd'hui.</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-accent">AEVUM ENGINE</p>
                        <p className="text-xs text-accent-steel">FLUX EN DIRECT</p>
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

            <div className="glass p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent" />
                        Flux AEVUM - Opportunités Détectées
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">LIVE</span>
                    </h2>
                    <div className="flex items-center gap-4">
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
                                    {/* Valuation Badges */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {getValuationBadges(deal).map((badge, idx) => (
                                            <div key={idx} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                                <badge.icon className="w-3 h-3" />
                                                {badge.label}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-accent-steel" />
                                            <span className="text-sm font-medium text-white">{deal.city} {deal.district}</span>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${scoreColors.bg} ${scoreColors.text} ${scoreColors.border} border`}>
                                            {deal.aevumScore}/100
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-accent-steel">{deal.propertyType}</span>
                                            <span className="text-sm font-medium text-white">{deal.surface} m²</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-accent-steel">Prix</span>
                                            <span className="text-sm font-bold text-white">{formatPrice(deal.price)}</span>
                                        </div>
                                    </div>
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
                                </div>
                            </div>
                        );
                    })}
                </div>

                {deals.length === 0 && (
                    <div className="text-center py-20">
                        <Activity className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
                        <p className="text-xl font-bold text-white">Initialisation du Scanner...</p>
                        <p className="text-accent-steel mt-2">Recherche d'opportunités en cours</p>
                    </div>
                )}
            </div>

            <div className="glass p-6 rounded-xl">
                <h2 className="font-bold text-lg text-white mb-6">Activité du Marché</h2>
                <div className="flex-1 flex items-end gap-3 px-2 h-32">
                    {[30, 45, 60, 40, 70, 85, 65, 90, 75, 80].map((h, i) => {
                        const color = h < 40 ? 'bg-red-500/40 border-red-500/60' :
                            h < 70 ? 'bg-amber-500/40 border-amber-500/60' :
                                'bg-green-500/40 border-green-500/60';
                        return (
                            <div key={i} className={`flex-1 ${color} border-t rounded-t-sm`} style={{ height: `${h}%` }} />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-4 text-[10px] text-accent-steel uppercase tracking-widest">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                </div>
            </div>

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
