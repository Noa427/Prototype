import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Save, CheckCircle, Link2, ChevronLeft, ChevronRight, X, Ban, Plus, ChevronDown, RotateCcw } from 'lucide-react';
import api from '../services/api';

const DAYS = [
    { id: 1, label: 'Lun', full: 'Lundi' },
    { id: 2, label: 'Mar', full: 'Mardi' },
    { id: 3, label: 'Mer', full: 'Mercredi' },
    { id: 4, label: 'Jeu', full: 'Jeudi' },
    { id: 5, label: 'Ven', full: 'Vendredi' },
    { id: 6, label: 'Sam', full: 'Samedi' },
    { id: 7, label: 'Dim', full: 'Dimanche' },
];
const DURATIONS = [15, 30, 45, 60];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const FRENCH_HOLIDAYS_2026 = [
    '2026-01-01','2026-04-06','2026-05-01','2026-05-08','2026-05-14',
    '2026-05-25','2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25',
];

const BLOCK_TYPE_CONFIG = {
    vacation:    { label: 'Congés',     emoji: '🏖', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
    personal:    { label: 'RDV perso',  emoji: '📌', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    single_date: { label: 'Jour exclu', emoji: '🚫', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
    holiday:     { label: 'Férié',      emoji: '🇫🇷', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
};

// ── Résoudre les horaires effectifs d'un jour (override ou défaut) ───────────
function dayHours(cfg, dayId) {
    const ov = cfg.day_overrides?.[String(dayId)];
    return {
        start_time:  ov?.start_time  ?? cfg.start_time,
        end_time:    ov?.end_time    ?? cfg.end_time,
        lunch_start: ov?.lunch_start ?? cfg.lunch_start,
        lunch_end:   ov?.lunch_end   ?? cfg.lunch_end,
    };
}

// ── Calcul local des créneaux ────────────────────────────────────────────────
function computeSlots(cfg, dateIso) {
    const d = new Date(dateIso);
    const weekday = d.getDay() === 0 ? 7 : d.getDay();
    if (!cfg.work_days.includes(weekday)) return [];
    if (cfg.excluded_dates.includes(dateIso)) return [];

    const h = dayHours(cfg, weekday);
    const toMin = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const start = toMin(h.start_time);
    const end   = toMin(h.end_time);
    const lS    = toMin(h.lunch_start);
    const lE    = toMin(h.lunch_end);
    const dur   = cfg.slot_duration;

    const slots = [];
    let cur = start;
    while (cur + dur <= end) {
        if (cur < lE && cur + dur > lS) { cur = lE; continue; }
        slots.push(`${String(Math.floor(cur / 60)).padStart(2,'0')}:${String(cur % 60).padStart(2,'0')}`);
        cur += dur;
    }
    return slots;
}

// ── Mini-calendrier ──────────────────────────────────────────────────────────
const MiniCalendar = ({ cfg }) => {
    const [cur, setCur] = useState(new Date());
    const [selDay, setSelDay] = useState(null);
    const today = new Date();
    const year = cur.getFullYear(), month = cur.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay + 6) % 7;
    const isoOf = (d) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasSlots = (d) => computeSlots(cfg, isoOf(d)).length > 0;
    const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast  = (d) => new Date(isoOf(d)) < new Date(today.toISOString().slice(0,10));
    const selSlots = selDay ? computeSlots(cfg, isoOf(selDay)) : [];
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    // Vérifier si le jour sélectionné a un override
    const selWeekday = selDay ? (new Date(isoOf(selDay)).getDay() || 7) : null;
    const selHasOverride = selWeekday && cfg.day_overrides?.[String(selWeekday)];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => { setCur(new Date(year, month-1)); setSelDay(null); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white">{MOIS[month]} {year}</span>
                <button onClick={() => { setCur(new Date(year, month+1)); setSelDay(null); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {['L','M','M','J','V','S','D'].map((j,i) => (
                    <div key={i} className="text-center text-[9px] font-bold text-accent-steel uppercase pb-1">{j}</div>
                ))}
                {cells.map((d,i) => (
                    <div key={i}>
                        {d === null ? <div /> : (
                            <button onClick={() => setSelDay(d === selDay ? null : d)} disabled={isPast(d)}
                                className={`w-full aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center relative
                                    ${isPast(d) ? 'opacity-25 cursor-not-allowed text-accent-steel' :
                                    d === selDay ? 'bg-accent text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' :
                                    hasSlots(d) ? 'bg-accent/15 text-accent hover:bg-accent/25 cursor-pointer' :
                                    'text-accent-steel/60 cursor-pointer hover:bg-white/5'}
                                    ${isToday(d) && d !== selDay ? 'ring-1 ring-accent/50' : ''}`}>
                                {d}
                                {hasSlots(d) && d !== selDay && !isPast(d) && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {selDay && (
                <div className="border-t border-white/10 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">
                            {selDay} {MOIS[month]} · {selSlots.length} créneau(x)
                            {selHasOverride && <span className="ml-2 text-orange-400">horaires perso</span>}
                        </p>
                        <button onClick={() => setSelDay(null)} className="text-accent-steel hover:text-white">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {selSlots.length === 0 ? (
                        <p className="text-xs text-accent-steel italic">
                            {cfg.excluded_dates.includes(isoOf(selDay)) ? 'Jour exclu' : 'Jour non travaillé'}
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {selSlots.map(s => (
                                <span key={s} className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent font-medium">{s}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div className="flex gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-[10px] text-accent-steel">
                    <div className="w-3 h-3 rounded bg-accent/20 border border-accent/30" />Disponible
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-accent-steel">
                    <div className="w-3 h-3 rounded bg-white/5 border border-white/10" />Indispo
                </div>
            </div>
        </div>
    );
};

// ── Champ heure simple ───────────────────────────────────────────────────────
const TimeInput = ({ label, value, onChange, accent }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">{label}</label>
        <input type="time" value={value} onChange={e => onChange(e.target.value)}
            className={`w-full bg-white/5 border rounded-lg py-2 px-3 text-sm text-white focus:outline-none ${
                accent ? 'border-orange-500/30 focus:border-orange-500/50' : 'border-white/10 focus:border-accent/50'
            }`} />
    </div>
);

// ── Override par jour (inline) ───────────────────────────────────────────────
const DayOverridePanel = ({ dayId, dayLabel, defaultHours, override, onChange, onRemove }) => {
    const h = override ?? defaultHours;
    return (
        <div className="mt-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-400">Horaires spéciaux — {dayLabel}</span>
                <button onClick={onRemove} className="flex items-center gap-1 text-[10px] text-accent-steel hover:text-red-400 transition-colors">
                    <RotateCcw className="w-3 h-3" />Réinitialiser
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <TimeInput label="Début" value={h.start_time} accent
                    onChange={v => onChange({ ...h, start_time: v })} />
                <TimeInput label="Fin" value={h.end_time} accent
                    onChange={v => onChange({ ...h, end_time: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <TimeInput label="Pause début" value={h.lunch_start} accent
                    onChange={v => onChange({ ...h, lunch_start: v })} />
                <TimeInput label="Pause fin" value={h.lunch_end} accent
                    onChange={v => onChange({ ...h, lunch_end: v })} />
            </div>
        </div>
    );
};

// ── Page principale ──────────────────────────────────────────────────────────
const CalendarSettings = () => {
    const [cfg, setCfg] = useState({
        work_days: [1,2,3,4,5],
        start_time: '09:00', end_time: '18:00',
        slot_duration: 30,
        lunch_start: '12:00', lunch_end: '13:00',
        excluded_dates: [],
        calendar_url: '',
        day_overrides: {},
    });
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [saved, setSaved]       = useState(false);
    const [expandedDay, setExpandedDay] = useState(null);

    // Indisponibilités
    const [blocks, setBlocks]           = useState([]);
    const [showModal, setShowModal]     = useState(false);
    const [modalType, setModalType]     = useState('vacation'); // vacation | personal | single_date
    const [newBlock, setNewBlock]       = useState({ start: '', end: '', reason: '' });
    const [savingBlock, setSavingBlock] = useState(false);

    useEffect(() => {
        api.get('/api/calendar/config')
            .then(r => setCfg({ ...r.data, calendar_url: r.data.calendar_url || '', day_overrides: r.data.day_overrides || {} }))
            .catch(console.error)
            .finally(() => setLoading(false));
        api.get('/api/calendar/blocks').then(r => setBlocks(r.data)).catch(() => {});
    }, []);

    const toggleDay = (id) => {
        setCfg(c => ({
            ...c,
            work_days: c.work_days.includes(id)
                ? c.work_days.filter(d => d !== id)
                : [...c.work_days, id].sort(),
        }));
        // Supprimer l'override si le jour est désactivé
        if (cfg.work_days.includes(id)) {
            setDayOverride(id, null);
            if (expandedDay === id) setExpandedDay(null);
        }
    };

    const setDayOverride = (dayId, value) => {
        setCfg(c => {
            const next = { ...c.day_overrides };
            if (value === null) delete next[String(dayId)];
            else next[String(dayId)] = value;
            return { ...c, day_overrides: next };
        });
    };

    const defaultHours = { start_time: cfg.start_time, end_time: cfg.end_time, lunch_start: cfg.lunch_start, lunch_end: cfg.lunch_end };

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/api/calendar/config', cfg);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    // ── Indisponibilités ──
    const openModal = (type) => {
        setModalType(type);
        setNewBlock({ start: '', end: '', reason: '' });
        setShowModal(true);
    };

    const addHolidays = () => {
        const merged = [...new Set([...cfg.excluded_dates, ...FRENCH_HOLIDAYS_2026])].sort();
        setCfg(c => ({ ...c, excluded_dates: merged }));
    };

    // Construire la liste unifiée des indisponibilités
    const singleDateItems = cfg.excluded_dates
        .filter(d => !FRENCH_HOLIDAYS_2026.includes(d))
        .map(d => ({ _type: 'single_date', _key: 'exc:' + d, date: d }));
    const holidayItems = cfg.excluded_dates
        .filter(d => FRENCH_HOLIDAYS_2026.includes(d))
        .map(d => ({ _type: 'holiday', _key: 'hol:' + d, date: d }));
    const blockItems = blocks.map(b => ({ _type: b.block_type, _key: 'blk:' + b.id, ...b }));
    const allItems = [...blockItems, ...singleDateItems, ...holidayItems]
        .sort((a, b) => {
            const da = a.start_datetime || a.date;
            const db = b.start_datetime || b.date;
            return da < db ? -1 : 1;
        });

    const removeItem = async (item) => {
        if (item._key.startsWith('exc:') || item._key.startsWith('hol:')) {
            setCfg(c => ({ ...c, excluded_dates: c.excluded_dates.filter(d => d !== item.date) }));
        } else {
            await api.delete(`/api/calendar/blocks/${item.id}`);
            setBlocks(b => b.filter(x => x.id !== item.id));
        }
    };

    const handleCreateBlock = async () => {
        setSavingBlock(true);
        try {
            if (modalType === 'single_date') {
                if (!newBlock.start) return;
                setCfg(c => ({
                    ...c,
                    excluded_dates: [...new Set([...c.excluded_dates, newBlock.start])].sort(),
                }));
                setShowModal(false);
                return;
            }
            // vacation : date pickers → transform to datetime
            let start_dt = newBlock.start;
            let end_dt   = newBlock.end;
            if (modalType === 'vacation') {
                start_dt = newBlock.start + 'T00:00:00';
                end_dt   = newBlock.end   + 'T23:59:59';
                // Ajouter aussi toutes les dates de la plage à excluded_dates
                const datesInRange = [];
                let cur = new Date(newBlock.start);
                const endD = new Date(newBlock.end);
                while (cur <= endD) {
                    datesInRange.push(cur.toISOString().slice(0,10));
                    cur.setDate(cur.getDate() + 1);
                }
                setCfg(c => ({
                    ...c,
                    excluded_dates: [...new Set([...c.excluded_dates, ...datesInRange])].sort(),
                }));
            }
            const res = await api.post('/api/calendar/blocks', {
                block_type: modalType,
                start_datetime: start_dt,
                end_datetime: end_dt,
                reason: newBlock.reason || null,
            });
            setBlocks(b => [...b, res.data].sort((a,b) => a.start_datetime < b.start_datetime ? -1 : 1));
            setShowModal(false);
        } catch (e) { console.error(e); }
        finally { setSavingBlock(false); }
    };

    const formatBlockDates = (item) => {
        if (item._type === 'single_date' || item._type === 'holiday') {
            return new Date(item.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const s = new Date(item.start_datetime);
        const e = new Date(item.end_datetime);
        const sameDay = s.toDateString() === e.toDateString();
        if (sameDay) {
            return `${s.toLocaleDateString('fr-FR', {day:'numeric',month:'short'})} · ${s.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}–${e.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
        }
        return `${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} → ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
        </div>
    );

    return (
        <div className="p-6 space-y-6 max-w-6xl">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-accent" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Calendrier</h1>
                        <p className="text-xs text-accent-steel uppercase tracking-widest mt-0.5">Disponibilités & créneaux RDV</p>
                    </div>
                </div>
                <button onClick={save} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-bold transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    {saved ? <CheckCircle className="w-4 h-4" /> : saving
                        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <Save className="w-4 h-4" />}
                    {saved ? 'Sauvegardé !' : 'Sauvegarder'}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── Colonne gauche ── */}
                <div className="xl:col-span-3 space-y-4">

                    {/* Jours de travail */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-3">
                        <h2 className="font-bold text-white text-sm">Jours de travail</h2>
                        <div className="flex gap-2">
                            {DAYS.map(d => {
                                const active = cfg.work_days.includes(d.id);
                                const hasOverride = !!cfg.day_overrides?.[String(d.id)];
                                return (
                                    <button key={d.id} onClick={() => toggleDay(d.id)}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border relative ${
                                            active
                                                ? hasOverride
                                                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
                                                    : 'bg-accent/20 border-accent text-accent'
                                                : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'
                                        }`}>
                                        {d.label}
                                        {hasOverride && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Horaires */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-accent" />
                            <h2 className="font-bold text-white text-sm">Horaires par défaut</h2>
                            <span className="text-[10px] text-accent-steel ml-1">s'applique à tous les jours sauf exception</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <TimeInput label="Début" value={cfg.start_time} onChange={v => setCfg(c => ({...c, start_time: v}))} />
                            <TimeInput label="Fin"   value={cfg.end_time}   onChange={v => setCfg(c => ({...c, end_time: v}))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <TimeInput label="Pause début" value={cfg.lunch_start} onChange={v => setCfg(c => ({...c, lunch_start: v}))} />
                            <TimeInput label="Pause fin"   value={cfg.lunch_end}   onChange={v => setCfg(c => ({...c, lunch_end: v}))} />
                        </div>

                        {/* Exceptions par jour */}
                        <div className="pt-1 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel flex items-center gap-2">
                                Exceptions par jour
                                <span className="font-normal normal-case tracking-normal">— cliquer un jour actif pour personnaliser</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.filter(d => cfg.work_days.includes(d.id)).map(d => {
                                    const ov = cfg.day_overrides?.[String(d.id)];
                                    const isExpanded = expandedDay === d.id;
                                    const h = ov ?? defaultHours;
                                    return (
                                        <div key={d.id} className="w-full">
                                            <button
                                                onClick={() => setExpandedDay(isExpanded ? null : d.id)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                                                    ov
                                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                                        : 'bg-white/5 border-white/10 text-accent-steel hover:text-white hover:border-white/20'
                                                }`}>
                                                <span className="font-bold">{d.full}</span>
                                                <span className={ov ? 'text-orange-400' : 'text-accent-steel'}>
                                                    {h.start_time}–{h.end_time}
                                                    {ov && ' ✎'}
                                                </span>
                                                <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isExpanded && (
                                                <DayOverridePanel
                                                    dayId={d.id}
                                                    dayLabel={d.full}
                                                    defaultHours={defaultHours}
                                                    override={ov}
                                                    onChange={v => setDayOverride(d.id, v)}
                                                    onRemove={() => { setDayOverride(d.id, null); setExpandedDay(null); }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Durée RDV */}
                        <div className="pt-1 space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Durée d'un RDV</label>
                            <div className="flex gap-2">
                                {DURATIONS.map(d => (
                                    <button key={d} onClick={() => setCfg(c => ({...c, slot_duration: d}))}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                            cfg.slot_duration === d
                                                ? 'bg-accent/20 border-accent text-accent'
                                                : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'
                                        }`}>
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Indisponibilités */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Ban className="w-4 h-4 text-accent" />
                                <h2 className="font-bold text-white text-sm">Indisponibilités</h2>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={addHolidays}
                                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                                    🇫🇷 Fériés 2026
                                </button>
                                <button onClick={() => openModal('vacation')}
                                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
                                    <Plus className="w-3 h-3" />Congés
                                </button>
                                <button onClick={() => openModal('single_date')}
                                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                                    <Plus className="w-3 h-3" />Jour
                                </button>
                                <button onClick={() => openModal('personal')}
                                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors">
                                    <Plus className="w-3 h-3" />RDV
                                </button>
                            </div>
                        </div>

                        {allItems.length === 0 ? (
                            <p className="text-[11px] text-accent-steel py-2">Aucune indisponibilité. Utilisez les boutons ci-dessus pour en ajouter.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {allItems.map(item => {
                                    const tc = BLOCK_TYPE_CONFIG[item._type] || BLOCK_TYPE_CONFIG.vacation;
                                    return (
                                        <div key={item._key} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${tc.bg}`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-base leading-none">{tc.emoji}</span>
                                                <div>
                                                    <span className={`text-xs font-semibold ${tc.color}`}>{tc.label}</span>
                                                    <p className="text-[11px] text-accent-steel mt-0.5">
                                                        {formatBlockDates(item)}
                                                        {item.reason && ` — ${item.reason}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeItem(item)}
                                                className="p-1.5 rounded hover:bg-red-500/20 text-accent-steel hover:text-red-400 transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* iCal */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-3">
                        <h2 className="font-bold text-white text-sm flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-accent" />Synchronisation iCal
                        </h2>
                        <input type="url" value={cfg.calendar_url}
                            onChange={e => setCfg(c => ({...c, calendar_url: e.target.value}))}
                            placeholder="https://calendar.google.com/calendar/ical/..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-accent/50" />
                        {cfg.calendar_url
                            ? <p className="text-[10px] text-emerald-400">● Connecté — cache automatique 15 min</p>
                            : <p className="text-[10px] text-accent-steel">Collez un lien iCal pour importer vos événements existants.</p>}
                    </div>
                </div>

                {/* ── Colonne droite : aperçu ── */}
                <div className="xl:col-span-2">
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-4 sticky top-6">
                        <div>
                            <h2 className="font-bold text-white text-sm flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />Aperçu en temps réel
                            </h2>
                            <p className="text-[10px] text-accent-steel mt-0.5">Cliquer un jour pour voir ses créneaux</p>
                        </div>
                        <MiniCalendar cfg={cfg} />
                        {/* Récap horaires actifs */}
                        <div className="border-t border-white/10 pt-3 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel mb-2">Horaires actifs</p>
                            {DAYS.filter(d => cfg.work_days.includes(d.id)).map(d => {
                                const h = dayHours(cfg, d.id);
                                const ov = !!cfg.day_overrides?.[String(d.id)];
                                return (
                                    <div key={d.id} className="flex items-center justify-between text-[11px]">
                                        <span className={ov ? 'text-orange-400 font-medium' : 'text-accent-steel'}>{d.full}{ov ? ' ✎' : ''}</span>
                                        <span className="text-white font-mono">{h.start_time}–{h.end_time}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Modal indisponibilité ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm">
                                {modalType === 'vacation'    && '🏖 Ajouter des congés'}
                                {modalType === 'single_date' && '🚫 Exclure un jour'}
                                {modalType === 'personal'    && '📌 RDV personnel'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-white/10 text-accent-steel">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {modalType === 'single_date' && (
                                <div className="space-y-1">
                                    <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Date</label>
                                    <input type="date" value={newBlock.start}
                                        onChange={e => setNewBlock(v => ({...v, start: e.target.value}))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                                </div>
                            )}
                            {modalType === 'vacation' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Du</label>
                                        <input type="date" value={newBlock.start}
                                            onChange={e => setNewBlock(v => ({...v, start: e.target.value}))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Au</label>
                                        <input type="date" value={newBlock.end} min={newBlock.start}
                                            onChange={e => setNewBlock(v => ({...v, end: e.target.value}))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                                    </div>
                                </>
                            )}
                            {modalType === 'personal' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Début</label>
                                        <input type="datetime-local" value={newBlock.start}
                                            onChange={e => setNewBlock(v => ({...v, start: e.target.value}))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Fin</label>
                                        <input type="datetime-local" value={newBlock.end} min={newBlock.start}
                                            onChange={e => setNewBlock(v => ({...v, end: e.target.value}))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                                    </div>
                                </>
                            )}
                            {modalType !== 'single_date' && (
                                <div className="space-y-1">
                                    <label className="text-[11px] text-accent-steel uppercase font-bold tracking-wider">Raison (optionnel)</label>
                                    <input type="text" value={newBlock.reason}
                                        onChange={e => setNewBlock(v => ({...v, reason: e.target.value}))}
                                        placeholder="Ex: Séminaire, médecin…"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                                </div>
                            )}
                        </div>

                        <button onClick={handleCreateBlock} disabled={savingBlock || !newBlock.start || (modalType !== 'single_date' && modalType !== 'personal' ? !newBlock.end : false)}
                            className="w-full py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent/80 transition-colors disabled:opacity-40">
                            {savingBlock ? 'Enregistrement…' : 'Confirmer'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarSettings;
