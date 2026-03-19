// Import avec gestion d'erreur pour données corrompues
let realDeals = [];
try {
    realDeals = require('../data/real_deals.json');
    // Validation des données
    if (!Array.isArray(realDeals)) {
        console.warn('⚠️ real_deals.json n\'est pas un tableau, utilisation de données vides');
        realDeals = [];
    }
} catch (error) {
    console.warn('⚠️ Impossible de charger real_deals.json:', error.message);
    realDeals = [];
}

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

// Set pour tracker les IDs déjà utilisés et éviter les doublons absolus
const usedIds = new Set();
let currentIndex = 0;

// Validation permissive d'un deal
const validateDeal = (deal) => {
    try {
        return deal && 
               deal.id && 
               (typeof deal.prix === 'number' && deal.prix > 0) &&
               deal.villes;
        // Type optionnel pour plus de tolérance
    } catch (error) {
        console.warn('⚠️ Deal invalide ignoré:', error);
        return false;
    }
};

// Nettoyage et validation des photos
const cleanPhotos = (photos) => {
    if (!Array.isArray(photos)) return [];
    
    return photos
        .filter(photo => photo && typeof photo === 'string')
        .filter(photo => photo.startsWith('http') || photo.startsWith('//'))
        .map(photo => photo.startsWith('//') ? `https:${photo}` : photo);
};

export const getNextDeal = async () => {
    // Vérification douce des données
    if (!realDeals || realDeals.length === 0) {
        console.warn('📡 Aucune donnée - génération de secours');
        return {
            deals: [generateFallbackDeal()],
            source: 'offline'
        };
    }

    // Filtrer les deals valides avec tolérance
    const validDeals = realDeals.filter(validateDeal);
    if (validDeals.length === 0) {
        console.warn('🔄 Données en cours de traitement - utilisation de secours');
        return {
            deals: [generateFallbackDeal()],
            source: 'offline'
        };
    }

    // Sélection cyclique avec protection anti-doublon
    let attempts = 0;
    let deal;
    
    do {
        deal = validDeals[currentIndex % validDeals.length];
        currentIndex++;
        attempts++;
        
        // Protection contre boucle infinie si tous les deals sont déjà utilisés
        if (attempts > validDeals.length) {
            // Reset du cache et prise du premier deal disponible
            usedIds.clear();
            deal = validDeals[0];
            break;
        }
    } while (usedIds.has(deal.id));

    // Marquer comme utilisé
    usedIds.add(deal.id);

    const mappedDeal = {
        id: deal.id, // ID PAP unique du scraper
        city: deal.villes,
        district: deal.type.includes("(") ? deal.type.match(/\(([^)]+)\)/)?.[1] || "" : "",
        propertyType: deal.type,
        price: deal.prix,
        surface: deal.surface || 45,
        monthlyRent: Math.round(deal.prix * ((deal.rendement || 4.5) / 100) / 12),
        grossYield: deal.rendement || 4.5,
        netCashFlow: Math.round((deal.prix * ((deal.rendement || 4.5) / 100) / 12) - (deal.prix * 0.005)),
        dpe: ["A", "B", "C", "D", "E", "F", "G"][Math.floor(Math.random() * 7)],
        aevumScore: deal.score || Math.floor(Math.random() * 40) + 30,
        url: deal.url,
        photos: cleanPhotos(deal.photos), // Nettoyage strict des photos
        description: deal.description || "Opportunité détectée par le moteur AEVUM.",
        timestamp: Date.now(),
        isNew: true // Marqueur pour l'animation
    };

    return {
        deals: [mappedDeal],
        source: validDeals.length > 0 ? 'api' : 'offline'
    };
};

// Fonction helper pour générer un deal de secours
const generateFallbackDeal = () => {
    return {
        id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        city: "Paris",
        district: "75001",
        propertyType: "Appartement",
        price: 350000,
        surface: 35,
        monthlyRent: 1500,
        grossYield: 5.1,
        netCashFlow: 250,
        dpe: "D",
        aevumScore: 65,
        url: "https://www.pap.fr",
        photos: [],
        description: "Scanner en cours de redémarrage...",
        timestamp: Date.now(),
        isNew: false
    };
};

export const generateRandomDeal = () => {
    const validDeals = realDeals.filter(validateDeal);
    if (validDeals.length === 0) {
        return generateFallbackDeal();
    }

    const deal = validDeals[Math.floor(Math.random() * validDeals.length)];
    const uniqueId = `random-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    return {
        id: uniqueId,
        city: deal.villes,
        district: deal.type.includes("(") ? deal.type.match(/\(([^)]+)\)/)?.[1] || "" : "",
        propertyType: deal.type,
        price: deal.prix,
        surface: deal.surface || 45,
        monthlyRent: Math.round(deal.prix * ((deal.rendement || 4.5) / 100) / 12),
        grossYield: deal.rendement || 4.5,
        netCashFlow: Math.round((deal.prix * ((deal.rendement || 4.5) / 100) / 12) - (deal.prix * 0.005)),
        dpe: ["A", "B", "C", "D", "E", "F", "G"][Math.floor(Math.random() * 7)],
        aevumScore: deal.score || Math.floor(Math.random() * 40) + 30,
        url: deal.url,
        photos: cleanPhotos(deal.photos),
        description: deal.description || "Opportunité générée aléatoirement.",
        timestamp: Date.now(),
        isNew: false
    };
};

// Export de l'état des données pour le Dashboard
export const getDataStatus = () => {
    return {
        totalDeals: realDeals.length,
        validDeals: realDeals.filter(validateDeal).length,
        hasData: realDeals.length > 0,
        isHealthy: realDeals.filter(validateDeal).length > 0
    };
};
