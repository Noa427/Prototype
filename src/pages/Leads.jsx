import React, { useState, useEffect } from 'react';
import { Search, Filter, User, Mail, Phone, Calendar, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getLeads, updateLead, deleteLead } from '../services/dealService';

const statusConfig = {
    new: { label: "Nouveau", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    contacted: { label: "Contacté", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    visit_scheduled: { label: "Visite prévue", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    lost: { label: "Perdu", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
    converted: { label: "Converti", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" }
};

export const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");

    useEffect(() => {
        fetchLeads();
    }, [filterStatus]);

    const fetchLeads = async () => {
        setLoading(true);
        const data = await getLeads(filterStatus);
        setLeads(data);
        setLoading(false);
    };

    const handleStatusChange = async (leadId, newStatus) => {
        try {
            await updateLead(leadId, { status: newStatus });
            fetchLeads();
        } catch (error) {
            alert("Erreur lors de la mise à jour du statut");
        }
    };

    const handleDelete = async (leadId) => {
        if (window.confirm("Supprimer ce lead ?")) {
            try {
                await deleteLead(leadId);
                fetchLeads();
            } catch (error) {
                alert("Erreur lors de la suppression");
            }
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Gestion des Leads</h1>
                    <p className="text-accent-steel">Suivi de votre pipeline commercial</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                    >
                        <option value="">Tous les statuts</option>
                        {Object.entries(statusConfig).map(([val, cfg]) => (
                            <option key={val} value={val} className="bg-gray-900">{cfg.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="glass overflow-hidden rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Client</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Contact</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Budget / Apport</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Statut</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">Créé le</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                                </td>
                            </tr>
                        ) : leads.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-accent-steel">Aucun lead trouvé.</td>
                            </tr>
                        ) : (
                            leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
                                                {lead.full_name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-white">{lead.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-accent-steel">
                                                <Mail className="w-3 h-3" />
                                                {lead.email}
                                            </div>
                                            {lead.phone && (
                                                <div className="flex items-center gap-2 text-xs text-accent-steel">
                                                    <Phone className="w-3 h-3" />
                                                    {lead.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{lead.budget.toLocaleString()} €</span>
                                            <span className="text-[10px] text-accent-steel">Apport: {lead.apport.toLocaleString()} €</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${statusConfig[lead.status]?.bg} ${statusConfig[lead.status]?.color} ${statusConfig[lead.status]?.border}`}>
                                            {statusConfig[lead.status]?.label.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-accent-steel">
                                        {new Date(lead.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <select
                                                value={lead.status}
                                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                                            >
                                                {Object.entries(statusConfig).map(([val, cfg]) => (
                                                    <option key={val} value={val} className="bg-gray-900">{cfg.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleDelete(lead.id)}
                                                className="p-1.5 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Leads;
