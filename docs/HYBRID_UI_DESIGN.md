# Hybrid UI/UX Design: Settings, Favorites & Navigation

## Overview

A context-aware UI design that balances clean, minimal chat experience with quick access to favorites and settings. The approach adapts between mobile and desktop, showing an enriched empty state while keeping navigation compact during active conversations.

## Design Rationale

### Why Hybrid?

- **Mobile-first**: Drawer/menu pattern for settings
- **Desktop-friendly**: Favorites bar and quick access
- **Context-aware**: Empty state shows useful shortcuts, disappears during chat
- **Scalable**: Room for future features without cluttering the interface

## Mobile Layout

### Empty State (First Visit)

```
┌────────────────────────────────┐
│ ☁️ beta.rocks   🌍 🌙 [☰]    │ ← Header with menu button
├────────────────────────────────┤
│                                │
│ No messages yet...             │
│                                │
│ ⭐ Favorites (tap to view)     │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │Font  │ │El Cap│ │Siur  │... │
│ │Great │ │OK    │ │Meh   │    │
│ └──────┘ └──────┘ └──────┘    │
│                                │
│ 📍 Nearby Crags                │
│ [Detect location] or [Skip]    │
│                                │
│ Try asking:                    │
│ [Conditions at...] [Weather]   │
│                                │
├────────────────────────────────┤
│ [Message...]          [Send]   │
└────────────────────────────────┘
```

### During Chat

```
┌────────────────────────────────┐
│ ☁️ beta.rocks   🌍 🌙 [☰]    │
├────────────────────────────────┤
│                                │
│ [Chat messages...]             │
│                                │
│ [Conditions cards]             │
│                                │
│                                │
├────────────────────────────────┤
│ [Message...]          [Send]   │
└────────────────────────────────┘
```

### Menu Drawer (☰ tapped)

```
┌────────────────────────────────┐
│ [×] Your Profile               │
├────────────────────────────────┤
│                                │
│ 👤 Display Name                │
│ ┌────────────────────────────┐ │
│ │ Alex                   [✓] │ │
│ └────────────────────────────┘ │
│                                │
│ 🔑 Sync Key                    │
│ ┌────────────────────────────┐ │
│ │ k3j4h5g6f7...  [QR] [📋] │ │
│ └────────────────────────────┘ │
│                                │
│ ⚙️ Preferences                 │
│ Language:      [English ▼]     │
│ Theme:         [Dark ▼]        │
│                                │
│ ⭐ Favorites (12)          [→] │
│ 🕐 Recent Searches        [→] │
│ 📊 Your Stats            [→] │
│                                │
│ ────────────────────────────── │
│                                │
│ ℹ️ About beta.rocks           │
│ 🔒 Privacy Policy              │
│ 🐛 Report Issue                │
│ 🗑️ Clear Local Data            │
│                                │
│ 🔄 Sync Status: ✅ All synced  │
│    Last sync: 2 minutes ago    │
│                                │
└────────────────────────────────┘
```

## Desktop Layout

### Main View

```
┌────────────────────────────────────────────────────────────┐
│ ☁️ beta.rocks         🌍 [EN] 🌙 [👤 Alex ▼]            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ⭐ [Fontainebleau] [El Capitan] [Siurana] [+ Add]       │ ← Favorites bar
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   [Chat messages and conditions cards...]                  │
│                                                            │
│                                                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [Type a message...]                               [Send]   │
└────────────────────────────────────────────────────────────┘
```

### Profile Menu (Click "👤 Alex")

```
                                ┌─────────────────────┐
                                │ 👤 Alex            │
                                │ Climber #abc       │
                                ├─────────────────────┤
                                │ ⭐ Favorites (12)  │
                                │ 🕐 Recent          │
                                │ 📊 Your Stats      │
                                ├─────────────────────┤
                                │ ⚙️ Settings        │
                                │ 🔑 Sync Key & QR   │
                                │ 🌍 Language        │
                                ├─────────────────────┤
                                │ ℹ️ About           │
                                │ 🔒 Privacy         │
                                │ 🗑️ Clear Data      │
                                ├─────────────────────┤
                                │ 🔄 Synced ✅       │
                                └─────────────────────┘
```

## Detailed Views

### Favorites Page/Modal

```
┌────────────────────────────────────────────────┐
│ [←] Your Favorites                    [Search] │
├────────────────────────────────────────────────┤
│                                                │
│ ┌────────────────────────────────────────────┐ │
│ │ 🧗 Fontainebleau               Great ⭐   │ │
│ │ 📍 Île-de-France, France                   │ │
│ │ 18°C, 45% humidity, 8km/h wind             │ │
│ │ Last checked: 2 hours ago                  │ │
│ │                                            │ │
│ │ [View Conditions] [Remove]                 │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ ┌────────────────────────────────────────────┐ │
│ │ 🧗 El Capitan                   OK ⭐     │ │
│ │ 📍 California, USA                         │ │
│ │ 22°C, 60% humidity, 12km/h wind            │ │
│ │ Last checked: 1 day ago                    │ │
│ │                                            │ │
│ │ [View Conditions] [Remove]                 │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ [+ Add Favorite Crag]                          │
│                                                │
└────────────────────────────────────────────────┘
```

### Settings Dialog

```
┌────────────────────────────────────────┐
│ ⚙️ Settings                        [✕] │
├────────────────────────────────────────┤
│                                        │
│ 👤 Display Name                        │
│ ┌────────────────────────────────────┐ │
│ │ Alex                           [✓] │ │
│ └────────────────────────────────────┘ │
│ ☑️ Save name for future reports        │
│                                        │
│ 🌍 Language                            │
│ ┌────────────────────────────────────┐ │
│ │ English                       [▼] │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 🎨 Theme                              │
│ ┌────────────────────────────────────┐ │
│ │ Dark                          [▼] │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 📍 Location Services                   │
│ ☑️ Allow geolocation for nearby crags  │
│                                        │
│ ────────────────────────────────────── │
│ 🔑 Sync Key                            │
│ k3j4h5g6f7d8s9a0...                   │
│ [QR Code Display]                      │
│ [📋 Copy] [🔄 Regenerate]              │
│                                        │
│ ────────────────────────────────────── │
│ ⚠️ Danger Zone                         │
│                                        │
│ [🗑️ Clear Local Data]                 │
│ [🔑 Sign Out / Forget Sync Key]        │
│                                        │
└────────────────────────────────────────┘
```

## React Components

### New Components Required

```
UserMenu                    // Dropdown from header
├── UserProfile             // Display name, sync key preview
├── MenuItem
│   ├── Favorites
│   ├── Recent
│   ├── Settings
│   ├── About
│   └── Privacy
└── SyncStatusIndicator

FavoritesBar               // Horizontal chips (desktop only)
├── FavoriteChip           // Quick access crag
├── FavoriteChip
└── AddFavoriteButton

FavoritesPage              // Full page list
├── SearchFavorites
├── FavoriteCard           // Crag with live conditions
│   ├── ConditionSummary
│   └── [View] [Remove] buttons
└── AddFavoriteCragButton

SettingsDrawer / SettingsDialog
├── DisplayNameInput
├── LanguageSelect
├── ThemeSelect
├── LocationToggle
├── SyncKeySection
│   ├── KeyDisplay
│   ├── QRCode
│   ├── CopyButton
│   └── RegenerateButton
└── DangerZone

RecentSearchesPage
├── SearchItem
└── ClearButton

UserStatsPage
├── StatCard
│   ├── Reports Posted
│   ├── Confirmations Given
│   ├── Favorites Count
│   └── Last Active

SyncStatusIndicator
├── Status display (✅ | ⏳ | ⚠️ | ❌)
└── Last sync time
```

## Data Models

### IndexedDB Additions

```typescript
interface Favorite {
  id: string;
  area_id: string;
  area_name: string;
  area_slug: string;
  location: string; // "Country, Region"
  latitude: number;
  longitude: number;
  rock_type?: string;

  // Cached conditions (for quick display)
  last_conditions?: {
    rating: string;
    frictionScore: number;
    checked_at: string;
  };

  added_at: string;
  order: number; // For custom sorting
}

interface RecentSearch {
  id: string;
  area_id: string;
  area_name: string;
  searched_at: string;
}

interface UserSettings {
  display_name?: string;
  language: "en" | "pl";
  theme: "light" | "dark" | "system";
  enable_location: boolean;
  notifications_enabled: boolean;
}

interface UserStats {
  reports_posted: number;
  confirmations_given: number;
  last_active: string;
  created_at: string;
}
```

### Supabase Schema Additions

```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_key VARCHAR(32) REFERENCES user_profiles(sync_key),
  area_id UUID REFERENCES areas(id),
  added_at TIMESTAMP DEFAULT NOW(),
  "order" INT DEFAULT 0,

  UNIQUE(sync_key, area_id)
);

CREATE TABLE user_stats (
  sync_key VARCHAR(32) PRIMARY KEY REFERENCES user_profiles(sync_key),
  reports_posted INT DEFAULT 0,
  confirmations_given INT DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## User Flows

### Adding a Favorite

1. User gets conditions for a crag
2. Conditions card shows:
   ```
   ┌────────────────────────────┐
   │ 🧗 Fontainebleau          │
   │ Rating: Great (4.5/5)      │
   │ ...                        │
   │                            │
   │ [Details] [Add Report]     │
   │           [⭐ Favorite]    │ ← New button
   └────────────────────────────┘
   ```
3. User clicks [⭐ Favorite]
   - Save to IndexedDB (instant)
   - Sync to Supabase (background)
   - Button changes to [★ Favorited]
4. Chip appears in favorites bar: `⭐ [Fontainebleau]`
5. On other device (after sync): Favorite automatically appears

### Viewing Sync Key

1. User clicks [👤 Profile] in header
2. Opens menu/dialog
3. Clicks [🔑 Sync Key & QR]
4. Shows dialog with:
   - Readable key: `k3j4h5g6f7...`
   - QR code (scannable)
   - [📋 Copy] button
   - [🔄 Regenerate] button (with warning)

### Syncing to Another Device

1. On new device, app detects no sync key
2. Shows welcome screen with:
   - [🆕 Start Fresh]
   - [🔄 Sync from Another Device]
3. User clicks [🔄 Sync]
4. Opens dialog for:
   - Scan QR code (mobile camera)
   - Paste sync key (text)
5. App validates and pulls:
   - Favorites list
   - User settings
   - Display name
6. Data syncs automatically in background

## Implementation Roadmap

### Phase 1: Core Infrastructure

- [x] IndexedDB schema (favorites, recent, settings)
- [x] Sync key generation on first load
- [ ] UserMenu component (header)
- [ ] Settings drawer/dialog

### Phase 2: Favorites Management

- [ ] Add favorite button on conditions card
- [ ] FavoritesBar component (desktop)
- [ ] FavoritesPage component
- [ ] Background conditions update for favorites

### Phase 3: Profile & Settings

- [ ] Display name management
- [ ] Sync key QR code display
- [ ] Settings persistence
- [ ] Language/theme switching UI

### Phase 4: User Stats & Analytics

- [ ] UserStatsPage
- [ ] Stats tracking (reports, confirmations)
- [ ] Display in profile menu

### Phase 5: Recent Searches

- [ ] Track search history
- [ ] RecentSearchesPage
- [ ] Quick access chips

## Responsive Behavior

| Breakpoint          | Behavior                                          |
| ------------------- | ------------------------------------------------- |
| Mobile (<640px)     | Menu in drawer, single-column                     |
| Tablet (640-1024px) | Menu in drawer or sidebar, two-column support     |
| Desktop (>1024px)   | Favorites bar visible, dropdown menus, full width |

## Accessibility Considerations

- All icons should have text labels or aria-labels
- Menu keyboard navigation (arrow keys, enter)
- QR code should have fallback text option
- Favorites bar should be keyboard accessible
- Settings form should be screen-reader friendly
- Color contrast for theme-aware components

## Privacy & Security Notes

- Sync key never exposed in UI (only first/last 8 chars)
- QR code is time-sensitive (regenerate invalidates old key)
- Regenerate warning: "This will disconnect other devices"
- Clear local data option for shared devices
- No tracking of specific reports or favorites server-side
- All user preferences stored locally first, synced with hash

## Future Enhancements

- [ ] Favorites grouping/tagging (trips, projects)
- [ ] Shared trip planning with friends
- [ ] Condition alerts for favorites
- [ ] Export/backup user data
- [ ] Multi-language favorites naming
- [ ] Offline-first sync queue UI
- [ ] Dark/light theme sync across devices
