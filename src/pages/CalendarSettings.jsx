import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Save, CheckCircle, RefreshCw, Link2, Eye } from 'lucide-react';
import api from '../services/api';

const DAYS = [
    { id: 1, label: 'Lun' }, { id: 2, label: 'Mar' }, { id: 3, label: 'Mer' },
    { id: 4, label: 'Jeu' }, { id: 5, label: 'Ven' }, { id: 6, label: 'Sam' }, { id: 7, label: 'Dim' },
];
const DURATIONS = [15, 30, 45, 60];
const FRENCH_HOLIDAYS_2026 = [
    '2026-01-01','2026-04-06','2026-05-01','2026-05-08','2026-05-14',
    '2026-05-25','2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25',
];

const TimeInput = ({ label, value, onChange }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">{label}</label>
        <input
            type="time"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50"
        />
    </div>
);

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
    const [syncStatus, setSyncStatus] = useState(null); // null | 'loading' | {slots, date}
    const [previewDate, setPreviewDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        api.get('/api/calendar/config')
            .then(r => setCfg({ ...r.data, calendar_url: r.data.calendar_url || '' }))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const toggleDay = (id) =>
        setCfg(c => ({
            ...c,
            work_days: c.work_days.includes(id) ? c.work_days.filter(d => d !== id) : [...c.work_days, id].sort(),
        }));

    const addDate = () => {
        if (!newDate || cfg.excluded_dates.includes(newDate)) return;
        setCfg(c => ({ ...c, excluded_dates: [...c.excluded_dates, newDate].sort() }));
        setNewDate('');
    };

    const removeDate = (d) =>
        setCfg(c => ({ ...c, excluded_dates: c.excluded_dates.filter(x => x !== d) }));

    const addHolidays = () => {
        const merged = [...new Set([...cfg.excluded_dates, ...FRENCH_HOLIDAYS_2026])].sort();
        setCfg(c => ({ ...c, excluded_dates: merged }));
    };

    const testSync = async () => {
        setSyncStatus('loading');
        try {
            const { data } = await api.get(`/api/calendar/slots?date=${previewDate}`);
            setSyncStatus({ slots: data.slots, date: data.date });
        } catch (e) {
            setSyncStatus({ slots: [], date: previewDate, error: true });
        }
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
        <div className="p-6 max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-accent" />
                <div>
                    <h1 className="text-2xl font-bold text-white">Calendrier</h1>
                    <p className="text-xs text-accent-steel uppercase tracking-widest mt-0.5">Disponibilités & créneaux RDV</p>
                </div>
            </div>

            {/* Jours de travail */}
            <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
                <h2 className="font-bold text-white text-sm">Jours de travail</h2>
                <div className="flex gap-2 flex-wrap">
                    {DAYS.map(d => (
                        <button
                            key={d.id}
                            onClick={() => toggleDay(d.id)}
                            className={`w-12 h-10 rounded-lg text-xs font-bold transition-all border ${
                                cfg.work_days.includes(d.id)
                                    ? 'bg-accent/20 border-accent text-accent'
                                    : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Horaires */}
            <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" /> Horaires
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <TimeInput label="Début" value={cfg.start_time} onChange={v => setCfg(c => ({ ...c, start_time: v }))} />
                    <TimeInput label="Fin" value={cfg.end_time} onChange={v => setCfg(c => ({ ...c, end_time: v }))} />
                    <TimeInput label="Pause déjeuner — début" value={cfg.lunch_start} onChange={v => setCfg(c => ({ ...c, lunch_start: v }))} />
                    <TimeInput label="Pause déjeuner — fin" value={cfg.lunch_end} onChange={v => setCfg(c => ({ ...c, lunch_end: v }))} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">Durée d'un RDV (min)</label>
                    <div className="flex gap-2">
                        {DURATIONS.map(d => (
                            <button
                                key={d}
                                onClick={() => setCfg(c => ({ ...c, slot_duration: d }))}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    cfg.slot_duration === d
                                        ? 'bg-accent/20 border-accent text-accent'
                                        : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'
                                }`}
                            >
                                {d} min
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Jours exclus */}
            <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-white text-sm">Jours exclus</h2>
                    <button
                        onClick={addHolidays}
                        className="text-xs text-accent hover:text-white transition-colors"
                    >
                        + Jours fériés 2026
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50"
                    />
                    <button
                        onClick={addDate}
                        className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition-colors"
                    >
                        Ajouter
                    </button>
                </div>
                {cfg.excluded_dates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {cfg.excluded_dates.map(d => (
                            <span
                                key={d}
                                onClick={() => removeDate(d)}
                                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-accent-steel cursor-pointer hover:border-red-500/40 hover:text-red-400 transition-colors"
                                title="Cliquer pour retirer"
                            >
                                {d}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* iCal */}
            <div className="glass rounded-xl border border-white/5 p-5 space-y-3">
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-accent" />Lien iCal / Google Calendar
                </h2>
                <input
                    type="url"
                    value={cfg.calendar_url}
                    onChange={e => setCfg(c => ({ ...c, calendar_url: e.target.value }))}
                    placeholder="https://calendar.google.com/calendar/ical/..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-accent/50"
                />
                {cfg.calendar_url && (
                    <p className="text-[10px] text-accent-steel">
                        Connecté · Synchronisation automatique (cache 15 min)
                    </p>
                )}
            </div>

            {/* Aperçu créneaux */}
            <div className="glass rounded-xl border border-white/5 p-5 space-y-3">
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-accent" />Aperçu des créneaux disponibles
                </h2>
                <div className="flex gap-2 items-center">
                    <input
                        type="date"
                        value={previewDate}
                        onChange={e => setPreviewDate(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50"
                    />
                    <button
                        onClick={testSync}
                        disabled={syncStatus === 'loading'}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} />
                        Tester
                    </button>
                </div>
                {syncStatus && syncStatus !== 'loading' && (
                    <div>
                        {syncStatus.error ? (
                            <p className="text-xs text-red-400">Erreur lors de la récupération des créneaux.</p>
                        ) : syncStatus.slots.length === 0 ? (
                            <p className="text-xs text-accent-steel">Aucun créneau disponible ce jour (congé, weekend ou tout occupé).</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {syncStatus.slots.map(s => (
                                    <span key={s} className="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-xs text-accent font-medium">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Save */}
            <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
                {saved ? <CheckCircle className="w-4 h-4" /> : saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? 'Sauvegardé !' : 'Sauvegarder'}
            </button>
        </div>
    );
};

export default CalendarSettings;
