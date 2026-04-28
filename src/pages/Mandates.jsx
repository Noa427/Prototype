import React, { useState, useEffect } from 'react';
import { FileText, Plus, Download, AlertTriangle, X, CheckCircle } from 'lucide-react';
import api from '../services/api';

const TYPE_LABELS = { vente: 'Vente', recherche: 'Recherche', location: 'Location', gestion: 'Gestion' };
const STATUS_CFG = {
    actif:   { color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' },
    expiré:  { color: 'bg-gray-400/10 text-gray-400 border-gray-400/30' },
    annulé:  { color: 'bg-rose-400/10 text-rose-400 border-rose-400/30' },
    vendu:   { color: 'bg-blue-400/10 text-blue-400 border-blue-400/30' },
};

const daysLeft = (endDate) => {
    const diff = new Date(endDate) - new Date();
    return Math.ceil(diff / (1000 * 3600 * 24));
};

const EMPTY_FORM = {
    mandate_type: 'vente',
    property_address: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
    exclusive: false,
    commission_rate: 3.0,
};

const MandateModal = ({ onClose, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/api/mandates/', form);
            onSaved();
            onClose();
        } catch (err) {
            alert('Erreur création mandat : ' + (err.response?.data?.detail || err.message));
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative glass border border-white/10 rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Nouveau mandat</h2>
                    <button onClick={onClose} className="text-accent-steel hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Type *</label>
                            <select value={form.mandate_type} onChange={e => set('mandate_type', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k} className="bg-gray-900">{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                            <input type="checkbox" id="exclusive" checked={form.exclusive}
                                onChange={e => set('exclusive', e.target.checked)}
                                className="w-4 h-4 accent-blue-500" />
                            <label htmlFor="exclusive" className="text-sm text-white">Exclusif</label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Adresse du bien *</label>
                        <input required value={form.property_address} onChange={e => set('property_address', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                            placeholder="12 rue de la Paix, 75001 Paris" />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Nom du propriétaire *</label>
                        <input required value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                            placeholder="Jean Dupont" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Email</label>
                            <input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                placeholder="jean@email.com" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Téléphone</label>
                            <input value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-accent-steel/50 focus:outline-none focus:border-accent/50"
                                placeholder="+33 6 00 00 00 00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Date de début *</label>
                            <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Date de fin *</label>
                            <input required type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-accent-steel mb-1">Honoraires (%)</label>
                        <input type="number" step="0.1" min="0" max="20" value={form.commission_rate}
                            onChange={e => set('commission_rate', parseFloat(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                            {saving ? 'Création...' : 'Créer le mandat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Mandates = () => {
    const [mandates, setMandates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchMandates = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType) params.mandate_type = filterType;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/api/mandates/', { params });
            setMandates(res.data);
        } catch { setMandates([]); }
        setLoading(false);
    };

    useEffect(() => { fetchMandates(); }, [filterType, filterStatus]);

    const handleExport = () => {
        window.open('/api/mandates/export', '_blank');
    };

    const handleGeneratePDF = async (id) => {
        window.open(`/api/mandates/${id}/generate-pdf`, '_blank');
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Annuler ce mandat ?')) return;
        try {
            await api.delete(`/api/mandates/${id}`);
            fetchMandates();
        } catch { alert('Erreur annulation mandat'); }
    };

    const actifs = mandates.filter(m => m.status === 'actif').length;

    return (
        <div className="p-4 md:p-8 space-y-6">
            {showModal && <MandateModal onClose={() => setShowModal(false)} onSaved={fetchMandates} />}

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-accent" />
                        Registre des mandats
                        <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-bold">
                            {actifs} actifs
                        </span>
                    </h1>
                    <p className="text-accent-steel text-sm mt-0.5">Conforme Loi Hoguet — numérotation séquentielle</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-sm font-medium transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors">
                        <Plus className="w-4 h-4" /> Nouveau mandat
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div className="flex gap-3 flex-wrap">
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                    <option value="">Tous types</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k} className="bg-gray-900">{v}</option>
                    ))}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50">
                    <option value="">Tous statuts</option>
                    {['actif', 'expiré', 'annulé', 'vendu'].map(s => (
                        <option key={s} value={s} className="bg-gray-900">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : mandates.length === 0 ? (
                <div className="glass rounded-xl border border-white/5 p-12 text-center">
                    <FileText className="w-10 h-10 text-accent-steel mx-auto mb-3" />
                    <p className="text-accent-steel text-sm">Aucun mandat enregistré. Créez votre premier mandat.</p>
                </div>
            ) : (
                <div className="glass overflow-hidden rounded-xl border border-white/5 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['N°', 'Type', 'Bien', 'Propriétaire', 'Début → Fin', 'Commission', 'Statut', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {mandates.map(m => {
                                const cfg = STATUS_CFG[m.status] || STATUS_CFG.actif;
                                const days = m.status === 'actif' ? daysLeft(m.end_date) : null;
                                const expiringSoon = days !== null && days <= 30;
                                const urgent = days !== null && days <= 7;
                                return (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-bold text-white text-sm">
                                                {String(m.mandate_number).padStart(4, '0')}
                                            </span>
                                            {m.exclusive && (
                                                <span className="ml-1 text-[9px] font-bold text-purple-400">EX</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white">{TYPE_LABELS[m.mandate_type] || m.mandate_type}</td>
                                        <td className="px-4 py-3 text-sm text-accent-steel max-w-[200px] truncate">{m.property_address}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-white">{m.owner_name}</p>
                                            {m.owner_email && <p className="text-[11px] text-accent-steel">{m.owner_email}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-accent-steel">
                                            {new Date(m.start_date).toLocaleDateString('fr-FR')} →{' '}
                                            {new Date(m.end_date).toLocaleDateString('fr-FR')}
                                            {expiringSoon && (
                                                <div className={`flex items-center gap-1 mt-0.5 text-[10px] font-bold ${urgent ? 'text-rose-400' : 'text-amber-400'}`}>
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Expire dans {days}j
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white">{m.commission_rate}%</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                                                {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleGeneratePDF(m.id)}
                                                    className="p-1.5 text-accent-steel hover:text-accent transition-colors" title="Générer PDF">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </button>
                                                {m.status === 'actif' && (
                                                    <button onClick={() => handleCancel(m.id)}
                                                        className="p-1.5 text-accent-steel hover:text-rose-400 transition-colors" title="Annuler">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
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

export default Mandates;
