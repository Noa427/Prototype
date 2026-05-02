import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wifi, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const CHANNEL_LABEL = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };
const CHANNEL_COLOR = {
  whatsapp: 'text-emerald-400',
  sms: 'text-blue-400',
  email: 'text-slate-300',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-accent-steel">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-accent-steel uppercase tracking-wider">{label}</label>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent/50"
        {...props}
      />
    </div>
  );
}

export default function ChannelSettings() {
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(null); // 'whatsapp' | 'sms' | 'email' | null
  const [form, setForm] = useState({});
  const [testResult, setTestResult] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    const { data } = await api.get('/api/channels/accounts');
    setAccounts(data);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openModal = (type) => {
    setForm({});
    setModal(type);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload = { channel_type: modal, user_id: form.user_id || 1 };
      if (modal === 'whatsapp' || modal === 'sms') {
        payload.phone_number = form.phone_number;
        payload.credentials = { account_sid: form.account_sid, auth_token: form.auth_token };
      } else {
        payload.email_address = form.email_address;
        payload.credentials = {
          imap_host: form.imap_host, imap_port: form.imap_port || '993',
          imap_user: form.imap_user, imap_pass: form.imap_pass,
          smtp_host: form.smtp_host, smtp_port: form.smtp_port || '587',
          smtp_user: form.smtp_user, smtp_pass: form.smtp_pass,
        };
      }
      await api.post('/api/channels/accounts', payload);
      setModal(null);
      fetchAccounts();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Désactiver ce canal ?')) return;
    await api.delete(`/api/channels/accounts/${id}`);
    fetchAccounts();
  };

  const handleTest = async (id) => {
    setTestResult(r => ({ ...r, [id]: 'testing' }));
    const { data } = await api.post(`/api/channels/accounts/${id}/test`);
    setTestResult(r => ({ ...r, [id]: data.status }));
  };

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Canaux connectés</h1>
        <div className="flex gap-2">
          <button onClick={() => openModal('whatsapp')}
            className="text-xs px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />WhatsApp
          </button>
          <button onClick={() => openModal('sms')}
            className="text-xs px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />SMS
          </button>
          <button onClick={() => openModal('email')}
            className="text-xs px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Email
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="glass border border-white/10 rounded-xl p-12 text-center text-accent-steel text-sm">
          Aucun canal connecté — ajoutez WhatsApp, SMS ou Email pour démarrer.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(a => (
            <div key={a.id} className="glass border border-white/10 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className={`font-bold text-sm ${CHANNEL_COLOR[a.channel_type]}`}>
                  {CHANNEL_LABEL[a.channel_type]}
                </span>
                <div>
                  <p className="text-sm text-white font-medium">
                    {a.phone_number || a.email_address || '—'}
                  </p>
                  {a.last_sync && (
                    <p className="text-[11px] text-accent-steel">
                      Sync : {new Date(a.last_sync).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testResult[a.id] === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {testResult[a.id] === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                <button
                  onClick={() => handleTest(a.id)}
                  disabled={testResult[a.id] === 'testing'}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-accent-steel hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  <Wifi className="w-3 h-3" />
                  {testResult[a.id] === 'testing' ? 'Test...' : 'Tester'}
                </button>
                <button onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-accent-steel hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'whatsapp' || modal === 'sms' ? (
        <Modal title={`Connecter ${CHANNEL_LABEL[modal]}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Twilio Account SID" value={form.account_sid || ''} onChange={f('account_sid')} placeholder="ACxxxxxxxxxx" />
            <Field label="Twilio Auth Token" type="password" value={form.auth_token || ''} onChange={f('auth_token')} />
            <Field label="Numéro Twilio" value={form.phone_number || ''} onChange={f('phone_number')}
              placeholder={modal === 'whatsapp' ? '+14155238886' : '+33600000000'} />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:bg-accent/80 transition-colors mt-2">
            {saving ? 'Enregistrement...' : 'Connecter'}
          </button>
        </Modal>
      ) : null}

      {modal === 'email' && (
        <Modal title="Connecter Email (IMAP/SMTP)" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-[11px] text-accent-steel font-bold uppercase tracking-wider">Réception (IMAP)</p>
            <Field label="Hôte IMAP" value={form.imap_host || ''} onChange={f('imap_host')} placeholder="imap.gmail.com" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Port" value={form.imap_port || '993'} onChange={f('imap_port')} />
              <Field label="Email" value={form.imap_user || ''} onChange={f('imap_user')} placeholder="agent@agence.fr" />
            </div>
            <Field label="Mot de passe / App password" type="password" value={form.imap_pass || ''} onChange={f('imap_pass')} />
            <p className="text-[11px] text-accent-steel font-bold uppercase tracking-wider pt-2">Envoi (SMTP)</p>
            <Field label="Hôte SMTP" value={form.smtp_host || ''} onChange={f('smtp_host')} placeholder="smtp.gmail.com" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Port" value={form.smtp_port || '587'} onChange={f('smtp_port')} />
              <Field label="Login" value={form.smtp_user || ''} onChange={f('smtp_user')} />
            </div>
            <Field label="Mot de passe SMTP" type="password" value={form.smtp_pass || ''} onChange={f('smtp_pass')} />
            <Field label="Adresse email du compte" value={form.email_address || ''} onChange={f('email_address')} placeholder="agent@agence.fr" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:bg-accent/80 transition-colors mt-2">
            {saving ? 'Enregistrement...' : 'Connecter'}
          </button>
        </Modal>
      )}
    </div>
  );
}
