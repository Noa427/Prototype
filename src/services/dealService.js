import realDeals from '../data/real_deals.json';

export const getScoreColor = (score) => {
    if (score >= 70) return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20"
    };
    if (score >= 50) return {
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20"
    };
    return {
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        border: "border-rose-500/20"
    };
};

export const getScoreLabel = (score) => {
    if (score >= 70) return "INTÉRESSANT";
    if (score >= 50) return "MOYEN";
    return "À ÉVITER";
};

let currentIndex = 0;

import { apiRequest } from './api';

export const getNextDeal = async () => {
    if (!realDeals || realDeals.length === 0) {
        return { deals: [], source: 'offline' };
    }

    const deal = realDeals[currentIndex % realDeals.length];
    currentIndex++;

    return {
        deals: [{
            ...deal,
            id: deal.id,
            city: deal.villes,
            district: deal.type.includes("(") ? deal.type.match(/\(([^)]+)\)/)?.[1] || "" : "",
            propertyType: deal.type,
            price: deal.prix,
            surface: deal.surface || 35,
            price_per_m2: deal.price_per_m2 || 0,
            dpe: deal.dpe || "D",
            need_work: deal.need_work || false,
            map_query: deal.map_query || `${deal.villes}`,
            location: deal.location || null,
            price_vs_market: deal.price_vs_market || 0,
            defects: deal.defects || [],
            estimated_monthly_charges: deal.estimated_monthly_charges || 0,
            estimated_annual_tax: deal.estimated_annual_tax || 0,
            monthlyRent: Math.round(deal.prix * (deal.rendement / 100) / 12),
            grossYield: deal.rendement,
            netCashFlow: Math.round((deal.prix * (deal.rendement / 100) / 12) - (deal.prix * 0.005)),
            aevumScore: deal.score,
            url: deal.url,
            photos: deal.photos || [],
            description: deal.description,
            timestamp: Date.now()
        }],
        source: 'offline'
    };
};

export const generateRandomDeal = () => {
    if (!realDeals || realDeals.length === 0) return null;
    const deal = realDeals[Math.floor(Math.random() * realDeals.length)];
    return {
        ...deal,
        id: `random-${Math.random().toString(36).substr(2, 9)}`,
        city: deal.villes,
        district: deal.type.includes("(") ? deal.type.match(/\(([^)]+)\)/)?.[1] || "" : "",
        propertyType: deal.type,
        price: deal.prix,
        surface: deal.surface || 35,
        monthlyRent: Math.round(deal.prix * (deal.rendement / 100) / 12),
        grossYield: deal.rendement,
        netCashFlow: Math.round((deal.prix * (deal.rendement / 100) / 12) - (deal.prix * 0.005)),
        dpe: "D",
        aevumScore: deal.score,
        url: deal.url,
        photos: deal.photos || [],
        description: deal.description,
        timestamp: Date.now()
    };
};

export const getDataStatus = () => {
    return {
        totalDeals: realDeals ? realDeals.length : 0,
        hasData: realDeals && realDeals.length > 0
    };
};
