import React, { useState, useEffect, useRef } from 'react';
import { Search, Mail, Phone, Trash2, LayoutList, Columns } from 'lucide-react';
import { getLeads, updateLead, deleteLead } from '../services/dealService';

const STATUS_COLS = [
    { key: 'new',            label: 'Nouveau',      color: 'border-blue-400/40',    badge: 'bg-blue-400/10 text-blue-400' },
    { key: 'contacted',      label: 'Contacté',     color: 'border-amber-400/40',   badge: 'bg-amber-400/10 text-amber-400' },
    { key: 'visit_scheduled',label: 'RDV prévu',    color: 'border-purple-400/40',  badge: 'bg-purple-400/10 text-purple-400' },
    { key: 'converted',      label: 'Converti',     color: 'border-emerald-400/40', badge: 'bg-emerald-400/10 text-emerald-400' },
    { key: 'lost',           label: 'Perdu',        color: 'border-rose-400/40',    badge: 'bg-rose-400/10 text-rose-400' },
];

const statusCfg = Object.fromEntries(STATUS_COLS.map(c => [c.key, c]));

// ── Kanban Card ──────────────────────────────────────────────────────────────
const KanbanCard = ({ lead, onDragStart, onDelete }) => (
    <div
        draggable
        onDragStart={() => onDragStart(lead)}
        className="glass rounded-lg border border-white/10 p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors select-none"
    >
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] flex-shrink-0">
                    {lead.full_name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-white truncate">{lead.full_name}</span>
            </div>
            <button
                onClick={() => onDelete(lead.id)}
                className="text-accent-steel hover:text-rose-400 transition-colors flex-shrink-0"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-accent-steel">
                <Mail className="w-3 h-3" /><span className="truncate">{lead.email}</span>
            </div>
            {lead.phone && (
                <div className="flex items-center gap-1.5 text-[11px] text-accent-steel">
                    <Phone className="w-3 h-3" /><span>{lead.phone}</span>
                </div>
            )}
        </div>
        <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-white">{(lead.budget || 0).toLocaleString()} €</span>
            <span className="text-accent-steel">apport {(lead.apport || 0).toLocaleString()} €</span>
        </div>
    </div>
);

// ── Kanban Column ────────────────────────────────────────────────────────────
const KanbanCol = ({ col, leads, onDragStart, onDrop, onDragOver, onDelete }) => (
    <div
        className={`flex flex-col min-w-[220px] flex-1 rounded-xl border ${col.color} bg-white/[0.02] overflow-hidden`}
        onDragOver={e => { e.preventDefault(); onDragOver(col.key); }}
        onDrop={() => onDrop(col.key)}
    >
        <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">{col.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>
                {leads.length}
            </span>
        </div>
        <div className="flex-1 p-2 space-y-2 min-h-[120px]">
            {leads.map(l => (
                <KanbanCard key={l.id} lead={l} onDragStart={onDragStart} onDelete={onDelete} />
            ))}
        </div>
    </div>
);

// ── Table Row ─────────────────────────────────────────────────────────────────
const TableRow = ({ lead, onStatusChange, onDelete }) => {
    const cfg = statusCfg[lead.status] || statusCfg.new;
    return (
        <tr className="hover:bg-white/[0.02] transition-colors group">
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
                    <div className="flex items-center gap-2 text-xs text-accent-steel"><Mail className="w-3 h-3" />{lead.email}</div>
                    {lead.phone && <div className="flex items-center gap-2 text-xs text-accent-steel"><Phone className="w-3 h-3" />{lead.phone}</div>}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{(lead.budget || 0).toLocaleString()} €</span>
                    <span className="text-[10px] text-accent-steel">Apport: {(lead.apport || 0).toLocaleString()} €</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${cfg.badge}`}>{cfg.label.toUpperCase()}</span>
            </td>
            <td className="px-6 py-4 text-xs text-accent-steel">{new Date(lead.created_at).toLocaleDateString('fr-FR')}</td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                        value={lead.status}
                        onChange={e => onStatusChange(lead.id, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                    >
                        {STATUS_COLS.map(c => (
                            <option key={c.key} value={c.key} className="bg-gray-900">{c.label}</option>
                        ))}
                    </select>
                    <button onClick={() => onDelete(lead.id)} className="p-1.5 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [view, setView] = useState('list'); // 'list' | 'kanban'
    const [search, setSearch] = useState('');
    const dragLead = useRef(null);
    const [overCol, setOverCol] = useState(null);

    const fetchLeads = async () => {
        setLoading(true);
        const data = await getLeads(filterStatus);
        setLeads(data);
        setLoading(false);
    };

    useEffect(() => { fetchLeads(); }, [filterStatus]);

    const handleStatusChange = async (leadId, newStatus) => {
        try {
            await updateLead(leadId, { status: newStatus });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        } catch { alert('Erreur mise à jour statut'); }
    };

    const handleDelete = async (leadId) => {
        if (!window.confirm('Supprimer ce lead ?')) return;
        try {
            await deleteLead(leadId);
            setLeads(prev => prev.filter(l => l.id !== leadId));
        } catch { alert('Erreur suppression'); }
    };

    // ── Drag & Drop ──
    const onDragStart = (lead) => { dragLead.current = lead; };
    const onDrop = async (newStatus) => {
        if (!dragLead.current || dragLead.current.status === newStatus) return;
        await handleStatusChange(dragLead.current.id, newStatus);
        dragLead.current = null;
        setOverCol(null);
    };

    const filtered = leads.filter(l =>
        (!search || l.full_name.toLowerCase().includes(search.toLowerCase()) ||
            l.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pipeline Leads</h1>
                    <p className="text-accent-steel text-sm mt-0.5">Suivi de votre pipeline commercial</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent-steel" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher…"
                            className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent/50 w-48"
                        />
                    </div>
                    {/* Filter (table only) */}
                    {view === 'list' && (
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                        >
                            <option value="">Tous</option>
                            {STATUS_COLS.map(c => <option key={c.key} value={c.key} className="bg-gray-900">{c.label}</option>)}
                        </select>
                    )}
                    {/* Toggle */}
                    <div className="flex rounded-lg border border-white/10 overflow-hidden">
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-2 transition-colors ${view === 'list' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-accent-steel hover:text-white'}`}
                            title="Vue liste"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={`px-3 py-2 transition-colors ${view === 'kanban' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-accent-steel hover:text-white'}`}
                            title="Vue Kanban"
                        >
                            <Columns className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
            ) : view === 'list' ? (
                // ── TABLE ──
                <div className="glass overflow-hidden rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                {['Client', 'Contact', 'Budget / Apport', 'Statut', 'Créé le', 'Actions'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-accent-steel">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-accent-steel">Aucun lead trouvé.</td></tr>
                            ) : filtered.map(lead => (
                                <TableRow key={lead.id} lead={lead} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // ── KANBAN ──
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {STATUS_COLS.map(col => (
                        <KanbanCol
                            key={col.key}
                            col={col}
                            leads={filtered.filter(l => l.status === col.key)}
                            onDragStart={onDragStart}
                            onDrop={onDrop}
                            onDragOver={setOverCol}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Leads;
