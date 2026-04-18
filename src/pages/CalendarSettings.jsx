import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Save, CheckCircle, Link2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import api from '../services/api';

const DAYS = [
    { id: 1, label: 'Lun' }, { id: 2, label: 'Mar' }, { id: 3, label: 'Mer' },
    { id: 4, label: 'Jeu' }, { id: 5, label: 'Ven' }, { id: 6, label: 'Sam' }, { id: 7, label: 'Dim' },
];
const DURATIONS = [15, 30, 45, 60];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FRENCH_HOLIDAYS_2026 = [
    '2026-01-01','2026-04-06','2026-05-01','2026-05-08','2026-05-14',
    '2026-05-25','2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25',
];

// ── Calcul local des créneaux (sans API, pour aperçu immédiat) ───────────────
function computeSlots(cfg, dateIso) {
    const d = new Date(dateIso);
    const weekday = d.getDay() === 0 ? 7 : d.getDay(); // lun=1 … dim=7
    if (!cfg.work_days.includes(weekday)) return [];
    if (cfg.excluded_dates.includes(dateIso)) return [];

    const toMin = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const start = toMin(cfg.start_time);
    const end = toMin(cfg.end_time);
    const lunchS = toMin(cfg.lunch_start);
    const lunchE = toMin(cfg.lunch_end);
    const dur = cfg.slot_duration;

    const slots = [];
    let cur = start;
    while (cur + dur <= end) {
        if (cur < lunchE && cur + dur > lunchS) { cur = lunchE; continue; }
        slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
        cur += dur;
    }
    return slots;
}

// ── Timeline journée type ────────────────────────────────────────────────────
const DayTimeline = ({ cfg }) => {
    const toMin = (t) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const startMin = toMin(cfg.start_time);
    const endMin = toMin(cfg.end_time);
    const lunchS = toMin(cfg.lunch_start);
    const lunchE = toMin(cfg.lunch_end);
    const total = endMin - startMin;
    const pct = (a, b) => `${Math.round((b - a) / total * 100)}%`;
    const left = (a) => `${Math.round((a - startMin) / total * 100)}%`;

    const slots = computeSlots(cfg, new Date().toISOString().slice(0, 10));

    return (
        <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Journée type</p>
            <div className="relative h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                {/* Travail */}
                <div className="absolute top-0 h-full bg-accent/20 border-r border-accent/10"
                    style={{ left: '0%', width: pct(startMin, lunchS) }} />
                {/* Pause */}
                <div className="absolute top-0 h-full bg-amber-500/20"
                    style={{ left: left(lunchS), width: pct(lunchS, lunchE) }} />
                {/* Après-midi */}
                <div className="absolute top-0 h-full bg-accent/20"
                    style={{ left: left(lunchE), width: pct(lunchE, endMin) }} />
                {/* Labels */}
                <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                    <span className="text-[9px] font-bold text-accent">{cfg.start_time}</span>
                    <span className="text-[9px] text-amber-400">{cfg.lunch_start}–{cfg.lunch_end}</span>
                    <span className="text-[9px] font-bold text-accent">{cfg.end_time}</span>
                </div>
            </div>
            <p className="text-[10px] text-accent-steel">
                <span className="text-white font-bold">{slots.length}</span> créneaux de {cfg.slot_duration} min disponibles ce jour
            </p>
        </div>
    );
};

// ── Mini-calendrier interactif ───────────────────────────────────────────────
const MiniCalendar = ({ cfg }) => {
    const [cur, setCur] = useState(new Date());
    const [selDay, setSelDay] = useState(null);
    const today = new Date();

    const year = cur.getFullYear();
    const month = cur.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay + 6) % 7;

    const isoOf = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasSlots = (d) => computeSlots(cfg, isoOf(d)).length > 0;
    const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast = (d) => new Date(isoOf(d)) < new Date(today.toISOString().slice(0, 10));

    const selSlots = selDay ? computeSlots(cfg, isoOf(selDay)) : [];

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div className="space-y-4">
            {/* Nav mois */}
            <div className="flex items-center justify-between">
                <button onClick={() => { setCur(new Date(year, month - 1)); setSelDay(null); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-white">{MOIS[month]} {year}</span>
                <button onClick={() => { setCur(new Date(year, month + 1)); setSelDay(null); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-accent-steel hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Grille */}
            <div className="grid grid-cols-7 gap-1">
                {['L','M','M','J','V','S','D'].map((j, i) => (
                    <div key={i} className="text-center text-[9px] font-bold text-accent-steel uppercase pb-1">{j}</div>
                ))}
                {cells.map((d, i) => (
                    <div key={i}>
                        {d === null ? <div /> : (
                            <button
                                onClick={() => setSelDay(d === selDay ? null : d)}
                                disabled={isPast(d)}
                                className={`w-full aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center relative
                                    ${isPast(d) ? 'opacity-25 cursor-not-allowed text-accent-steel' :
                                    d === selDay ? 'bg-accent text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' :
                                    hasSlots(d) ? 'bg-accent/15 text-accent hover:bg-accent/25 cursor-pointer' :
                                    'text-accent-steel/60 cursor-pointer hover:bg-white/5'}
                                    ${isToday(d) && d !== selDay ? 'ring-1 ring-accent/50' : ''}`}
                            >
                                {d}
                                {hasSlots(d) && d !== selDay && !isPast(d) && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Créneaux du jour sélectionné */}
            {selDay && (
                <div className="border-t border-white/10 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">
                            {selDay} {MOIS[month]} — {selSlots.length} créneau(x)
                        </p>
                        <button onClick={() => setSelDay(null)} className="text-accent-steel hover:text-white transition-colors">
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
                                <span key={s} className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent font-medium">
                                    {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Légende */}
            <div className="flex gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-[10px] text-accent-steel">
                    <div className="w-3 h-3 rounded bg-accent/20 border border-accent/30" />Disponible
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-accent-steel">
                    <div className="w-3 h-3 rounded bg-white/5 border border-white/10" />Fermé
                </div>
            </div>
        </div>
    );
};

// ── Page principale ──────────────────────────────────────────────────────────
const CalendarSettings = () => {
    const [cfg, setCfg] = useState({
        work_days: [1, 2, 3, 4, 5],
        start_time: '09:00',
        end_time: '18:00',
        slot_duration: 30,
        lunch_start: '12:00',
        lunch_end: '13:00',
        excluded_dates: [],
        calendar_url: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newDate, setNewDate] = useState('');

    useEffect(() => {
        api.get('/api/calendar/config')
            .then(r => setCfg({ ...r.data, calendar_url: r.data.calendar_url || '', excluded_dates: r.data.excluded_dates || [] }))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const toggleDay = (id) => setCfg(c => ({
        ...c,
        work_days: c.work_days.includes(id) ? c.work_days.filter(d => d !== id) : [...c.work_days, id].sort(),
    }));

    const addDate = () => {
        if (!newDate || cfg.excluded_dates.includes(newDate)) return;
        setCfg(c => ({ ...c, excluded_dates: [...c.excluded_dates, newDate].sort() }));
        setNewDate('');
    };

    const removeDate = (d) => setCfg(c => ({ ...c, excluded_dates: c.excluded_dates.filter(x => x !== d) }));

    const addHolidays = () => {
        const merged = [...new Set([...cfg.excluded_dates, ...FRENCH_HOLIDAYS_2026])].sort();
        setCfg(c => ({ ...c, excluded_dates: merged }));
    };

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/api/calendar/config', cfg);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
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

            {/* Layout 2 colonnes */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── Colonne gauche : config ── */}
                <div className="xl:col-span-3 space-y-4">

                    {/* Jours de travail */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-3">
                        <h2 className="font-bold text-white text-sm">Jours de travail</h2>
                        <div className="flex gap-2">
                            {DAYS.map(d => (
                                <button key={d.id} onClick={() => toggleDay(d.id)}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                                        cfg.work_days.includes(d.id)
                                            ? 'bg-accent/20 border-accent text-accent'
                                            : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'
                                    }`}>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Horaires */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-4">
                        <h2 className="font-bold text-white text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4 text-accent" />Horaires
                        </h2>

                        {/* Plage travail */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Début</label>
                                <input type="time" value={cfg.start_time}
                                    onChange={e => setCfg(c => ({ ...c, start_time: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Fin</label>
                                <input type="time" value={cfg.end_time}
                                    onChange={e => setCfg(c => ({ ...c, end_time: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                            </div>
                        </div>

                        {/* Pause déjeuner */}
                        <div className="pt-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel block mb-2">Pause déjeuner</label>
                            <div className="flex items-center gap-3">
                                <input type="time" value={cfg.lunch_start}
                                    onChange={e => setCfg(c => ({ ...c, lunch_start: e.target.value }))}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                                <span className="text-accent-steel text-xs font-bold">→</span>
                                <input type="time" value={cfg.lunch_end}
                                    onChange={e => setCfg(c => ({ ...c, lunch_end: e.target.value }))}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                            </div>
                        </div>

                        {/* Timeline */}
                        <DayTimeline cfg={cfg} />

                        {/* Durée RDV */}
                        <div className="pt-1 space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Durée d'un RDV</label>
                            <div className="flex gap-2">
                                {DURATIONS.map(d => (
                                    <button key={d} onClick={() => setCfg(c => ({ ...c, slot_duration: d }))}
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

                    {/* Jours exclus */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-white text-sm">Jours exclus</h2>
                            <button onClick={addHolidays}
                                className="text-[10px] font-bold uppercase tracking-wider text-accent hover:text-white transition-colors">
                                + Fériés 2026
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50" />
                            <button onClick={addDate}
                                className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition-colors">
                                Ajouter
                            </button>
                        </div>
                        {cfg.excluded_dates.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {cfg.excluded_dates.map(d => (
                                    <button key={d} onClick={() => removeDate(d)}
                                        className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-accent-steel hover:border-red-500/40 hover:text-red-400 transition-colors">
                                        {d} <X className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* iCal */}
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-3">
                        <h2 className="font-bold text-white text-sm flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-accent" />Synchronisation iCal
                        </h2>
                        <input type="url" value={cfg.calendar_url}
                            onChange={e => setCfg(c => ({ ...c, calendar_url: e.target.value }))}
                            placeholder="https://calendar.google.com/calendar/ical/..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-accent/50" />
                        {cfg.calendar_url ? (
                            <p className="text-[10px] text-emerald-400">● Connecté — cache automatique 15 min</p>
                        ) : (
                            <p className="text-[10px] text-accent-steel">Collez un lien iCal pour importer vos événements existants.</p>
                        )}
                    </div>
                </div>

                {/* ── Colonne droite : calendrier ── */}
                <div className="xl:col-span-2">
                    <div className="glass rounded-xl border border-white/10 p-5 space-y-4 sticky top-6">
                        <h2 className="font-bold text-white text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-accent" />Aperçu en temps réel
                        </h2>
                        <p className="text-[10px] text-accent-steel -mt-2">Basé sur votre configuration actuelle</p>
                        <MiniCalendar cfg={cfg} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarSettings;
