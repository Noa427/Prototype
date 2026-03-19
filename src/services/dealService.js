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

export const getNextDeal = async () => {
    // Sécurité anti-crash : si le fichier est vide ou introuvable
    if (!realDeals || realDeals.length === 0) {
        return {
            deals: [],
            source: 'offline'
        };
    }

    // Boucle infinie (modulo) pour ne jamais tomber à court de munitions
    const deal = realDeals[currentIndex % realDeals.length];
    currentIndex++;

    const mappedDeal = {
        id: deal.id,
        city: deal.villes,
        district: deal.type.includes("(") ? deal.type.match(/\(([^)]+)\)/)?.[1] || "" : "",
        propertyType: deal.type,
        price: deal.prix,
        surface: deal.surface || 45,
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

    return {
        deals: [mappedDeal],
        source: 'api'
    };
};

export const generateRandomDeal = () => {
    // Pour generateRandomDeal, on retourne un seul objet deal (utilisé avec spread dans Dashboard)
    const deal = realDeals[Math.floor(Math.random() * realDeals.length)];
    const id = `random-${Math.random().toString(36).substr(2, 9)}`;

    return {
        id: id,
        city: deal.villes,
        district: deal.type.includes("(") ? deal.type.match(/\(([^)]+)\)/)?.[1] || "" : "",
        propertyType: deal.type,
        price: deal.prix,
        surface: deal.surface || 45,
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
