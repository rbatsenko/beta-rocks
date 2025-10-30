# beta.rocks

Get the beta on any crag worldwide. A free, chat-first web app that provides real-time conditions, community reports, and route information for climbers. Built with Next.js, React, and deployed on Vercel.

## Getting Started

### Prerequisites

- Node.js 18+ & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd beta-rocks

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vbqnfvgvxlnlfabuqlzi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-key>
GOOGLE_GENERATIVE_AI_API_KEY=<your-google-api-key>

# Optional: Only required for admin scripts (e.g., enrich-countries.ts)
# SUPABASE_SECRET_KEY=<your-service-role-secret>
```

## What technologies are used?

This project is built with:

- **Next.js 16** - React framework for production
- **TypeScript** - Type safety with strict mode
- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - High-quality React components
- **Supabase** - PostgreSQL database with RLS
- **Vercel AI SDK** - AI-powered chat (Google Gemini 2.5 Flash)
- **i18next** - Internationalization (17 locales)

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (chat, conditions, reports)
│   ├── location/[slug]/  # Dynamic crag pages (ISR)
│   ├── sync/            # Sync key restoration page
│   ├── layout.tsx       # Root layout with Header
│   └── page.tsx         # Home page with ChatInterface
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── ChatInterface.tsx
│   ├── WeatherConditionCard.tsx
│   ├── ConditionsDetailSheet.tsx
│   └── ...
├── lib/
│   ├── conditions/     # Friction calculation service
│   ├── openbeta/       # OpenBeta GraphQL client
│   ├── external-apis/  # Open-Meteo, geocoding
│   ├── db/            # Supabase queries
│   ├── i18n/          # Internationalization config
│   └── auth/          # Sync key management
└── integrations/
    └── supabase/       # Supabase types & client
```

## Deployment

Deploy to Vercel with one click:

```sh
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments on every push.

See [Vercel docs](https://vercel.com/docs) for more info.

## Features

### Core
- **Chat interface** - Ask about climbing conditions naturally with AI-powered responses (Google Gemini 2.5 Flash)
- **Real-time weather** - Open-Meteo integration with 14-day forecasts
- **Friction analysis** - Rock type-specific friction scores (1-5 scale) with weather-aware drying calculations
- **OpenBeta integration** - 200,000+ climbing areas worldwide with precise coordinates

### Community
- **Community reports** - Share conditions, safety issues, access updates, beta, and facilities info
- **Report categories** - conditions, safety, access, beta, facilities, other
- **Report voting** - Helpful/unhelpful confirmations with user stats tracking
- **User profiles** - Optional display names, anonymous by default

### Organization
- **Favorites** - Bookmark crags with cached friction scores for quick access
- **Chat history** - Persistent conversations across sessions with automatic titles
- **User stats** - Track reports posted, confirmations given, and favorites count

### Sharing & Pages
- **Crag detail pages** - ISR-generated pages with coordinate-based slugs (5min revalidation)
- **Direct condition links** - Shareable URLs for any crag (e.g., `/location/45.123,-73.456`)
- **Maps & external links** - Embedded maps, OpenBeta links, Mountain Project integration

### Sync & Privacy
- **Multi-device sync** - 16-character sync keys with QR code generation
- **Offline support** - LocalStorage + Supabase sync with online/offline indicators
- **Privacy-first** - No accounts, no email, anonymous by default with optional display names
- **Row-level security** - Supabase RLS policies protect user data

### i18n
- **17 languages** - Full internationalization support with region-specific fallbacks

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PRD](./docs/PRD.md)
