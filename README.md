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
cd temps-rocks

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
app/
├── api/              # API routes (chat, sync, conditions)
├── components/       # Reusable React components
├── layout.tsx        # Root layout
└── page.tsx          # Home page

src/
├── components/       # UI components (shadcn/ui)
├── lib/             # Utility functions
└── integrations/    # External service clients
```

## Deployment

Deploy to Vercel with one click:

```sh
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments on every push.

See [Vercel docs](https://vercel.com/docs) for more info.

## Features

- **Chat interface** - Ask about climbing conditions naturally with AI-powered responses
- **Real-time weather** - Open-Meteo integration with 14-day forecasts
- **Friction analysis** - Rock type-specific friction scores (1-5 scale)
- **Community reports** - Share conditions, safety issues, access updates, beta, and facilities info
- **Report categories** - conditions, safety, access, beta, facilities, other
- **Favorites** - Bookmark crags for quick access
- **Chat history** - Persistent conversations across sessions
- **Crag detail pages** - Dedicated pages for each crag with conditions, reports, and maps
- **Offline support** - Local-first data storage
- **Multi-device sync** - Sync across devices with a sync key (QR code support)
- **Privacy-first** - No accounts required, anonymous by default
- **17 languages** - Full internationalization support

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PRD](./docs/PRD.md)
