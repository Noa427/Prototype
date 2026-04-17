import React, { useState } from 'react';
import { Building2, MapPin, Calendar, Code2, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

const CITIES = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Lille', 'Nice', 'Rennes', 'Strasbourg'];

const STEPS = [
    { id: 1, label: 'Agence', icon: Building2 },
    { id: 2, label: 'Zones', icon: MapPin },
    { id: 3, label: 'Calendrier', icon: Calendar },
    { id: 4, label: 'Widget', icon: Code2 },
];

const Input = ({ label, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-accent-steel">{label}</label>
        <input
            {...props}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-accent/50"
        />
    </div>
);

const Onboarding = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    const [agencyName, setAgencyName] = useState('');
    const [agencyEmail, setAgencyEmail] = useState(user?.email || '');
    const [agencyCity, setAgencyCity] = useState('');
    const [zones, setZones] = useState([]);
    const [calendarUrl, setCalendarUrl] = useState('');

    const licenseKey = import.meta.env.VITE_LICENSE_KEY || 'demo-key';
    const widgetSnippet = `<script src="${window.location.origin}/chat-widget.js" data-key="${licenseKey}"></script>`;

    const toggleZone = (city) =>
        setZones(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);

    const finish = async () => {
        setSaving(true);
        try {
            await api.post('/api/onboarding/complete', {
                agency_name: agencyName,
                agency_location: agencyCity,
                zones,
                calendar_url: calendarUrl,
            });
            if (calendarUrl) {
                await api.put('/api/calendar/config', { calendar_url: calendarUrl });
            }
            localStorage.setItem(`onboarding_done_${user?.id}`, '1');
            navigate('/dashboard');
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Bienvenue sur AEVUM</h1>
                    <p className="text-accent-steel text-sm mt-1">Configurons votre espace en 4 étapes</p>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                step === s.id ? 'bg-accent text-white' :
                                step > s.id ? 'bg-green-500/10 text-green-400' :
                                'bg-white/5 text-accent-steel'
                            }`}>
                                {step > s.id ? <CheckCircle className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                                {s.label}
                            </div>
                            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/10" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Card */}
                <div className="glass rounded-2xl border border-white/10 p-8 space-y-6">
                    {/* Step 1 */}
                    {step === 1 && (
                        <>
                            <h2 className="font-bold text-white text-lg">Informations de l'agence</h2>
                            <Input label="Nom de l'agence" value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="Immo Pro Paris" />
                            <Input label="Email de contact" type="email" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} />
                            <Input label="Ville principale" value={agencyCity} onChange={e => setAgencyCity(e.target.value)} placeholder="Paris" />
                        </>
                    )}

                    {/* Step 2 */}
                    {step === 2 && (
                        <>
                            <h2 className="font-bold text-white text-lg">Zones de recherche</h2>
                            <p className="text-accent-steel text-sm">Sélectionnez les villes où vous opérez.</p>
                            <div className="flex flex-wrap gap-2">
                                {CITIES.map(city => (
                                    <button
                                        key={city}
                                        onClick={() => toggleZone(city)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                            zones.includes(city)
                                                ? 'bg-accent/20 border-accent text-accent'
                                                : 'bg-white/5 border-white/10 text-accent-steel hover:text-white'
                                        }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                            {zones.length > 0 && (
                                <p className="text-xs text-green-400">{zones.length} zone(s) sélectionnée(s)</p>
                            )}
                        </>
                    )}

                    {/* Step 3 */}
                    {step === 3 && (
                        <>
                            <h2 className="font-bold text-white text-lg">Intégration calendrier</h2>
                            <p className="text-accent-steel text-sm">
                                Connectez votre Google Calendar ou iCal pour que le chatbot puisse proposer des créneaux.
                            </p>
                            <Input
                                label="Lien iCal / Google Calendar"
                                value={calendarUrl}
                                onChange={e => setCalendarUrl(e.target.value)}
                                placeholder="https://calendar.google.com/calendar/ical/..."
                            />
                            <p className="text-xs text-accent-steel">
                                Optionnel — vous pouvez configurer vos horaires dans{' '}
                                <span className="text-accent">Paramètres → Calendrier</span>.
                            </p>
                        </>
                    )}

                    {/* Step 4 */}
                    {step === 4 && (
                        <>
                            <h2 className="font-bold text-white text-lg">Installez le widget chat</h2>
                            <p className="text-accent-steel text-sm">
                                Copiez ce snippet dans le <code className="text-accent">&lt;body&gt;</code> de votre site pour activer le chatbot.
                            </p>
                            <div className="bg-black/40 rounded-xl border border-white/10 p-4">
                                <pre className="text-xs text-green-400 whitespace-pre-wrap break-all">{widgetSnippet}</pre>
                            </div>
                            <button
                                onClick={() => navigator.clipboard?.writeText(widgetSnippet)}
                                className="text-xs text-accent hover:text-white transition-colors"
                            >
                                Copier dans le presse-papiers
                            </button>
                        </>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-2">
                        <button
                            onClick={() => setStep(s => s - 1)}
                            disabled={step === 1}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-accent-steel hover:text-white text-sm transition-colors disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4" /> Retour
                        </button>
                        {step < 4 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="flex items-center gap-1 px-5 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-bold transition-colors"
                            >
                                Suivant <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={finish}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Terminer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
