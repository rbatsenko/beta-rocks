# beta.rocks

Get the beta on any crag worldwide. A free web and mobile app that provides real-time weather conditions, community reports, and crag information for climbers. Built with Next.js, React, and deployed on Vercel.

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
- **i18next** - Internationalization (30 locales)

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (conditions, reports, v1 public API)
│   ├── location/[slug]/  # Dynamic crag pages (ISR)
│   ├── docs/api/        # Public API documentation
│   ├── sync/            # Sync key restoration page
│   ├── layout.tsx       # Root layout with Header
│   └── page.tsx         # Home page
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── WeatherConditionCard.tsx
│   ├── ConditionsDetailSheet.tsx
│   └── ...
├── lib/
│   ├── conditions/     # Conditions calculation service
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

- **Real-time weather** - Open-Meteo integration with 14-day forecasts
- **Conditions analysis** - Rock type-specific conditions assessment with weather-aware drying calculations
- **Global crag database** - 8,000+ climbing areas worldwide from OpenStreetMap

### Community

- **Community reports** - Share conditions, safety issues, access updates, beta, and facilities info
- **Report categories** - conditions, safety, access, beta, facilities, other
- **Report voting** - Helpful/unhelpful confirmations with user stats tracking
- **User profiles** - Optional display names, anonymous by default

### Organization

- **Favorites** - Bookmark crags for quick access
- **User stats** - Track reports posted, confirmations given, and favorites count

### Sharing & Pages

- **Crag detail pages** - ISR-generated pages with coordinate-based slugs (5min revalidation)
- **Direct condition links** - Shareable URLs for any crag (e.g., `/location/45.123,-73.456`)
- **Maps & external links** - Embedded maps with external links

### Sync & Privacy

- **Multi-device sync** - 16-character sync keys with QR code generation
- **Offline support** - LocalStorage + Supabase sync with online/offline indicators
- **Privacy-first** - No accounts, no email, anonymous by default with optional display names
- **Row-level security** - Supabase RLS policies protect user data

### Public API

- **REST API v1** - Versioned public API at `/api/v1/` for external app integration
- **Crag search** - Search crags by name, get details by ID, find nearby crags by coordinates
- **Community reports** - Fetch and submit reports via API with sync key authentication
- **CORS enabled** - Open CORS for all origins on v1 endpoints
- **API docs** - Interactive documentation at [`/docs/api`](https://beta.rocks/docs/api)
- **MCP server** - [`beta-rocks-mcp`](https://www.npmjs.com/package/beta-rocks-mcp) for Claude, Cursor, Windsurf, and other AI tools

### i18n

- **30 languages** - Full internationalization support with region-specific fallbacks

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PRD](./docs/PRD.md)
