import React, { useState, useEffect } from 'react';
import { Home, Plus, X, CheckCircle, AlertTriangle, FileText, ChevronDown } from 'lucide-react';
import api from '../services/api';

const STATUS_CFG = {
    active:     { label: 'Actif',    color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' },
    terminated: { label: 'Terminé',  color: 'bg-gray-400/10 text-gray-400 border-gray-400/30' },
};

const PAYMENT_STATUS_CFG = {
    pending: { label: 'À venir',  color: 'text-accent-steel' },
    paid:    { label: 'Payé',     color: 'text-emerald-400' },
    late:    { label: 'Impayé',   color: 'text-rose-400' },
    partial: { label: 'Partiel',  color: 'text-amber-400' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const monthLabel = (d) => new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

const EMPTY_FORM = {
    deal_id: '',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    monthly_rent: '',
    charges: 0,
    deposit: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notice_period_days: 90,
    property_address: '',
};

const RentalModal = ({ onClose, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deals, setDeals] = useState([]);

    useEffect(() => {
        api.get('/api/deals/').then(r => setDeals(r.data)).catch(() => setDeals([]));
    }, []);

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const handleDealSelect = (e) => {
        const id = e.target.value;
        set('deal_id', id);
        if (id) {
            const d = deals.find(x => String(x.id) === id);
            if (d) set('property_address', [d.street_number, d.street, d.postal_code, d.city].filter(Boolean).join(' ') || d.map_query || '');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                deal_id: form.deal_id ? parseInt(form.deal_id) : null,
                monthly_rent: parseFloat(form.monthly_rent),
                charges: parseFloat(form.charges) || 0,
                deposit: parseFloat(form.deposit) || 0,
                notice_period_days: parseInt(form.notice_period_days),
                end_date: form.end_date || null,
            };
            await api.post('/api/rentals/', payload);
            onSaved();
            onClose();
        } catch (err) {
            alert('Erreur : ' + (err.response?.data?.detail || err.message));
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative glass border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">Nouvelle location</h2>
                    <button onClick={onClose} className="text-accent-steel hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 overscroll-contain px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Associer à un bien (optionnel)</label>
                            <select value={form.deal_id} onChange={handleDealSelect}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                                <option value="" className="bg-gray-900">— Sélectionner un deal —</option>
                                {deals.map(d => (
                                    <option key={d.id} value={d.id} className="bg-gray-900">
                                        #{d.id} — {d.city} {d.surface ? `${d.surface}m²` : ''} {d.price ? fmt(d.price) : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Adresse du bien *</label>
                            <input required value={form.property_address} onChange={e => set('property_address', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                placeholder="12 rue de la Paix, 75001 Paris" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Nom du locataire *</label>
                            <input required value={form.tenant_name} onChange={e => set('tenant_name', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                placeholder="Jean Dupont" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Email *</label>
                                <input required type="email" value={form.tenant_email} onChange={e => set('tenant_email', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                    placeholder="jean@email.com" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Téléphone</label>
                                <input value={form.tenant_phone} onChange={e => set('tenant_phone', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                    placeholder="+33 6 00 00 00 00" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Loyer (€) *</label>
                                <input required type="number" min="0" step="0.01" value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                    placeholder="800" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Charges (€)</label>
                                <input type="number" min="0" step="0.01" value={form.charges} onChange={e => set('charges', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                    placeholder="50" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Dépôt (€)</label>
                                <input type="number" min="0" step="0.01" value={form.deposit} onChange={e => set('deposit', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                    placeholder="1600" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Début bail *</label>
                                <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Fin bail</label>
                                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors">
                                Annuler
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                                {saving ? 'Création...' : 'Créer la location'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const RentalDrawer = ({ rental, onClose, onRefresh }) => {
    const [tab, setTab] = useState('infos');
    const [payments, setPayments] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    useEffect(() => {
        if (tab === 'paiements') fetchPayments();
        if (tab === 'documents') fetchDocuments();
    }, [tab]);

    const fetchPayments = async () => {
        setLoadingPayments(true);
        try { const r = await api.get(`/api/rentals/${rental.id}/payments`); setPayments(r.data); }
        catch { setPayments([]); }
        setLoadingPayments(false);
    };

    const fetchDocuments = async () => {
        try { const r = await api.get(`/api/rentals/${rental.id}/documents`); setDocuments(r.data); }
        catch { setDocuments([]); }
    };

    const handleMarkPaid = async (paymentId) => {
        try {
            await api.post(`/api/rentals/${rental.id}/payments/${paymentId}/mark-paid`);
            fetchPayments();
        } catch { alert('Erreur lors du marquage'); }
    };

    const handleGenerateReceipt = (month) => {
        const m = new Date(month).toISOString().split('T')[0].slice(0, 7);
        window.open(`/api/rentals/${rental.id}/generate-receipt/${m}`, '_blank');
    };

    const handleRemind = async (paymentId) => {
        try {
            await api.post(`/api/rentals/${rental.id}/send-reminder/${paymentId}`);
            alert('Relance envoyée');
        } catch { alert('Erreur envoi relance'); }
    };

    const handleTerminate = async () => {
        if (!window.confirm('Terminer ce bail ?')) return;
        try { await api.delete(`/api/rentals/${rental.id}`); onRefresh(); onClose(); }
        catch { alert('Erreur'); }
    };

    const handleOwnerReport = () => {
        const now = new Date();
        window.open(`/api/rentals/${rental.id}/report/${now.getFullYear()}/${now.getMonth() + 1}`, '_blank');
    };

    const tabs = ['infos', 'paiements', 'documents', 'rapport'];
    const tabLabels = { infos: 'Infos', paiements: 'Paiements', documents: 'Documents', rapport: 'Rapport' };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-[480px]">
                    <div className="h-full flex flex-col bg-gray-900 shadow-2xl border-l border-white/10">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">{rental.tenant_name}</h3>
                                <p className="text-xs text-accent-steel">{rental.property_address || (rental.deal_id ? `Deal #${rental.deal_id}` : 'Bien externe')}</p>
                            </div>
                            <button onClick={onClose} className="p-1.5 text-accent-steel hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex border-b border-white/10 px-4 flex-shrink-0">
                            {tabs.map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === t ? 'text-accent border-b-2 border-accent' : 'text-accent-steel hover:text-white'}`}>
                                    {tabLabels[t]}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
                            {tab === 'infos' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Loyer + charges</p>
                                            <p className="text-base font-bold text-white">{fmt(rental.monthly_rent + rental.charges)}/mois</p>
                                            <p className="text-xs text-accent-steel">{fmt(rental.monthly_rent)} + {fmt(rental.charges)} charges</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-accent-steel uppercase tracking-widest mb-1">Dépôt de garantie</p>
                                            <p className="text-base font-bold text-white">{fmt(rental.deposit)}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold">Locataire</p>
                                        <p className="text-sm text-white font-medium">{rental.tenant_name}</p>
                                        <p className="text-xs text-accent-steel">{rental.tenant_email}</p>
                                        {rental.tenant_phone && <p className="text-xs text-accent-steel">{rental.tenant_phone}</p>}
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold">Durée du bail</p>
                                        <p className="text-sm text-white">Du {fmtDate(rental.start_date)} {rental.end_date ? `au ${fmtDate(rental.end_date)}` : '(bail indéterminé)'}</p>
                                        <p className="text-xs text-accent-steel">Préavis : {rental.notice_period_days} jours</p>
                                    </div>
                                    {rental.status === 'active' && (
                                        <button onClick={handleTerminate}
                                            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-sm font-medium transition-colors">
                                            Terminer ce bail
                                        </button>
                                    )}
                                </div>
                            )}
                            {tab === 'paiements' && (
                                <div className="space-y-3">
                                    {loadingPayments ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : payments.length === 0 ? (
                                        <p className="text-center text-accent-steel text-sm py-8">Aucun paiement enregistré</p>
                                    ) : payments.map(p => {
                                        const cfg = PAYMENT_STATUS_CFG[p.status] || PAYMENT_STATUS_CFG.pending;
                                        const isLate = p.status === 'late' || p.status === 'partial';
                                        return (
                                            <div key={p.id} className={`p-4 rounded-xl border ${isLate ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/5 border-white/10'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-white">{monthLabel(p.month)}</span>
                                                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-accent-steel">{fmt(p.amount)}</span>
                                                    {p.paid_date && <span className="text-xs text-accent-steel">Payé le {fmtDate(p.paid_date)}</span>}
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {p.status !== 'paid' && (
                                                        <button onClick={() => handleMarkPaid(p.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors">
                                                            <CheckCircle className="w-3 h-3" /> Marquer payé
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleGenerateReceipt(p.month)}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-accent-steel hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors">
                                                        <FileText className="w-3 h-3" /> Quittance
                                                    </button>
                                                    {isLate && (
                                                        <button onClick={() => handleRemind(p.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors">
                                                            <AlertTriangle className="w-3 h-3" /> Relancer
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {tab === 'documents' && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold mb-2">Upload document</p>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const docType = window.prompt('Type :\n- inventory_in\n- inventory_out\n- receipt', 'inventory_in');
                                                if (!docType) return;
                                                const fd = new FormData();
                                                fd.append('file', file);
                                                fd.append('doc_type', docType);
                                                try {
                                                    await api.post(`/api/rentals/${rental.id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                    fetchDocuments();
                                                } catch { alert('Erreur upload'); }
                                            }}
                                            className="text-xs text-accent-steel" />
                                    </div>
                                    {documents.length === 0 ? (
                                        <p className="text-center text-accent-steel text-sm py-4">Aucun document</p>
                                    ) : documents.map(d => (
                                        <div key={d.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                            <div>
                                                <p className="text-sm text-white font-medium">{d.doc_type}</p>
                                                <p className="text-xs text-accent-steel">{fmtDate(d.uploaded_at)}</p>
                                            </div>
                                            <FileText className="w-4 h-4 text-accent-steel" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {tab === 'rapport' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-accent-steel uppercase tracking-widest font-bold mb-2">Rapport mensuel propriétaire</p>
                                        <p className="text-xs text-accent-steel mb-4">Génère un rapport PDF du mois en cours avec récapitulatif des loyers, charges et impayés éventuels.</p>
                                        <button onClick={handleOwnerReport}
                                            className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Générer le rapport du mois
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Rentals = () => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRental, setSelectedRental] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    const fetchRentals = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            const r = await api.get('/api/rentals/', { params });
            setRentals(r.data);
        } catch { setRentals([]); }
        setLoading(false);
    };

    useEffect(() => { fetchRentals(); }, [filterStatus]);

    const filtered = rentals.filter(r =>
        !search ||
        r.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.tenant_email?.toLowerCase().includes(search.toLowerCase()) ||
        r.property_address?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            {showModal && <RentalModal onClose={() => setShowModal(false)} onSaved={fetchRentals} />}
            {selectedRental && (
                <RentalDrawer
                    rental={selectedRental}
                    onClose={() => setSelectedRental(null)}
                    onRefresh={fetchRentals}
                />
            )}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Home className="w-6 h-6 text-accent" />
                        Gestion locative
                        <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-bold">
                            {rentals.filter(r => r.status === 'active').length} actifs
                        </span>
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Suivi des baux, paiements et quittances</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors">
                    <Plus className="w-4 h-4" /> Nouvelle location
                </button>
            </div>
            <div className="flex gap-3 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher locataire, adresse..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50 min-w-[220px]" />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                    <option value="">Tous statuts</option>
                    <option value="active" className="bg-gray-900">Actifs</option>
                    <option value="terminated" className="bg-gray-900">Terminés</option>
                </select>
            </div>
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass rounded-xl border border-white/5 p-12 text-center">
                    <Home className="w-10 h-10 text-accent-steel mx-auto mb-3" />
                    <p className="text-accent-steel text-sm">Aucune location. Créez votre première fiche locative.</p>
                </div>
            ) : (
                <div className="glass overflow-hidden rounded-xl border border-white/5 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['Locataire', 'Bien', 'Loyer/mois', 'Début bail', 'Statut', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map(r => {
                                const cfg = STATUS_CFG[r.status] || STATUS_CFG.active;
                                return (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedRental(r)}>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-white">{r.tenant_name}</p>
                                            <p className="text-xs text-accent-steel">{r.tenant_email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-accent-steel max-w-[180px] truncate">
                                            {r.property_address || (r.deal_id ? `Deal #${r.deal_id}` : 'Bien externe')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-bold text-white">{fmt(r.monthly_rent + r.charges)}</p>
                                            <p className="text-xs text-accent-steel">{fmt(r.monthly_rent)} + {fmt(r.charges)} ch.</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-accent-steel">{fmtDate(r.start_date)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedRental(r); }}
                                                className="p-1.5 text-accent-steel hover:text-accent transition-colors">
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
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

export default Rentals;
