# Spec — Chat IA Multi-Canal + Calendrier Blocks

**Date :** 2026-05-01  
**Branche :** claude  
**Statut :** approuvé

---

## Contexte et objectif

Étendre le chat IA d'AEVUM pour répondre automatiquement sur WhatsApp (Twilio), SMS (Twilio) et Email entrant (IMAP). L'IA qualifie les prospects en free-form, propose des créneaux RDV réels depuis le calendrier, et se présente comme assistant virtuel (obligation RGPD).

En parallèle, corriger le bug existant : `chat_public.py` n'utilise pas `CalendarConfig` pour proposer des créneaux. Et ajouter la gestion des indisponibilités ponctuelles (CalendarBlock).

---

## Audit état actuel

| Point | État | Action |
|-------|------|--------|
| `chat_public.py` utilise calendar slots | ❌ Non | Créer route publique `/chat/slots/{license_key}` |
| `GET /api/calendar/slots` accessible sans JWT | ❌ Non | Nouvelle route publique |
| IMAP / réception email | ❌ Non | `email_inbox.py` à créer |
| CalendarBlock | ❌ Non | Modèle + routes à créer |
| Fernet (`cryptography`) dans deps | ❌ Non | Ajouter `cryptography` à requirements.txt |

---

## Décisions de design

| Question | Décision |
|----------|----------|
| Calendrier omnicanal | Option A — chaque `ChannelAccount` porte un `user_id`; l'IA utilise le CalendarConfig de cet agent |
| Credentials Twilio/IMAP | Option A — chiffrement Fernet (`cryptography`) dès le MVP |
| Qualification IA | Option B — extraction free-form (budget/apport/délai dans un seul appel DeepSeek) |
| Architecture | Option B — `omnichannel_ai.py` central + `channels.py` router + adaptateurs par canal |

---

## Modèles de données

### CalendarBlock

```python
class CalendarBlock(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")  # NULL = toute l'agence
    block_type: str  # "vacation" | "appointment" | "personal"
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

Filtrage dans `GET /api/calendar/slots` : exclure les créneaux couverts par un CalendarBlock où `user_id == current_user.id OR (user_id IS NULL AND agency_id == current_user.agency_id)`.

### ChannelAccount

```python
class ChannelAccount(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: int = Field(foreign_key="user.id")      # agent propriétaire
    channel_type: str  # "whatsapp" | "sms" | "email"
    credentials_encrypted: str                        # JSON chiffré Fernet
    phone_number: Optional[str] = None
    email_address: Optional[str] = None
    is_active: bool = Field(default=True)
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

Clé Fernet stockée dans variable d'environnement `FERNET_KEY`. Générée au démarrage si absente (et loguée).

### ChannelConversation

```python
class ChannelConversation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    channel_account_id: int = Field(foreign_key="channelaccount.id")
    external_id: str = Field(index=True)             # phone ou email expéditeur (clé de dédup)
    sender_identity: str                             # même valeur, lisible
    lead_id: Optional[int] = Field(default=None, foreign_key="lead.id")
    messages: List[dict] = Field(default=[], sa_column=Column(JSON))
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active")            # "active" | "lead_created" | "closed"
    agent_takeover: bool = Field(default=False)      # True = IA désactivée, agent répond manuellement
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

`messages` : tableau JSON de `{role: "user"|"assistant", content: str, ts: ISO8601}`.

---

## Backend

### Correction chat_public.py

Nouvelle route sans JWT :
```
GET /chat/slots/{license_key}?date=YYYY-MM-DD
```
- Récupère le premier User admin actif de l'agence
- Appelle `get_available_slots()` avec son `CalendarConfig`
- Filtre les CalendarBlock actifs (user_id == admin.id OR user_id IS NULL)
- Retourne `{date, slots: ["09:00", "09:30", ...]}`

Le bot widget propose ces créneaux dans sa réponse quand la qualification est complète.

### omnichannel_ai.py

Service central partagé par tous les canaux entrants.

```python
async def qualify_and_respond(
    message_text: str,
    sender_identity: str,
    channel: str,
    channel_account: ChannelAccount,
    conversation: ChannelConversation,
    session: Session,
) -> str
```

**Flux :**
1. Si `len(conversation.messages) == 0` → prepend greeting RGPD :  
   `"Bonjour, je suis l'assistant virtuel de [Agence]. Je vais vous poser quelques questions pour mieux vous orienter."`
2. Appel DeepSeek (free-form) — prompt extrait `budget`, `apport`, `délai`, produit `score_chaleur` (1–10) et `reply`
3. Si `score_chaleur >= 7` ET `budget + apport + délai` tous renseignés :
   - Récupère `CalendarConfig` du `channel_account.user_id`
   - Filtre CalendarBlocks actifs
   - Propose les 3 prochains créneaux disponibles (sur 7 jours glissants)
   - Crée ou met à jour le `Lead` en DB
   - Passe `conversation.status = "lead_created"`
4. Append `{role: "user", content: message_text, ts: now}` et `{role: "assistant", content: reply, ts: now}` dans `conversation.messages`
5. Met à jour `conversation.last_message_at`
6. Retourne `reply`

### channels.py — router `/channels`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/channels/whatsapp/webhook` | Twilio signature | Reçoit message entrant, appelle omnichannel_ai, répond |
| POST | `/channels/sms/webhook` | Twilio signature | Idem SMS |
| GET | `/channels/conversations` | JWT | Liste paginée (filtres: canal, statut) |
| GET | `/channels/conversations/{id}` | JWT | Détail + messages |
| POST | `/channels/accounts` | JWT | Créer ChannelAccount (credentials → Fernet) |
| GET | `/channels/accounts` | JWT | Liste par agence |
| DELETE | `/channels/accounts/{id}` | JWT | Désactiver |
| POST | `/channels/accounts/{id}/test` | JWT | Tester la connexion (ping Twilio ou IMAP LOGIN) |
| PATCH | `/channels/conversations/{id}` | JWT | Mettre à jour statut / activer agent_takeover |

### Adaptateurs canaux

- **whatsapp_service.py** : `send_whatsapp(to: str, text: str, account: ChannelAccount)` — déchiffre credentials, instancie `twilio.rest.Client`, envoie via WhatsApp sandbox/prod
- **sms_service.py** : `send_sms(to: str, text: str, account: ChannelAccount)` — idem sans préfixe `whatsapp:`
- **email_inbox.py** :
  - `fetch_new_emails(account: ChannelAccount) -> List[dict]` — IMAP UNSEEN, marque lu après traitement
  - `send_reply(account: ChannelAccount, to: str, subject: str, body: str)` — SMTP avec les credentials du compte

### CalendarBlock routes (calendar_config.py)

```
POST   /calendar/blocks        → créer (agency_id depuis JWT, user_id optionnel)
GET    /calendar/blocks        → liste (agency_id + optionnel user_id)
DELETE /calendar/blocks/{id}   → supprimer (vérifie agency_id ownership)
```

### Modification GET /calendar/slots

Ajouter filtrage CalendarBlock : après génération des créneaux, exclure ceux couverts par un CalendarBlock actif pour `current_user.id` ou `agency_id` (user_id IS NULL).

### IMAP polling — scheduler.py

Nouveau job APScheduler toutes les 5 minutes :
```python
scheduler.add_job(poll_email_inboxes, "interval", minutes=5)
```
`poll_email_inboxes()` : itère les `ChannelAccount(channel_type="email", is_active=True)`, appelle `fetch_new_emails()`, passe chaque email dans `omnichannel_ai.qualify_and_respond()`.

### Migration Alembic

Une migration `add_calendar_blocks_channel_accounts_conversations` créant les 3 tables dans l'ordre :
1. `calendarblock`
2. `channelaccount`
3. `channelconversation`

### Dépendances à ajouter (requirements.txt)

- `cryptography` — Fernet
- `twilio` — WhatsApp + SMS

---

## Frontend

### Sidebar.jsx

Deux nouvelles entrées :
- **Conversations** (icône `MessageSquare`) → `/conversations`
- **Canaux** (icône `Plug`) → `/settings/canaux`

### Conversations.jsx (`/conversations`)

Layout deux colonnes :
- **Gauche** : liste conversations triées par `last_message_at` desc
  - Badge canal : WhatsApp (vert), SMS (bleu), Email (gris)
  - Aperçu dernier message + horodatage relatif
  - Badge statut : `actif` / `lead créé` / `fermé`
  - Filtres : canal, statut
- **Droite** : détail conversation sélectionnée
  - Bulles de messages (user / assistant), horodatage
  - Encart lead si `lead_id` : nom, budget, score_chaleur, lien fiche Lead
  - Bouton "Reprendre la main" → `PATCH /channels/conversations/{id}` avec `{agent_takeover: true}` → l'IA ne répond plus, textarea agent activé

### ChannelSettings.jsx (`/settings/canaux`)

- Liste `ChannelAccount` actifs : type, identifiant, agent, dernière sync, nb conversations
- Modal "Connecter WhatsApp" : Account SID, Auth Token, numéro (`whatsapp:+336...`)
- Modal "Connecter Email" : IMAP host/port/user/pass + SMTP host/port/user/pass
- Bouton "Tester connexion" (appelle `POST /channels/accounts/{id}/test`)
- Bouton supprimer (désactive, ne supprime pas en dur)

### CalendarSettings.jsx — section Indisponibilités

Ajout en bas de la page existante :
- Liste `CalendarBlock` (type, dates, raison)
- Bouton "Ajouter" → modal : date début, date fin, type (`vacation`/`appointment`/`personal`), raison libre
- Suppression avec confirmation

---

## Variables d'environnement à documenter

```
FERNET_KEY=<base64 32 bytes>          # généré si absent
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
IMAP_HOST=...   IMAP_PORT=993   IMAP_USER=...   IMAP_PASS=...
```

(Les credentials par ChannelAccount sont stockés chiffrés en DB — les vars globales Twilio/IMAP ne sont pas utilisées directement, les credentials sont par compte.)

---

## Hors-scope MVP

- Sites immobiliers (PAP/LBC/SeLoger/Bien'ici) — Phase 2 après APIs officielles
- Queue d'événements Redis / retry avancé
- Tests Twilio en prod (sandbox suffisant pour MVP)
