import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Send, Trash2, Plus, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

const STATUS_CONFIG = {
    draft:     { label: 'Brouillon', icon: Clock,        cls: 'text-amber-400 bg-amber-400/10' },
    scheduled: { label: 'Planifiée', icon: Clock,        cls: 'text-blue-400 bg-blue-400/10' },
    sent:      { label: 'Envoyée',   icon: CheckCircle,  cls: 'text-green-400 bg-green-400/10' },
    failed:    { label: 'Échec',     icon: AlertCircle,  cls: 'text-red-400 bg-red-400/10' },
};

const CampaignCard = ({ campaign, onSend, onDelete, busy }) => {
    const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
    const Icon = cfg.icon;
    return (
        <div className="glass p-5 rounded-xl border border-white/10 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{campaign.name}</h3>
                    <p className="text-xs text-accent-steel mt-1 line-clamp-2">{campaign.message}</p>
                </div>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${cfg.cls}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-accent-steel">
                <span className="uppercase font-bold">{campaign.type}</span>
                <span>{campaign.leads_ids?.length ?? 0} destinataire(s)</span>
                <span className="ml-auto">{new Date(campaign.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {campaign.status === 'draft' && (
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => onSend(campaign.id)}
                        disabled={busy === campaign.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
                    >
                        {busy === campaign.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Envoyer maintenant
                    </button>
                    <button
                        onClick={() => onDelete(campaign.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

const NewCampaignForm = ({ leads, onCreated, onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('email');
    const [message, setMessage] = useState('');
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [saving, setSaving] = useState(false);

    const toggle = (id) => setSelectedLeads(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

    const submit = async () => {
        if (!name.trim() || !message.trim()) return;
        setSaving(true);
        try {
            await api.post('/api/campaigns/', {
                name, type, message, leads_ids: selectedLeads,
            });
            onCreated();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-lg space-y-4">
                <h2 className="font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-accent" />Nouvelle campagne
                </h2>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Nom</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                </div>

                <div className="flex gap-3">
                    {['email', 'sms'].map(t => (
                        <button key={t} onClick={() => setType(t)}
                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${type === t ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'}`}>
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Message</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50 resize-none" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Destinataires ({selectedLeads.length} sélectionné(s))</label>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {leads.map(l => (
                            <label key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <input type="checkbox" checked={selectedLeads.includes(l.id)} onChange={() => toggle(l.id)}
                                    className="accent-accent" />
                                <span className="text-sm text-white flex-1">{l.full_name}</span>
                                <span className="text-xs text-accent-steel">{l.email}</span>
                            </label>
                        ))}
                        {leads.length === 0 && <p className="text-xs text-accent-steel text-center py-3">Aucun lead disponible</p>}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-accent-steel text-sm hover:text-white transition-colors">
                        Annuler
                    </button>
                    <button onClick={submit} disabled={saving || !name.trim() || !message.trim()}
                        className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                        {saving ? 'Création…' : 'Créer la campagne'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [busy, setBusy] = useState(null);

    const fetch_ = useCallback(async () => {
        try {
            const [c, l] = await Promise.all([
                api.get('/api/campaigns/'),
                api.get('/api/leads'),
            ]);
            setCampaigns(c.data);
            setLeads(l.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch_(); }, [fetch_]);

    const handleSend = async (id) => {
        setBusy(id);
        try {
            await api.put(`/api/campaigns/${id}/send`);
            await fetch_();
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette campagne ?')) return;
        try {
            await api.delete(`/api/campaigns/${id}`);
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const tabs = ['Toutes', 'Brouillons', 'Envoyées'];
    const [tab, setTab] = useState('Toutes');

    const filtered = campaigns.filter(c => {
        if (tab === 'Brouillons') return c.status === 'draft';
        if (tab === 'Envoyées') return c.status === 'sent';
        return true;
    });

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Mail className="w-7 h-7 text-accent" />Campagnes
                    </h1>
                    <p className="text-accent-steel text-sm mt-1">Gérez vos campagnes email et SMS</p>
                </div>
                <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-colors">
                    <Plus className="w-4 h-4" />Nouvelle campagne
                </button>
            </div>

            <div className="flex gap-2">
                {tabs.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${tab === t ? 'bg-accent/20 border border-accent/40 text-accent' : 'bg-white/5 border border-white/10 text-accent-steel hover:text-white'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-accent-steel">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune campagne {tab !== 'Toutes' ? `(${tab.toLowerCase()})` : ''}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(c => (
                        <CampaignCard key={c.id} campaign={c} onSend={handleSend} onDelete={handleDelete} busy={busy} />
                    ))}
                </div>
            )}

            {showForm && (
                <NewCampaignForm
                    leads={leads}
                    onCreated={() => { setShowForm(false); fetch_(); }}
                    onClose={() => setShowForm(false)}
                />
            )}
        </div>
    );
};

export default Campaigns;
