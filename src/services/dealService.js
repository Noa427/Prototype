// Configuration de l'API
const API_BASE_URL = 'http://localhost:8000';
const API_TIMEOUT = 5000; // 5 secondes

// Service de génération de biens immobiliers pour AEVUM ENGINE
export const generateRandomDeal = () => {
    const cities = [
        { name: 'Paris', pricePerM2: { min: 8000, max: 15000 }, rentPerM2: { min: 25, max: 45 } },
        { name: 'Lyon', pricePerM2: { min: 4000, max: 7000 }, rentPerM2: { min: 15, max: 25 } },
        { name: 'Bordeaux', pricePerM2: { min: 3500, max: 6000 }, rentPerM2: { min: 12, max: 22 } },
        { name: 'Marseille', pricePerM2: { min: 3000, max: 5500 }, rentPerM2: { min: 10, max: 20 } }
    ];

    const dpeRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const propertyTypes = ['Appartement', 'Maison', 'Studio', 'Duplex'];
    const districts = {
        'Paris': ['1er', '2ème', '3ème', '4ème', '5ème', '11ème', '18ème', '19ème', '20ème'],
        'Lyon': ['1er', '2ème', '3ème', '6ème', '7ème', '8ème', '9ème'],
        'Bordeaux': ['Centre', 'Chartrons', 'Bastide', 'Caudéran'],
        'Marseille': ['1er', '2ème', '6ème', '8ème', '13ème']
    };

    // Sélection aléatoire de la ville
    const city = cities[Math.floor(Math.random() * cities.length)];
    const district = districts[city.name][Math.floor(Math.random() * districts[city.name].length)];
    
    // Génération des caractéristiques
    const surface = Math.floor(Math.random() * (120 - 25) + 25); // 25-120 m²
    const pricePerM2 = Math.floor(Math.random() * (city.pricePerM2.max - city.pricePerM2.min) + city.pricePerM2.min);
    const totalPrice = surface * pricePerM2;
    
    const rentPerM2 = Math.floor(Math.random() * (city.rentPerM2.max - city.rentPerM2.min) + city.rentPerM2.min);
    const monthlyRent = surface * rentPerM2;
    
    const dpe = dpeRatings[Math.floor(Math.random() * dpeRatings.length)];
    const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    
    // Calculs financiers
    const annualRent = monthlyRent * 12;
    const grossYield = ((annualRent / totalPrice) * 100);
    
    // Estimation des charges (5-15% du loyer)
    const chargesRate = Math.random() * (0.15 - 0.05) + 0.05;
    const monthlyCharges = monthlyRent * chargesRate;
    const netCashFlow = monthlyRent - monthlyCharges;
    
    // Calcul du Score AEVUM (sur 100)
    let aevumScore = 0;
    
    // Rendement (40% du score)
    if (grossYield >= 6) aevumScore += 40;
    else if (grossYield >= 4.5) aevumScore += 30;
    else if (grossYield >= 3.5) aevumScore += 20;
    else aevumScore += 10;
    
    // DPE (20% du score)
    const dpeScores = { 'A': 20, 'B': 18, 'C': 15, 'D': 12, 'E': 8, 'F': 5, 'G': 2 };
    aevumScore += dpeScores[dpe];
    
    // Prix par m² par rapport à la moyenne de la ville (20% du score)
    const avgPriceCity = (city.pricePerM2.min + city.pricePerM2.max) / 2;
    if (pricePerM2 < avgPriceCity * 0.8) aevumScore += 20;
    else if (pricePerM2 < avgPriceCity * 0.9) aevumScore += 15;
    else if (pricePerM2 < avgPriceCity * 1.1) aevumScore += 10;
    else aevumScore += 5;
    
    // Cash-flow positif (20% du score)
    if (netCashFlow > 500) aevumScore += 20;
    else if (netCashFlow > 200) aevumScore += 15;
    else if (netCashFlow > 0) aevumScore += 10;
    else aevumScore += 0;
    
    // Génération d'un ID unique
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    
    return {
        id,
        city: city.name,
        district,
        propertyType,
        surface,
        price: totalPrice,
        pricePerM2,
        monthlyRent,
        dpe,
        grossYield: Math.round(grossYield * 100) / 100,
        netCashFlow: Math.round(netCashFlow),
        aevumScore: Math.round(aevumScore),
        timestamp: new Date(),
        isNew: true // Pour l'animation flash
    };
};

// Fonction pour déterminer la couleur du score AEVUM
export const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
    if (score >= 60) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
};

// Fonction pour déterminer le label du score
export const getScoreLabel = (score) => {
    if (score >= 80) return 'PÉPITE';
    if (score >= 60) return 'INTÉRESSANT';
    return 'À ÉVITER';
};

// Fonction pour récupérer les biens depuis l'API réelle
export const fetchRealDeals = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(`${API_BASE_URL}/deals`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transformer les données de l'API au format attendu par l'application
        const transformedDeals = data.map(deal => ({
            id: deal.id || Date.now() + Math.random().toString(36).substr(2, 9),
            city: deal.city || 'Paris',
            district: deal.district || '1er',
            propertyType: deal.propertyType || 'Appartement',
            surface: deal.surface || 50,
            price: deal.price || 300000,
            pricePerM2: deal.pricePerM2 || Math.round(deal.price / deal.surface),
            monthlyRent: deal.monthlyRent || 1500,
            dpe: deal.dpe || 'D',
            grossYield: deal.grossYield || Math.round(((deal.monthlyRent * 12) / deal.price) * 100 * 100) / 100,
            netCashFlow: deal.netCashFlow || Math.round(deal.monthlyRent * 0.85),
            aevumScore: deal.aevumScore || calculateAevumScore(deal),
            timestamp: new Date(deal.timestamp) || new Date(),
            isNew: true
        }));

        return {
            success: true,
            deals: transformedDeals,
            source: 'api'
        };

    } catch (error) {
        console.warn('API AEVUM non disponible:', error.message);
        
        // Fallback vers le générateur aléatoire
        const fallbackDeal = generateRandomDeal();
        
        return {
            success: false,
            deals: [fallbackDeal],
            source: 'simulation',
            error: error.message
        };
    }
};

// Fonction pour calculer le score AEVUM à partir des données API
const calculateAevumScore = (deal) => {
    let score = 0;
    
    // Rendement (40% du score)
    const grossYield = ((deal.monthlyRent * 12) / deal.price) * 100;
    if (grossYield >= 6) score += 40;
    else if (grossYield >= 4.5) score += 30;
    else if (grossYield >= 3.5) score += 20;
    else score += 10;
    
    // DPE (20% du score)
    const dpeScores = { 'A': 20, 'B': 18, 'C': 15, 'D': 12, 'E': 8, 'F': 5, 'G': 2 };
    score += dpeScores[deal.dpe] || 10;
    
    // Prix par m² (20% du score) - estimation basique
    const pricePerM2 = deal.price / deal.surface;
    if (pricePerM2 < 5000) score += 20;
    else if (pricePerM2 < 7000) score += 15;
    else if (pricePerM2 < 10000) score += 10;
    else score += 5;
    
    // Cash-flow (20% du score)
    const netCashFlow = deal.netCashFlow || (deal.monthlyRent * 0.85);
    if (netCashFlow > 500) score += 20;
    else if (netCashFlow > 200) score += 15;
    else if (netCashFlow > 0) score += 10;
    else score += 0;
    
    return Math.round(score);
};

// Fonction hybride qui essaie l'API puis fallback
export const getNextDeal = async () => {
    const result = await fetchRealDeals();
    return result;
};
