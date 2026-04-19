import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Phone, CheckCircle } from 'lucide-react';
import api from '../services/api';

const STATUS_LABEL = { new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', lost: 'Perdu' };

const MatchingModal = ({ deal, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [sending, setSending] = useState(null);
    const [sent, setSent] = useState({});

    useEffect(() => {
        setLoading(true);
        setError(false);
        api.get(`/api/matching/deals/${deal.id}/leads`)
            .then(r => setData(r.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [deal.id]);

    const sendEmail = async (lead) => {
        setSending(lead.id);
        try {
            await api.post('/api/leads/notify', {
                lead_id: lead.id,
                deal_id: deal.id,
                message: `Bonjour ${lead.full_name}, un bien correspondant à votre recherche est disponible : ${deal.city} — ${deal.price?.toLocaleString()} €.`,
            });
            setSent(prev => ({ ...prev, [lead.id]: true }));
        } catch (e) {
            console.error(e);
        } finally {
            setSending(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="glass rounded-2xl border border-white/10 w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-accent" />
                        <div>
                            <h2 className="font-bold text-white text-sm">Clients matchés</h2>
                            <p className="text-xs text-accent-steel">{deal.city} — {deal.price?.toLocaleString()} €</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 space-y-3">
                    {loading && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
                        </div>
                    )}
                    {error && (
                        <p className="text-center text-red-400 text-sm py-8">
                            Erreur lors du chargement des clients matchés.
                        </p>
                    )}
                    {!loading && !error && data?.matches?.length === 0 && (
                        <p className="text-center text-accent-steel text-sm py-8">Aucun client avec un budget suffisant.</p>
                    )}
                    {!loading && !error && data?.matches?.map(lead => (
                        <div key={lead.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-bold text-white text-sm">{lead.full_name}</p>
                                    <p className="text-xs text-accent-steel mt-0.5">{STATUS_LABEL[lead.status] || lead.status}</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                                    Score {lead.match_score}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p className="text-accent-steel">Budget</p>
                                    <p className="text-white font-bold">{lead.budget?.toLocaleString()} €</p>
                                </div>
                                <div>
                                    <p className="text-accent-steel">Apport</p>
                                    <p className="text-white font-bold">{lead.apport?.toLocaleString()} €</p>
                                </div>
                            </div>
                            {lead.match_reasons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {lead.match_reasons.map((r, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2 pt-1">
                                {lead.email && (
                                    <button
                                        onClick={() => sendEmail(lead)}
                                        disabled={!!sending || sent[lead.id]}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition-colors disabled:opacity-50"
                                    >
                                        {sent[lead.id] ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Mail className="w-3.5 h-3.5" />}
                                        {sent[lead.id] ? 'Envoyé !' : 'Email'}
                                    </button>
                                )}
                                {lead.phone && (
                                    <a
                                        href={`tel:${lead.phone}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-accent-steel text-xs font-bold hover:text-white transition-colors"
                                    >
                                        <Phone className="w-3.5 h-3.5" /> {lead.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MatchingModal;
