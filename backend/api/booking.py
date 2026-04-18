"""
Page de prise de RDV publique : /booking/{license_key}
HTML standalone sans auth JWT.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select
from datetime import date, timedelta

from ..database import engine
from ..models import Agency, CalendarConfig
from ..services.calendar_service import get_available_slots

router = APIRouter(tags=["booking"])


def _get_agency(license_key: str) -> Agency:
    with Session(engine) as s:
        agency = s.exec(select(Agency).where(Agency.license_key == license_key)).first()
    if not agency or agency.status != "active":
        raise HTTPException(status_code=403, detail="Licence invalide ou suspendue")
    return agency


def _get_cfg(agency_id: int) -> dict:
    with Session(engine) as s:
        cfg = s.exec(
            select(CalendarConfig).where(CalendarConfig.user_id == agency_id)
        ).first()
    if not cfg:
        return {"work_days": [1, 2, 3, 4, 5], "start_time": "09:00", "end_time": "18:00",
                "slot_duration": 30, "lunch_start": "12:00", "lunch_end": "13:00",
                "excluded_dates": [], "calendar_url": None}
    return {
        "work_days": [int(d) for d in cfg.work_days.split(",") if d],
        "start_time": cfg.start_time, "end_time": cfg.end_time,
        "slot_duration": cfg.slot_duration, "lunch_start": cfg.lunch_start,
        "lunch_end": cfg.lunch_end,
        "excluded_dates": [d for d in cfg.excluded_dates.split(",") if d],
        "calendar_url": cfg.calendar_url,
    }


@router.get("/booking/{license_key}", response_class=HTMLResponse)
async def public_booking_page(license_key: str):
    agency = _get_agency(license_key)
    cfg = _get_cfg(agency.id)

    # Générer les créneaux des 7 prochains jours
    today = date.today()
    days_slots = []
    for i in range(1, 8):
        d = today + timedelta(days=i)
        slots = get_available_slots(
            target_date=d, work_days=cfg["work_days"],
            start_time=cfg["start_time"], end_time=cfg["end_time"],
            slot_duration=cfg["slot_duration"], lunch_start=cfg["lunch_start"],
            lunch_end=cfg["lunch_end"], excluded_dates=cfg["excluded_dates"],
            calendar_url=cfg["calendar_url"],
        )
        if slots:
            days_slots.append({"date": d.isoformat(), "label": d.strftime("%a %d %b"), "slots": slots})

    slots_json = str(days_slots).replace("'", '"').replace("True", "true").replace("False", "false")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prendre un RDV — {agency.name}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}
  .card{{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;max-width:520px;width:100%}}
  h1{{font-size:22px;font-weight:800;margin-bottom:4px}}
  .sub{{color:#64748b;font-size:13px;margin-bottom:24px}}
  .step{{display:none}}.step.active{{display:block}}
  label{{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px;margin-top:14px}}
  input,select{{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:#fff;font-size:14px;outline:none}}
  input:focus,select:focus{{border-color:rgba(99,102,241,.5)}}
  .days{{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}}
  .day-btn{{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#94a3b8;cursor:pointer;font-size:13px;transition:.15s}}
  .day-btn.sel{{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.5);color:#a5b4fc}}
  .slots{{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}}
  .slot{{padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#94a3b8;cursor:pointer;font-size:13px;transition:.15s}}
  .slot.sel{{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.5);color:#a5b4fc}}
  .btn{{width:100%;margin-top:20px;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#6366f1,#3b82f6);color:#fff;font-size:15px;font-weight:700;cursor:pointer;transition:.15s}}
  .btn:hover{{opacity:.9}}.btn:disabled{{opacity:.5;cursor:not-allowed}}
  .success{{text-align:center;padding:20px 0}}
  .success h2{{font-size:20px;margin:12px 0 6px}}
  .success p{{color:#64748b;font-size:14px}}
  .check{{width:56px;height:56px;background:rgba(34,197,94,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:28px}}
  .err{{color:#f87171;font-size:12px;margin-top:8px}}
</style>
</head>
<body>
<div class="card">
  <h1>Prendre un RDV</h1>
  <p class="sub">{agency.name}</p>

  <!-- Step 1: choisir créneau -->
  <div class="step active" id="step1">
    <label>Choisissez un jour</label>
    <div class="days" id="days"></div>
    <label>Choisissez un créneau</label>
    <div class="slots" id="slots"></div>
    <button class="btn" id="btn1" disabled onclick="goStep2()">Continuer →</button>
  </div>

  <!-- Step 2: infos prospect -->
  <div class="step" id="step2">
    <label>Votre nom complet</label>
    <input id="name" placeholder="Marie Dupont" />
    <label>Votre email</label>
    <input id="email" type="email" placeholder="marie@email.com" />
    <label>Votre téléphone (optionnel)</label>
    <input id="phone" placeholder="06 00 00 00 00" />
    <p class="err" id="err"></p>
    <button class="btn" id="btn2" onclick="submit()">Confirmer mon RDV</button>
  </div>

  <!-- Step 3: confirmation -->
  <div class="step" id="step3">
    <div class="success">
      <div class="check">✓</div>
      <h2>RDV confirmé !</h2>
      <p>Un email de confirmation vous a été envoyé.<br>L'équipe de {agency.name} vous contactera très vite.</p>
    </div>
  </div>
</div>

<script>
const DAYS = {slots_json};
const KEY = "{license_key}";
let selDate = null, selSlot = null;

const daysEl = document.getElementById('days');
const slotsEl = document.getElementById('slots');
const btn1 = document.getElementById('btn1');

DAYS.forEach(day => {{
  const b = document.createElement('button');
  b.className = 'day-btn'; b.textContent = day.label;
  b.onclick = () => {{
    document.querySelectorAll('.day-btn').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    selDate = day.date; selSlot = null; btn1.disabled = true;
    slotsEl.innerHTML = '';
    day.slots.forEach(s => {{
      const sb = document.createElement('button');
      sb.className = 'slot'; sb.textContent = s;
      sb.onclick = () => {{
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('sel'));
        sb.classList.add('sel'); selSlot = s; btn1.disabled = false;
      }};
      slotsEl.appendChild(sb);
    }});
  }};
  daysEl.appendChild(b);
}});

function goStep2() {{
  if (!selDate || !selSlot) return;
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
}}

async function submit() {{
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const err = document.getElementById('err');
  if (!name || !email) {{ err.textContent = 'Nom et email requis.'; return; }}
  document.getElementById('btn2').disabled = true;
  err.textContent = '';
  try {{
    const r = await fetch('/api/chat/book-slot', {{
      method: 'POST',
      headers: {{'Content-Type':'application/json'}},
      body: JSON.stringify({{
        name, email, phone, license_key: KEY,
        slot_datetime: selDate + ' ' + selSlot
      }})
    }});
    if (!r.ok) throw new Error();
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.add('active');
  }} catch {{
    err.textContent = 'Erreur réseau, veuillez réessayer.';
    document.getElementById('btn2').disabled = false;
  }}
}}
</script>
</body>
</html>"""
    return HTMLResponse(content=html)
