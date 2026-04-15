import React, { useState, useEffect, useRef } from 'react';
import { Zap, Copy, Check, Send, Bot, User, FileText, Download } from 'lucide-react';
import api from '../services/api';
import { getDeals } from '../services/dealService';

// ── Multipostage ─────────────────────────────────────────────────────────────
const MultipostagePanel = () => {
    const [deals, setDeals] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [formats, setFormats] = useState(null);
    const [copied, setCopied] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { getDeals().then(setDeals); }, []);

    const generate = async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const { data } = await api.post(`/api/documents/deals/${selectedId}/listing`);
            setFormats(data.formats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const copy = (key, text) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <div className="glass p-6 rounded-xl space-y-4">
            <h2 className="font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Multipostage — Générer une annonce
            </h2>
            <div className="flex gap-3">
                <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                >
                    <option value="">Sélectionner un bien…</option>
                    {deals.map(d => (
                        <option key={d.id} value={d.id}>
                            #{d.id} — {d.location} — {d.price}
                        </option>
                    ))}
                </select>
                <button
                    onClick={generate}
                    disabled={!selectedId || loading}
                    className="px-4 py-2 bg-accent rounded-lg text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-40 transition-all"
                >
                    {loading ? 'Génération…' : 'Générer'}
                </button>
            </div>

            {formats && Object.entries(formats).map(([key, text]) => (
                <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-accent">
                            {key === 'generic' ? 'Générique' : key === 'leboncoin' ? 'LeBonCoin' : 'PAP'}
                        </span>
                        <button
                            onClick={() => copy(key, text)}
                            className="flex items-center gap-1 text-xs text-accent-steel hover:text-white transition-colors"
                        >
                            {copied === key ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            {copied === key ? 'Copié !' : 'Copier'}
                        </button>
                    </div>
                    <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
                </div>
            ))}
        </div>
    );
};

// ── Chatbot qualification ────────────────────────────────────────────────────
const ChatbotPanel = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Bonjour ! Je suis votre assistant AEVUM. Je vais vous aider à constituer votre dossier de recherche immobilière. Pour commencer, pouvez-vous me donner votre nom complet ?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [leadCreated, setLeadCreated] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        if (!input.trim() || loading) return;
        const userMsg = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const { data } = await api.post('/api/chat/qualify', {
                messages: newMessages,
            });
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            if (data.lead_created) {
                setLeadCreated(true);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass p-6 rounded-xl flex flex-col h-[500px]">
            <h2 className="font-bold flex items-center gap-2 mb-4 shrink-0">
                <Bot className="w-5 h-5 text-accent" />
                Qualification Lead — Assistant IA
                {leadCreated && (
                    <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded">
                        Lead créé ✓
                    </span>
                )}
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="w-4 h-4 text-accent" />
                            </div>
                        )}
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                            m.role === 'user'
                                ? 'bg-accent text-white'
                                : 'bg-white/5 border border-white/10 text-white/90'
                        }`}>
                            {m.content}
                        </div>
                        {m.role === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                                <User className="w-4 h-4 text-white/70" />
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-accent" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 mt-4 shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    disabled={loading || leadCreated}
                    placeholder={leadCreated ? 'Dossier complété ✓' : 'Votre réponse…'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 disabled:opacity-50"
                />
                <button
                    onClick={send}
                    disabled={!input.trim() || loading || leadCreated}
                    className="px-3 py-2 bg-accent rounded-lg text-white hover:bg-accent/90 disabled:opacity-40 transition-all"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ── Page principale ──────────────────────────────────────────────────────────
const Automation = () => (
    <div className="p-6 space-y-6">
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Automatisation</h1>
            <p className="text-xs text-accent-steel uppercase tracking-widest mt-1">Multipostage & Qualification IA</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MultipostagePanel />
            <ChatbotPanel />
        </div>
    </div>
);

export default Automation;
