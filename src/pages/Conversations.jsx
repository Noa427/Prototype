import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Mail, RefreshCw, UserCheck } from 'lucide-react';
import api from '../services/api';

const CHANNEL_BADGE = {
  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  sms: { label: 'SMS', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  email: { label: 'Email', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  unknown: { label: '?', cls: 'bg-white/10 text-white/50 border-white/20' },
};

const STATUS_BADGE = {
  active: 'bg-yellow-500/20 text-yellow-400',
  lead_created: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-white/10 text-white/40',
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

export default function Conversations() {
  const [convs, setConvs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchConvs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterChannel) params.channel = filterChannel;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/api/channels/conversations', { params });
      setConvs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    const { data } = await api.get(`/api/channels/conversations/${id}`);
    setDetail(data);
  };

  useEffect(() => { fetchConvs(); }, [filterChannel, filterStatus]);

  const handleSelect = (c) => {
    setSelected(c.id);
    fetchDetail(c.id);
  };

  const handleTakeover = async (convId, value) => {
    await api.patch(`/api/channels/conversations/${convId}`, { agent_takeover: value });
    fetchDetail(convId);
    fetchConvs();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Liste ── */}
      <div className="w-80 flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-white text-sm">Conversations</h1>
            <button onClick={fetchConvs} className="p-1.5 rounded hover:bg-white/10 text-accent-steel hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
            >
              <option value="">Tous canaux</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none"
            >
              <option value="">Tous statuts</option>
              <option value="active">Actif</option>
              <option value="lead_created">Lead créé</option>
              <option value="closed">Fermé</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-4 text-center text-accent-steel text-xs">Chargement...</div>}
          {!loading && convs.length === 0 && (
            <div className="p-8 text-center text-accent-steel text-xs">Aucune conversation</div>
          )}
          {convs.map(c => {
            const badge = CHANNEL_BADGE[c.channel] || CHANNEL_BADGE.unknown;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${selected === c.id ? 'bg-white/8' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                  <span className="text-[10px] text-accent-steel">{timeAgo(c.last_message_at)}</span>
                </div>
                <p className="text-xs font-medium text-white truncate">{c.sender_identity}</p>
                <p className="text-[11px] text-accent-steel truncate mt-0.5">{c.last_message}</p>
                <div className="flex gap-1 mt-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] || ''}`}>
                    {c.status === 'active' ? 'Actif' : c.status === 'lead_created' ? 'Lead créé' : 'Fermé'}
                  </span>
                  {c.agent_takeover && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">Agent</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Détail ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!detail ? (
          <div className="flex-1 flex items-center justify-center text-accent-steel text-sm">
            <MessageSquare className="w-8 h-8 mr-3 opacity-30" />
            Sélectionnez une conversation
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{detail.sender_identity}</p>
                <p className="text-[11px] text-accent-steel capitalize">{detail.channel} · {detail.status}</p>
              </div>
              <div className="flex gap-2">
                {detail.lead_id && (
                  <a href={`/leads`} className="text-xs px-3 py-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors">
                    Voir le lead #{detail.lead_id}
                  </a>
                )}
                {detail.agent_takeover ? (
                  <button
                    onClick={() => handleTakeover(detail.id, false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    Rendre à l'IA
                  </button>
                ) : (
                  <button
                    onClick={() => handleTakeover(detail.id, true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />Reprendre la main
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(detail.messages || []).map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-accent/20 text-white rounded-br-md'
                      : 'bg-white/8 text-white/90 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.ts && (
                      <p className="text-[10px] mt-1 opacity-40 text-right">
                        {new Date(m.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
