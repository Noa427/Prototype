import api from './api';
import realDeals from '../data/real_deals.json';

export const getScoreColor = (score) => {
    // Handle both 0-10 and 0-100 scales
    const normalizedScore = score > 10 ? score / 10 : score;

    if (normalizedScore >= 8) return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20"
    };
    if (normalizedScore >= 5) return {
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
    const normalizedScore = score > 10 ? score / 10 : score;
    if (normalizedScore >= 8) return "EXCELLENT";
    if (normalizedScore >= 5) return "CORRECT";
    return "À ÉVITER";
};

export const getDeals = async () => {
    try {
        const response = await api.get('/api/deals');
        const deals = response.data;
        return deals.map(deal => ({
            ...deal,
            id: deal.id,
            title: deal.title || `Bien à ${deal.city}`,
            type: deal.property_type || "Bien",
            price: deal.price ? `${deal.price.toLocaleString()} €` : "Prix N.C.",
            yield: deal.gross_yield ? `${deal.gross_yield}%` : "N.C.",
            location: deal.city ? `${deal.city} (${deal.postal_code || ""})` : "N.C.",
            time: deal.timestamp ? new Date(deal.timestamp).toLocaleTimeString() : "N.C.",
            desc: deal.description || "Aucune description disponible.",
            aevumScore: deal.aevum_score || 0
        }));
    } catch (error) {
        console.error("Error fetching deals:", error);
        return [];
    }
};

export const getTrends = async () => {
    try {
        const response = await api.get('/api/trends/price_by_zipcode');
        return response.data;
    } catch (error) {
        console.error("Error fetching trends:", error);
        return [];
    }
};

export const getStats = async () => {
    try {
        const response = await api.get('/api/trends/stats');
        return response.data;
    } catch (error) {
        console.error("Error fetching stats:", error);
        return { total_deals: 0, avg_price: 0, avg_yield: 0 };
    }
};

export const exportDeals = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/deals/export?${queryParams}`, {
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deals_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (error) {
        console.error("Error exporting deals:", error);
    }
};

export const getLeads = async (status = null) => {
    try {
        const url = status ? `/api/leads?status=${status}` : '/api/leads';
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching leads:", error);
        return [];
    }
};

export const createLead = async (leadData) => {
    try {
        const response = await api.post('/api/leads', leadData);
        return response.data;
    } catch (error) {
        console.error("Error creating lead:", error);
        throw error;
    }
};

export const updateLead = async (leadId, leadData) => {
    try {
        const response = await api.put(`/api/leads/${leadId}`, leadData);
        return response.data;
    } catch (error) {
        console.error("Error updating lead:", error);
        throw error;
    }
};

export const deleteLead = async (leadId) => {
    try {
        const response = await api.delete(`/api/leads/${leadId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting lead:", error);
        throw error;
    }
};

export const getAdminKPIs = async () => {
    try {
        const response = await api.get('/api/admin/kpi');
        return response.data;
    } catch (error) {
        console.error("Error fetching KPIs:", error);
        return [];
    }
};

// Backward compatibility for Dashboard.jsx
let currentIndex = 0;

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
