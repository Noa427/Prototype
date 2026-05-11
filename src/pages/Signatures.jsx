import React, { useState, useEffect } from 'react';
import { PenLine, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import api from '../services/api';

const STATUS_CFG = {
    pending:   { label: 'En attente',  color: 'bg-amber-400/10 text-amber-400 border-amber-400/30',    icon: Clock },
    signed:    { label: 'Signé',       color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30', icon: CheckCircle },
    refused:   { label: 'Refusé',      color: 'bg-rose-400/10 text-rose-400 border-rose-400/30',       icon: XCircle },
    expired:   { label: 'Expiré',      color: 'bg-gray-400/10 text-gray-400 border-gray-400/30',       icon: AlertCircle },
    cancelled: { label: 'Annulé',      color: 'bg-gray-400/10 text-gray-400 border-gray-400/30',       icon: XCircle },
};

const isStale = (createdAt) => {
    const age = (Date.now() - new Date(createdAt)) / (1000 * 3600);
    return age > 48;
};

export const Signatures = () => {
    const [sigs, setSigs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSigs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/documents/signatures');
            setSigs(res.data);
        } catch {
            setSigs([]);
        }
        setLoading(false);
    };

    useEffect(() => { fetchSigs(); }, []);

    const handleCancel = async (sig) => {
        if (!window.confirm(`Annuler la demande de signature pour ${sig.lead_name} ?`)) return;
        try {
            await api.delete(`/api/documents/sign/${sig.signature_request_id}`);
            fetchSigs();
        } catch { alert('Erreur lors de l\'annulation'); }
    };

    const handleRelance = async (sig) => {
        const name = prompt('Nom du signataire :', sig.lead_name);
        if (!name) return;
        const email = prompt('Email du signataire :', sig.email);
        if (!email) return;
        try {
            await api.post(`/api/documents/deals/${sig.deal_id}/sign`, {
                lead_id: sig.lead_id,
                signers: [{ name, email }],
            });
            fetchSigs();
        } catch { alert('Erreur lors de la relance'); }
    };

    const pending = sigs.filter(s => s.signature_status === 'pending');
    const done    = sigs.filter(s => s.signature_status !== 'pending');

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <PenLine className="w-6 h-6 text-accent" />
                        Signatures électroniques
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Suivi des demandes de signature via Yousign</p>
                </div>
                {pending.length > 0 && (
                    <span className="px-3 py-1 bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-full text-xs font-bold">
                        {pending.length} en attente
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : sigs.length === 0 ? (
                <div className="glass rounded-xl border border-white/5 p-12 text-center">
                    <PenLine className="w-10 h-10 text-accent-steel mx-auto mb-3" />
                    <p className="text-accent-steel text-sm">Aucune demande de signature. Envoyez des documents depuis les fiches leads.</p>
                </div>
            ) : (
                <div className="glass overflow-hidden rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['Document', 'Destinataire', 'Statut', 'Date envoi', 'Actions'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sigs.map(sig => {
                                const cfg = STATUS_CFG[sig.signature_status] || STATUS_CFG.pending;
                                const StatusIcon = cfg.icon;
                                const stale = sig.signature_status === 'pending' && isStale(sig.created_at);
                                return (
                                    <tr key={sig.lead_id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-white">
                                                Compromis — Deal #{sig.deal_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm text-white">{sig.lead_name}</p>
                                                <p className="text-[11px] text-accent-steel">{sig.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {cfg.label}
                                            </span>
                                            {stale && (
                                                <span className="ml-2 text-[10px] text-rose-400 font-bold">&gt; 48h</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-accent-steel">
                                            {sig.created_at ? new Date(sig.created_at).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {sig.signature_status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleRelance(sig)}
                                                            className="flex items-center gap-1 px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded text-[11px] font-medium transition-colors"
                                                            title="Relancer"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            Relancer
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(sig)}
                                                            className="flex items-center gap-1 px-2 py-1 hover:text-rose-400 text-accent-steel rounded text-[11px] transition-colors"
                                                            title="Annuler"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Signatures;
