(function () {
  'use strict';

  const script = document.currentScript;
  const LICENSE_KEY = script ? script.getAttribute('data-key') : null;
  const BASE_URL = script ? script.src.replace('/chat-widget.js', '') : '';

  if (!LICENSE_KEY) { console.warn('[AEVUM Widget] data-key manquant'); return; }

  // ── State ────────────────────────────────────────────────────────────────
  let open = false;
  let step = 0; // 0=welcome 1=budget 2=apport 3=delai 4=booking 5=done
  let answers = {};
  let agencyName = 'AEVUM';
  let botName = 'Agent AEVUM';
  let messages = [];

  // ── Fetch config ─────────────────────────────────────────────────────────
  fetch(`${BASE_URL}/api/chat/widget-config/${LICENSE_KEY}`)
    .then(r => r.ok ? r.json() : {})
    .then(cfg => {
      if (cfg.agency_name) agencyName = cfg.agency_name;
      if (cfg.bot_name) botName = cfg.bot_name;
    })
    .catch(() => {});

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #aevum-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(124,58,237,.5);display:flex;align-items:center;justify-content:center;z-index:99999;transition:transform .2s}
    #aevum-btn:hover{transform:scale(1.08)}
    #aevum-btn svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    #aevum-chat{position:fixed;bottom:90px;right:24px;width:340px;max-height:520px;background:#0f1117;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;z-index:99999;overflow:hidden;font-family:system-ui,sans-serif}
    #aevum-chat-header{padding:14px 16px;background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;gap:10px}
    #aevum-chat-header span{color:#fff;font-weight:700;font-size:14px}
    #aevum-chat-header small{color:rgba(255,255,255,.7);font-size:11px;margin-left:auto}
    #aevum-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px}
    .aevum-msg{max-width:85%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.5}
    .aevum-msg.bot{align-self:flex-start;background:rgba(255,255,255,.07);color:#e2e8f0}
    .aevum-msg.user{align-self:flex-end;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff}
    #aevum-input-row{padding:10px 12px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:8px}
    #aevum-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;color:#fff;font-size:13px;outline:none}
    #aevum-send{background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;font-weight:600}
    #aevum-send:hover{opacity:.9}
  `;
  document.head.appendChild(style);

  // ── DOM ──────────────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'aevum-btn';
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
  document.body.appendChild(btn);

  const chat = document.createElement('div');
  chat.id = 'aevum-chat';
  chat.style.display = 'none';
  chat.innerHTML = `
    <div id="aevum-chat-header">
      <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      <span id="aevum-bot-name">${botName}</span>
      <small id="aevum-agency-name">${agencyName}</small>
    </div>
    <div id="aevum-msgs"></div>
    <div id="aevum-input-row">
      <input id="aevum-input" placeholder="Votre message…" autocomplete="off"/>
      <button id="aevum-send">→</button>
    </div>
  `;
  document.body.appendChild(chat);

  // ── Logic ────────────────────────────────────────────────────────────────
  const QUESTIONS = [
    { key: 'welcome', bot: `Bonjour ! Je suis l'assistant de ${agencyName}. Je peux vous aider à trouver un bien et réserver un rendez-vous. Quel est votre budget d'achat ?` },
    { key: 'budget', bot: 'Quel est votre apport personnel disponible ?' },
    { key: 'apport', bot: 'Dans quel délai souhaitez-vous acheter ? (ex: 1 mois, 3 mois, 6 mois)' },
    { key: 'delai', bot: 'Merci ! Je transmets votre demande à un agent. Souhaitez-vous réserver un créneau maintenant ? Tapez votre nom et email (ex: Marie Dupont, marie@email.com)' },
  ];

  function addMsg(text, from) {
    const msgsEl = document.getElementById('aevum-msgs');
    const div = document.createElement('div');
    div.className = `aevum-msg ${from}`;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function sendToBackend(userMsg) {
    const fields = { budget: answers.budget, apport: answers.apport, delai: answers.delai };
    fetch(`${BASE_URL}/api/chat/widget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, license_key: LICENSE_KEY, context: fields })
    })
      .then(r => r.json())
      .then(data => { if (data.reply) addMsg(data.reply, 'bot'); })
      .catch(() => addMsg('Je reviens vers vous très vite !', 'bot'));
  }

  function handleSend() {
    const input = document.getElementById('aevum-input');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    addMsg(val, 'user');

    if (step === 0) { answers.budget = val; step = 1; addMsg(QUESTIONS[1].bot, 'bot'); return; }
    if (step === 1) { answers.apport = val; step = 2; addMsg(QUESTIONS[2].bot, 'bot'); return; }
    if (step === 2) { answers.delai = val; step = 3; addMsg(QUESTIONS[3].bot, 'bot'); return; }
    if (step === 3) {
      // Tenter booking : "Nom Prénom, email"
      const parts = val.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const email = parts[1].trim();
        fetch(`${BASE_URL}/api/chat/book-slot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone: '', license_key: LICENSE_KEY, budget: answers.budget, apport: answers.apport, delai: answers.delai })
        })
          .then(r => r.json())
          .then(() => addMsg('Super ! Un agent va vous contacter très vite pour confirmer votre rendez-vous. À bientôt !', 'bot'))
          .catch(() => addMsg('Demande enregistrée. Un agent vous contactera bientôt.', 'bot'));
        step = 4;
      } else {
        sendToBackend(val);
      }
      return;
    }
    sendToBackend(val);
  }

  btn.addEventListener('click', () => {
    open = !open;
    chat.style.display = open ? 'flex' : 'none';
    chat.style.flexDirection = open ? 'column' : '';
    if (open && step === 0 && document.getElementById('aevum-msgs').children.length === 0) {
      addMsg(QUESTIONS[0].bot, 'bot');
    }
  });

  document.getElementById('aevum-send').addEventListener('click', handleSend);
  document.getElementById('aevum-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
})();
