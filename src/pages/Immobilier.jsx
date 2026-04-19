import React, { useState, useEffect } from 'react';
import { Search, Filter, Phone, Info, MapPin, Clock, Star, Download, Map as MapIcon, LayoutGrid, Users } from 'lucide-react';
import MatchingModal from '../components/MatchingModal';
import { getDeals, getScoreColor, getScoreLabel, exportDeals } from '../services/dealService';
import { MapComponent } from '../components/MapComponent';

export const Immobilier = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchingDeal, setMatchingDeal] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    // Filtres immo
    const [minSurface, setMinSurface] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    // Filtres auto
    const [filterBrand, setFilterBrand] = useState("");
    const [maxMileage, setMaxMileage] = useState("");
    const [minYear, setMinYear] = useState("");

    useEffect(() => {
        const fetchDeals = async () => {
            setLoading(true);
            const data = await getDeals();
            setDeals(data);
            setLoading(false);
        };
        fetchDeals();
    }, []);

    // Détecter la verticale dominante
    const vertical = deals.length > 0
        ? (deals.filter(d => d.vertical === "auto").length > deals.length / 2 ? "auto" : "immo")
        : "immo";

    const filteredDeals = deals.filter(deal => {
        const matchSearch =
            (deal.title && deal.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (deal.location && deal.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (deal.brand && deal.brand.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchSearch) return false;
        if (vertical === "immo") {
            if (minSurface && (!deal.surface || deal.surface < Number(minSurface))) return false;
            if (maxPrice && deal.price && deal.price > Number(maxPrice.replace(/\D/g, ""))) return false;
        } else {
            if (filterBrand && (!deal.brand || !deal.brand.toLowerCase().includes(filterBrand.toLowerCase()))) return false;
            if (maxMileage && (!deal.mileage || deal.mileage > Number(maxMileage))) return false;
            if (minYear && (!deal.year || deal.year < Number(minYear))) return false;
        }
        return true;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Le Flux</h1>
                    <p className="text-xs text-accent-steel uppercase tracking-widest mt-1">Opportunités en temps réel</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-steel" />
                        <input
                            type="text"
                            placeholder={vertical === "auto" ? "Marque, ville..." : "Ville, titre..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 w-48 text-white"
                        />
                    </div>
                    {vertical === "immo" ? (
                        <>
                            <input type="number" placeholder="Surface min m²" value={minSurface}
                                onChange={e => setMinSurface(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white w-32 focus:outline-none focus:border-accent/50" />
                            <input type="number" placeholder="Prix max €" value={maxPrice}
                                onChange={e => setMaxPrice(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white w-32 focus:outline-none focus:border-accent/50" />
                        </>
                    ) : (
                        <>
                            <input type="text" placeholder="Marque" value={filterBrand}
                                onChange={e => setFilterBrand(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white w-28 focus:outline-none focus:border-accent/50" />
                            <input type="number" placeholder="Km max" value={maxMileage}
                                onChange={e => setMaxMileage(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white w-24 focus:outline-none focus:border-accent/50" />
                            <input type="number" placeholder="Année min" value={minYear}
                                onChange={e => setMinYear(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white w-28 focus:outline-none focus:border-accent/50" />
                        </>
                    )}
                    <button
                        onClick={() => exportDeals()}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-accent-steel hover:text-white text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exporter CSV</span>
                    </button>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-accent text-white" : "text-accent-steel hover:text-white"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("map")}
                            className={`p-1.5 rounded ${viewMode === "map" ? "bg-accent text-white" : "text-accent-steel hover:text-white"}`}
                        >
                            <MapIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-accent-steel hover:text-white">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {viewMode === "map" && !loading && (
                <div className="animate-in fade-in duration-500">
                    <MapComponent deals={filteredDeals} onMarkerClick={(deal) => console.log("Selected deal:", deal)} />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {filteredDeals.map((op) => {
                        const scoreStyle = getScoreColor(op.aevum_score);
                        return (
                            <div key={op.id} className="glass glass-hover rounded-lg p-4 flex flex-col border border-white/5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="px-1.5 py-0.5 rounded bg-accent/10 text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/20 w-fit">
                                            {op.type}
                                        </span>
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${scoreStyle.bg} ${scoreStyle.border} border w-fit`}>
                                            <Star className={`w-3 h-3 ${scoreStyle.text} fill-current`} />
                                            <span className={`text-[9px] font-bold ${scoreStyle.text}`}>
                                                {op.aevum_score}/10 - {getScoreLabel(op.aevum_score)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-accent-steel font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {op.time}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-white mb-2 truncate">{op.title}</h3>
                                <p className="text-xs text-accent-steel line-clamp-2 mb-4 h-8 leading-relaxed">{op.desc}</p>

                                <div className="grid grid-cols-2 gap-3 mb-6 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                    <div>
                                        <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Prix</p>
                                        <p className="text-sm font-bold text-white">{op.price}</p>
                                    </div>
                                    {vertical === "auto" ? (
                                        <>
                                            <div>
                                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Kilométrage</p>
                                                <p className="text-sm font-bold text-white">{op.mileage ? `${op.mileage.toLocaleString()} km` : "N.C."}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Année</p>
                                                <p className="text-sm font-bold text-white">{op.year || "N.C."}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Marque</p>
                                                <p className="text-sm font-bold text-white">{op.brand || "N.C."}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <p className="text-[9px] text-accent-steel uppercase tracking-widest mb-0.5">Rendement</p>
                                            <p className="text-sm font-bold text-green-500">{op.yield}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-accent-steel mb-6">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {op.location}
                                </div>

                                <div className="mt-auto space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        {op.url ? (
                                            <a
                                                href={op.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                                Détails
                                            </a>
                                        ) : (
                                            <span
                                                role="button"
                                                aria-disabled="true"
                                                tabIndex={0}
                                                aria-label="Détails — URL non disponible"
                                                className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-accent-steel cursor-not-allowed opacity-50"
                                                title="URL non disponible"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                                Détails
                                            </span>
                                        )}
                                        {op.phone ? (
                                            <a
                                                href={`tel:${op.phone}`}
                                                className="flex items-center justify-center gap-2 py-2 rounded-md bg-accent text-xs font-bold text-white hover:bg-accent/90 transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                {op.phone}
                                            </a>
                                        ) : (
                                            <span
                                                role="button"
                                                aria-disabled="true"
                                                tabIndex={0}
                                                aria-label="Appeler — Numéro non disponible"
                                                className="flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-accent-steel cursor-not-allowed opacity-50"
                                                title="Numéro non disponible"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                Appeler
                                            </span>
                                        )}
                                    </div>
                                    {vertical === "immo" && (
                                        <button
                                            onClick={() => setMatchingDeal(op)}
                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all"
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            Voir clients matchés
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {matchingDeal && (
                <MatchingModal deal={matchingDeal} onClose={() => setMatchingDeal(null)} />
            )}

            {!loading && filteredDeals.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-accent-steel">Aucune opportunité trouvée.</p>
                </div>
            )}
        </div>
    );
};

export default Immobilier;
