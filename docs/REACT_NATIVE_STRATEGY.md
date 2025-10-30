# React Native App Strategy: Maximum Code Reuse

This document outlines the comprehensive strategy for creating a React Native mobile app for beta.rocks with 85-90% code reuse from the existing Next.js web application.

## Architecture Overview: Monorepo with Shared Packages

```
beta-rocks/
├── apps/
│   ├── web/              # Existing Next.js app (moved here)
│   └── mobile/           # New Expo app with Expo Router
├── packages/
│   ├── shared/           # 95% of business logic lives here
│   │   ├── lib/          # All your current /lib code
│   │   ├── types/        # Shared TypeScript types
│   │   └── i18n/         # i18next configuration
│   ├── ui/               # Shared UI components
│   │   ├── primitives/   # Basic components (Button, Card, etc.)
│   │   └── features/     # Feature components (chat, weather cards)
│   └── config/           # Shared configuration
└── package.json          # Workspace root
```

## What Can Be Reused (90-95% of codebase)

### 100% Reusable (No Changes Needed)

1. **All Business Logic** (`src/lib/`)
   - `conditions/conditions.service.ts` - friction calculations
   - `openbeta/client.ts` - GraphQL queries
   - `external-apis/` - all API clients
   - `db/queries.ts` - Supabase queries
   - `i18n/` - entire i18n setup with react-i18next
   - `auth/` - sync key generation, cookie management
   - `chat/` - history service, session management
   - `storage/` - favorites CRUD operations

2. **API Route Logic**
   - Extract the tool definitions and logic from `src/app/api/chat/route.ts`
   - Move to `packages/shared/lib/chat/tools.ts`
   - Vercel AI SDK works on React Native!

3. **Type Definitions**
   - All TypeScript types in `src/lib/openbeta/types.ts`, etc.

4. **Utilities & Helpers**
   - Date formatting, parsing, calculations
   - All helper functions

### 85-95% Reusable (Minor Adaptations)

1. **UI Components** - Using NativeWind (Tailwind CSS for RN)
   - Most Tailwind classes work identically
   - Need React Native primitives instead of HTML:
     - `<div>` → `<View>`
     - `<p>`, `<h1>` → `<Text>`
     - `<button>` → `<Pressable>` or custom `<Button>`

2. **shadcn/ui Components**
   - Use **react-native-reusables** (shadcn/ui port for RN)
   - Nearly identical API, just wraps RN components

3. **Chat Interface**
   - Vercel AI SDK `useChat` hook works on mobile
   - Need RN components for rendering (FlatList instead of mapping)

## Implementation Plan

### Phase 1: Setup Monorepo (1-2 hours)

```bash
# 1. Restructure to monorepo
mkdir -p apps packages
mv [current-files] apps/web

# 2. Create root package.json
cat > package.json << EOF
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "cd apps/web && npm run dev",
    "dev:mobile": "cd apps/mobile && npm start"
  }
}
EOF

# 3. Create Expo app
npx create-expo-app@latest apps/mobile --template blank-typescript

# 4. Create shared packages
mkdir -p packages/shared packages/ui packages/config
```

### Phase 2: Extract Shared Code (2-3 hours)

**Create `packages/shared/package.json`:**

```json
{
  "name": "@temps/shared",
  "version": "1.0.0",
  "main": "index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "i18next": "^23.x",
    "react-i18next": "^14.x",
    "zod": "^3.x"
  }
}
```

**Move shared code:**

```bash
# Move all business logic
cp -r apps/web/src/lib packages/shared/

# Update imports in web app to use workspace
# From: import { computeConditions } from '@/lib/conditions/conditions.service'
# To:   import { computeConditions } from '@temps/shared/lib/conditions/conditions.service'
```

### Phase 3: Setup Mobile App with Expo Router (3-4 hours)

**Install dependencies:**

```bash
cd apps/mobile

# Core packages
npm install expo-router react-native-safe-area-context react-native-screens

# Styling (NativeWind = Tailwind for RN)
npm install nativewind tailwindcss react-native-reanimated

# Vercel AI SDK (works on RN!)
npm install ai @ai-sdk/google

# Supabase
npm install @supabase/supabase-js

# i18n
npm install i18next react-i18next

# Charts (for weather graphs)
npm install victory-native # Better than recharts for RN

# UI library (shadcn/ui equivalent)
npm install @react-native-reusables/core

# QR code scanning
npm install expo-camera expo-barcode-scanner
```

**Configure NativeWind:**

```javascript
// apps/mobile/tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Copy your web theme customizations here
    },
  },
};
```

**File structure with Expo Router:**

```
apps/mobile/
├── app/
│   ├── _layout.tsx           # Root layout (similar to Next.js)
│   ├── index.tsx             # Home screen (chat interface)
│   ├── settings.tsx          # Settings screen
│   ├── sync.tsx              # Sync key input/QR scan
│   ├── location/[slug].tsx   # Crag detail pages
│   └── (tabs)/               # Tab navigation (optional)
├── components/               # Mobile-specific components
├── lib/                      # Re-exports from @temps/shared
└── babel.config.js
```

### Phase 4: Create Shared UI Components (4-6 hours)

**Strategy: Platform-specific rendering with shared logic**

```typescript
// packages/ui/src/WeatherCard/WeatherCard.tsx
import { View, Text } from 'react-native'
import { computeFrictionRating } from '@temps/shared/lib/conditions/conditions.service'

type WeatherCardProps = {
  conditions: CurrentConditions
  locationName: string
}

export function WeatherCard({ conditions, locationName }: WeatherCardProps) {
  // Shared logic
  const rating = computeFrictionRating(conditions)
  const ratingColor = getRatingColor(rating) // shared helper

  // Platform-specific UI (but same structure!)
  return (
    <View className="rounded-lg border border-gray-200 p-4 bg-white">
      <Text className="text-xl font-bold">{locationName}</Text>

      <View className="flex-row items-center gap-2 mt-2">
        <View
          className={`w-12 h-12 rounded-full items-center justify-center ${ratingColor}`}
        >
          <Text className="text-2xl font-bold text-white">{rating}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-gray-600">Temperature: {conditions.temp}°C</Text>
          <Text className="text-gray-600">Humidity: {conditions.humidity}%</Text>
        </View>
      </View>
    </View>
  )
}
```

**For complex components, use conditional imports:**

```typescript
// packages/ui/src/ConditionsChart/index.ts
export { ConditionsChart } from "./ConditionsChart.native"; // for mobile

// packages/ui/src/ConditionsChart/index.web.ts
export { ConditionsChart } from "./ConditionsChart.web"; // for web
```

### Phase 5: Implement Chat Interface (3-4 hours)

**Mobile chat using Vercel AI SDK:**

```typescript
// apps/mobile/app/index.tsx
import { useChat } from 'ai/react' // Works on React Native!
import { View, Text, TextInput, FlatList, Pressable } from 'react-native'
import { WeatherCard } from '@temps/ui'
import { useChatHistory } from '@temps/shared/hooks/useChatHistory'

export default function ChatScreen() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: 'https://beta.rocks/api/chat', // Your existing endpoint!
    // Or run locally in mobile: 'http://localhost:3000/api/chat'
  })

  return (
    <View className="flex-1 bg-gray-50">
      {/* Messages list */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} />
        )}
        className="flex-1 px-4"
      />

      {/* Input */}
      <View className="border-t border-gray-200 p-4 bg-white">
        <View className="flex-row gap-2">
          <TextInput
            value={input}
            onChangeText={handleInputChange}
            placeholder="Ask about climbing conditions..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
          />
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            className="bg-blue-500 rounded-lg px-4 py-2"
          >
            <Text className="text-white font-semibold">Send</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
```

**Message rendering with tool results:**

```typescript
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <View className={`my-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser ? 'bg-blue-500' : 'bg-white border border-gray-200'
        }`}
      >
        <Text className={isUser ? 'text-white' : 'text-gray-900'}>
          {message.content}
        </Text>

        {/* Render tool results (weather cards, etc.) */}
        {message.toolInvocations?.map((tool) => (
          <ToolResult key={tool.toolCallId} tool={tool} />
        ))}
      </View>
    </View>
  )
}
```

### Phase 6: Handle Platform-Specific Features

**1. Language Selection (i18n)**

```typescript
// Same i18next config works everywhere!
// packages/shared/lib/i18n/config.ts - no changes needed

// Mobile: Use device locale
import { getLocales } from "expo-localization";

const deviceLocale = getLocales()[0].languageCode;
i18n.changeLanguage(deviceLocale);
```

**2. Charts (Victory Native vs Recharts)**

```typescript
// packages/ui/src/HourlyChart/HourlyChart.native.tsx
import { VictoryLine, VictoryChart } from 'victory-native'

export function HourlyChart({ data }) {
  return (
    <VictoryChart>
      <VictoryLine data={data} x="hour" y="friction" />
    </VictoryChart>
  )
}

// packages/ui/src/HourlyChart/HourlyChart.web.tsx
import { LineChart, Line } from 'recharts'

export function HourlyChart({ data }) {
  return (
    <LineChart data={data}>
      <Line dataKey="friction" />
    </LineChart>
  )
}
```

**3. Navigation**

```typescript
// Expo Router uses similar patterns to Next.js!
// apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'beta.rocks' }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="sync" options={{ title: 'Sync Device' }} />
      <Stack.Screen
        name="location/[slug]"
        options={{ title: 'Crag Details' }}
      />
    </Stack>
  )
}
```

**4. QR Code Sync (Mobile-Specific)**

```typescript
// apps/mobile/app/sync.tsx
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useState } from 'react'
import { View, TextInput, Button, Text } from 'react-native'
import { restoreSyncKey } from '@temps/shared/lib/auth/sync-key'

export default function SyncScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [manualKey, setManualKey] = useState('')

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true)
    await restoreSyncKey(data)
    // Navigate to home
  }

  return (
    <View className="flex-1">
      {/* QR Scanner */}
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Manual entry fallback */}
      <View className="p-4 bg-white">
        <Text className="text-lg font-semibold mb-2">
          Or enter sync key manually:
        </Text>
        <TextInput
          value={manualKey}
          onChangeText={setManualKey}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="border border-gray-300 rounded-lg p-2"
        />
        <Button
          title="Sync"
          onPress={() => restoreSyncKey(manualKey)}
        />
      </View>
    </View>
  )
}
```

## Code Reuse Breakdown

| Category           | Reuse %  | Notes                            |
| ------------------ | -------- | -------------------------------- |
| Business Logic     | **100%** | Zero changes needed              |
| API Clients        | **100%** | All work in RN                   |
| Data Models/Types  | **100%** | TypeScript types                 |
| i18n               | **100%** | react-i18next works everywhere   |
| Auth/Sync System   | **100%** | Sync keys work identically       |
| Chat History       | **100%** | Same Supabase integration        |
| Favorites          | **100%** | Same storage layer               |
| Reports            | **100%** | Same API layer                   |
| UI Component Logic | **95%**  | Only render layer changes        |
| Styling            | **90%**  | NativeWind = Tailwind CSS        |
| Navigation         | **70%**  | Similar patterns, different APIs |
| Charts             | **0%**   | Need RN-specific library         |

**Overall Code Reuse: 85-90%**

## Development Workflow

```bash
# Terminal 1: Run web
npm run dev:web

# Terminal 2: Run mobile
npm run dev:mobile

# Changes to packages/shared automatically reflect in both!
```

## Handling shadcn/ui Components

Use **react-native-reusables** - nearly identical API:

```typescript
// Web (current)
import { Button } from '@/components/ui/button'

// Mobile (using react-native-reusables)
import { Button } from '@/components/ui/button' // Same import!

// The implementation is different, but the API is identical
<Button onPress={handleSubmit}>Send</Button>
```

## Key Advantages of This Approach

1. **Single Source of Truth**: All business logic in `packages/shared`
2. **Shared API Layer**: Same Vercel AI SDK streaming works everywhere
3. **Unified Styling**: NativeWind = Tailwind CSS on mobile
4. **Type Safety**: TypeScript types shared across platforms
5. **Rapid Development**: Change once, works everywhere
6. **Easy Testing**: Test business logic once for all platforms
7. **Feature Parity**: All features work on mobile (sync, favorites, history, reports)

## Platform-Specific Considerations

**Web-only (keep in apps/web):**

- Middleware for geo-detection
- Server-side rendering logic
- Web-specific meta tags

**Mobile-only (keep in apps/mobile):**

- Push notifications
- QR code scanning for sync
- Native camera access
- Share functionality
- Deep linking for crag URLs

**Different implementations:**

- Charts (Victory Native vs Recharts)
- Modal patterns (Sheet vs Dialog)
- Navigation (Expo Router vs Next.js routing)

## Recommended Mobile Features to Add

1. **QR Code Sync**: Scan sync key from web app (already planned)
2. **Offline Mode**: Cache recent searches with AsyncStorage
3. **Location Services**: Auto-detect nearby crags using device GPS
4. **Push Notifications**: "Conditions improving at El Cap!"
5. **Native Share**: Share conditions with climbing partners
6. **Camera Integration**: Upload photos with reports (future)
7. **Deep Linking**: Open crag URLs from browser in app

## Estimated Timeline

- **Monorepo Setup**: 2 hours
- **Extract Shared Code**: 3 hours
- **Mobile App Setup**: 4 hours
- **Shared UI Components**: 6 hours
- **Chat Interface**: 4 hours
- **User Profiles & Sync**: 3 hours (reuse existing logic)
- **Favorites & History**: 2 hours (reuse existing logic)
- **Reports System**: 2 hours (reuse existing logic)
- **QR Code Scanning**: 2 hours
- **Polish & Testing**: 5 hours

**Total: ~33 hours** for a fully functional mobile app with 85-90% code reuse!

## Technology Stack Summary

**Shared Across Platforms:**

- TypeScript
- Supabase (authentication, database)
- Vercel AI SDK (chat, streaming)
- i18next (internationalization)
- Zod (validation)
- OpenBeta GraphQL
- Open-Meteo API

**Web (Next.js):**

- Next.js 16 App Router
- Tailwind CSS 4
- shadcn/ui
- Recharts

**Mobile (React Native/Expo):**

- Expo SDK
- Expo Router (file-based routing)
- NativeWind (Tailwind for RN)
- react-native-reusables (shadcn/ui for RN)
- Victory Native (charts)
- expo-camera (QR scanning)

## Migration Path

1. **Phase 1**: Set up monorepo structure, move web app
2. **Phase 2**: Extract shared packages (business logic)
3. **Phase 3**: Create mobile app scaffold with Expo Router
4. **Phase 4**: Implement core features (chat, conditions)
5. **Phase 5**: Port user features (sync, favorites, history, reports)
6. **Phase 6**: Add mobile-specific features (QR, location)
7. **Phase 7**: Polish, test, deploy

## Testing Strategy

**Shared Logic Testing:**

- Jest tests in `packages/shared` test both platforms
- Mock platform-specific APIs (AsyncStorage, cookies)

**UI Testing:**

- Separate tests for web and mobile components
- Use React Testing Library for both
- Focus on behavior, not implementation

**E2E Testing:**

- Cypress for web
- Detox for mobile
- Test critical flows: chat, sync, favorites

## Deployment

**Web:**

- Vercel (current setup)
- No changes needed

**Mobile:**

- **iOS**: TestFlight → App Store
- **Android**: Internal testing → Google Play
- **Expo EAS Build**: Cloud build service
- **Over-the-air updates**: Push updates without app store review

```bash
# Build for production
eas build --platform all

# Submit to stores
eas submit --platform all

# Push OTA update
eas update --branch production
```

## Bottom Line

With Expo + Expo Router + NativeWind + Monorepo, you can share almost all your code. The web and mobile apps will feel like twins - same logic, similar UI, unified codebase. All existing features (user profiles, sync keys, chat history, favorites, reports) work seamlessly on mobile with minimal adaptation.

This is the modern standard for React Native development in 2025.
