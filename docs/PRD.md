Perfect 👌 here’s a **Product Requirements Document (PRD)** in Markdown, written so you can drop it straight into **Lovable** or **v0** and start generating scaffolding from it.

---

# beta.rocks – Product Requirements Document (PRD)

## 🌍 Overview

**beta.rocks** is a free, chat-first web app that helps climbers check real-time conditions at crags, sectors, and even specific routes.
It combines **forecast data (Open-Meteo)**, **sun/shade (suncalc)**, **crag/sector/route data (OpenBeta)**, and **community reports**.
The app is **local-first** (works offline, stores data in local storage/IndexedDB) with optional sync across devices via a **sync key**.

---

## 🎯 Goals

- Provide a **chat interface** where users can ask about climbing conditions anywhere in any language.
- Allow users to post and confirm **community reports** about current conditions.
- Keep it **free, privacy-respecting, and anonymous** with optional display names.
- Work offline and sync data across devices.
- Be embeddable and shareable (links to crags/sectors/routes).

---

## 🧑‍💻 Users

- **Climbers**: check if a crag/sector/route is dry, sunny, windy, crowded, etc.
- **Community contributors**: post quick reports (text, sliders, photos).
- **Gyms/guides/blogs**: embed a simple conditions widget.

---

## 🗂️ Core Features

### 1. **Chat-first interface**

- User types: _“Siurana tomorrow?”_, _“El Pati shade this afternoon?”_, _“La Rambla dry?”_.
- Powered by **Gemini 2.5 Flash** via Vercel AI SDK.
- Intent classification:
  - `get_conditions` (crag/sector/route + date)
  - `add_report` (user report)
  - `confirm_report` (thumbs up)
  - `search_crag` / `nearby`
  - `help`

---

### 2. **Conditions logic**

- Use existing `computeConditions()` module (rule-based).
- Inputs: Open-Meteo hourly forecast (temp, humidity, wind, rain, sun hours).
- Factors: recent rain, sun/wind exposure, rock type, sector aspect (via suncalc).
- Output: score + label (**Great / OK / Meh / Nope**) + reasons/tips.

---

### 3. **Crags, sectors, routes**

- Base data: **OpenBeta API**.
- Hierarchy: Crag → Sector → Route.
- Allow “Add missing crag/sector/route” via community input.
- Store in local DB (IndexedDB), sync later.

---

### 4. **Community reports**

- Quick form:
  - Dryness (1–5)
  - Wind (1–5)
  - Crowds (1–5)
  - Optional text
  - Optional photo

- Reports can be attached to crag / sector / route.
- Reports are stored locally, synced via **sync key**, and visible to all users.

---

### 5. **Confirmations (thumbs up)**

- Any user can confirm an existing report.
- Confirms boost the report’s trust score.
- Schema: `reportId + userKeyHash`.
- Display: “👍 3 confirmed.”

---

### 6. **Identity**

- Each user has a **sync key** (random UUID/nanoid).
- Sync key allows multi-device sync (QR code or paste key).
- User can set an optional **display name**.
- Public: show displayName if set, else fallback to `Climber #abc`.
- Never expose raw sync keys.

---

### 7. **Sync**

- `/sync/:key` API endpoints:
  - `GET` → user’s data (crags, chats, reports).
  - `POST` → push merged data.

- Conflict resolution via `updatedAt`.
- Store in Cloudflare KV / Neon / Supabase.

---

### 8. **Sharing**

- Each crag/sector/route has a shareable URL:
  - `beta.rocks/siurana/el-pati/la-rambla`

- Page shows:
  - Current forecast summary.
  - Community reports.
  - “Last updated X minutes ago.”

---

### 9. **Freshness indicators**

- Show when forecast last updated.
- Show when each report was posted.

---

### 10. **Privacy & moderation**

- No accounts required.
- Sync key acts as identity, but never displayed.
- Simple profanity filter on reports.
- Rate limiting by key/IP.

---

## 🗄️ Data Models

### Crag

```ts
{
  id: string;       // OpenBeta ID or custom
  name: string;
  lat: number;
  lon: number;
  country: string;
  rockType?: string;
  aspects?: number[];
  sectors?: Sector[];
}
```

### Sector

```ts
{
  id: string;
  cragId: string;
  name: string;
  lat?: number;
  lon?: number;
  aspect?: number;
  routes?: Route[];
}
```

### Route

```ts
{
  id: string;
  sectorId: string;
  name: string;
  grade?: string;
}
```

### Report

```ts
{
  id: string;
  cragId: string;
  sectorId?: string;
  routeId?: string;
  text?: string;
  ratings?: { dry?: number; wind?: number; crowds?: number };
  photo?: string;
  authorName?: string;
  createdAt: number;
  updatedAt: number;
}
```

### Confirmation

```ts
{
  reportId: string;
  userKeyHash: string;
  createdAt: number;
}
```

### User Profile

```ts
{
  syncKey: string;
  displayName?: string;
  createdAt: number;
  updatedAt: number;
}
```

---

## 🔌 APIs

### `/chat`

- POST `{ message, lang, location?, state? }`
- Returns `{ reply, chips[], state }`
- Handles tool calling (get_conditions, add_report, confirm_report).

### `/reports`

- POST new report.
- GET reports by crag/sector/route.

### `/sync/:key`

- GET user data.
- POST merged user data.

### `/conditions`

- GET crag conditions (Open-Meteo + computeConditions).

---

## 📱 UI Requirements

### Chat

- Minimal UI: message list + input.
- Chips for quick actions.
- Display forecast summary + recent reports inline.

### Reports

- Inline form (sliders + text + photo).
- Confirm button on each report.

### Settings

- Show sync key + QR code.
- Input for display name.
- Button to reset data.

### Share page

- Public view with conditions + reports for a crag/sector/route.

---

## 🛠️ Tech stack

- **Frontend**: Next.js (Vercel), Vercel AI SDK, Tailwind, IndexedDB (local DB).
- **Backend**: Vercel Edge / Cloudflare Workers, Cloudflare KV or Neon DB.
- **AI model**: Gemini 2.5 Flash (via Vercel AI SDK).
- **Data sources**:
  - Crags/sectors/routes: OpenBeta API.
  - Weather: Open-Meteo.
  - Sun position: suncalc.

---

## 🚀 MVP Scope

- Chat-first interface.
- Crag-level conditions.
- Add & view reports.
- Confirm reports.
- Sync key (local + QR).
- Shareable links.
