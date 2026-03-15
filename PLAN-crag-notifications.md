# Plan: Crag Report Notifications

## Context

Users favorite crags today (via `user_favorites` table + localStorage). When someone posts a new report on a crag they've favorited, there's no way to know unless they manually check. We want to notify subscribed users when new reports are posted for their crags.

**Constraints:**
- No email/password auth — users are anonymous with sync keys
- React Native mobile apps coming soon
- Supabase is the backend

---

## Recommended Approach: Push Notifications (Web Push + Expo Push)

**Why not email?** No emails on file — would require adding email collection, which conflicts with the privacy-first/anonymous model.

**Why not just in-app (Supabase Realtime)?** Only works when the app is open. Users won't have beta.rocks open 24/7.

**Why push?** Push tokens are device-scoped, not account-scoped. They work perfectly with anonymous users. No email needed. Works when the app is closed.

---

## Architecture Overview

```
New report INSERT into `reports` table
  → Supabase Database Webhook (pg_net)
  → Supabase Edge Function (fan-out)
  → Looks up users who favorited that crag (user_favorites)
  → Fetches their push tokens (push_subscriptions table)
  → Sends via:
      - Web Push API (VAPID) for browsers
      - Expo Push API for React Native apps
```

---

## Components

### 1. Database: `push_subscriptions` table

```sql
CREATE TABLE push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  token jsonb NOT NULL,          -- Web: full PushSubscription JSON; Mobile: { expoPushToken: "..." }
  device_name text,              -- Optional, for settings UI ("Chrome on MacBook")
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prevent duplicate subscriptions
CREATE UNIQUE INDEX idx_push_sub_unique ON push_subscriptions (user_profile_id, platform, md5(token::text));

-- RLS: users can only manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
```

### 2. Database: `notifications` table (optional, for in-app history)

```sql
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_report', 'conditions_alert')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,                    -- { cragId, cragSlug, reportId, ... }
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- For Supabase Realtime (in-app badge)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 3. Database Webhook → Edge Function

**Trigger:** `INSERT` on `reports` table.

**Edge Function (`supabase/functions/notify-report/index.ts`):**
1. Receives the new report payload (crag_id, category, text)
2. Queries `user_favorites` to find users who favorited that crag
3. Excludes the report author (don't notify yourself)
4. Queries `push_subscriptions` for those users
5. Batches and sends:
   - **Web Push:** Uses `web-push` library with VAPID keys
   - **Expo Push:** POST to `https://exp.host/--/api/v2/push/send`
6. Optionally inserts into `notifications` table for in-app history

### 4. Web Push (Browser — current web app)

**Client-side setup:**
- Register a service worker (`public/sw.js`) that handles `push` events
- On user opt-in, call `pushManager.subscribe()` with VAPID public key
- Store the resulting `PushSubscription` in `push_subscriptions` table
- Handle subscription refresh (tokens can expire)

**Service worker (`public/sw.js`):**
- Listens for `push` events → shows native OS notification
- Handles `notificationclick` → opens the crag page (`/location/{slug}`)

**UI flow:**
- Bell icon in header or in favorites section
- First click → browser permission prompt
- Settings dialog shows notification preferences per crag (or global toggle)

**Browser support:**
- Chrome, Firefox, Edge: Full support
- Safari macOS (Ventura+): Supported
- Safari iOS (16.4+): Only for PWAs added to home screen

### 5. Expo Push (React Native — future mobile apps)

**Client-side setup:**
- `expo-notifications` package
- On app launch, request permission + get `ExpoPushToken`
- Store token in `push_subscriptions` table
- Listen for token refresh events

**Server-side:**
- Edge Function sends to Expo Push API with the stored tokens
- Expo handles FCM (Android) and APNs (iOS) under the hood

### 6. In-App Notifications (Supabase Realtime — immediate)

**When app is open:**
- Subscribe to `notifications` table filtered by `user_profile_id`
- Show a badge/dot on a bell icon in the header
- Notification dropdown/sheet showing recent notifications
- Mark as read on click

**This is the lowest-effort starting point** — no push infrastructure needed.

---

## Notification Settings UX

Add to SettingsDialog or a dedicated NotificationSettings component:

- **Global toggle:** Enable/disable all notifications
- **Per-crag toggle:** In the favorites list, each crag gets a bell icon (on by default)
- **Category filter:** Only notify for certain report categories (conditions, safety, access, etc.)

Store preferences in a `notification_preferences` table or as a JSONB column on `user_profiles`.

---

## Implementation Phases

### Phase 1: In-App Notifications (Supabase Realtime)
- Create `notifications` table
- Add database trigger: on report INSERT → insert notification for subscribed users
- Add bell icon + notification dropdown in header
- Subscribe via Supabase Realtime for live updates
- **Effort:** ~2-3 days

### Phase 2: Web Push Notifications
- Generate VAPID keys, store as env vars
- Create service worker (`public/sw.js`)
- Add push subscription flow in UI
- Create `push_subscriptions` table
- Create Supabase Edge Function for fan-out
- Set up Database Webhook on `reports` table
- **Effort:** ~3-4 days

### Phase 3: Expo Push (when React Native ships)
- Add `expo-notifications` to mobile app
- Store Expo push tokens in same `push_subscriptions` table
- Extend Edge Function to send via Expo Push API
- **Effort:** ~1-2 days (Edge Function already exists from Phase 2)

### Phase 4: Notification Preferences
- Per-crag and per-category notification settings
- Quiet hours / do-not-disturb
- Notification history page
- **Effort:** ~2 days

---

## Key Decisions to Make

1. **Notification granularity:** Notify on every report, or batch/digest? (Recommend: immediate for safety/conditions, batched for others)
2. **Auto-subscribe favorites?** Should favoriting a crag auto-enable notifications? (Recommend: yes, with easy opt-out per crag)
3. **PWA:** Should we make the web app a PWA to get push on iOS Safari? (Recommend: yes, it's minimal effort with Next.js and unlocks iOS web push)
4. **Third-party service (OneSignal)?** Simplifies multi-platform push but adds a dependency. (Recommend: skip for now, VAPID + Expo is straightforward enough)
5. **Future: conditions alerts?** "Notify me when friction score is 4+ at my crag" — a natural extension. Would need a scheduled Edge Function checking conditions.

---

## Environment Variables Needed

```
VAPID_PUBLIC_KEY=          # Web Push VAPID public key
VAPID_PRIVATE_KEY=         # Web Push VAPID private key
VAPID_SUBJECT=mailto:...   # Contact email for VAPID (required by spec)
EXPO_ACCESS_TOKEN=         # Expo push token (for React Native, Phase 3)
```

---

## Summary

| Channel | Works Offline? | Needs Account? | Platform | Phase |
|---------|---------------|----------------|----------|-------|
| In-app (Realtime) | No | No | Web + Mobile | 1 |
| Web Push (VAPID) | Yes* | No | Browsers | 2 |
| Expo Push | Yes | No | iOS + Android | 3 |

\* Browser must be running (not necessarily the tab)

**The anonymous sync-key model is not a blocker** — push tokens are device-scoped and link to `user_profiles` via `user_profile_id`, same as favorites already do.
