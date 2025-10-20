# temps.rocks

A free, chat-first web app that helps climbers check real-time conditions at crags, sectors, and routes worldwide. Built with Next.js, React, and deployed on Vercel.

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
```

## What technologies are used?

This project is built with:

- **Next.js 15** - React framework for production
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - High-quality React components
- **Supabase** - PostgreSQL database & auth
- **Vercel AI SDK** - AI-powered chat (Google Gemini 2.5 Flash)

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

- **Chat interface** - Ask about climbing conditions naturally
- **Real-time weather** - Open-Meteo integration
- **Community reports** - Share and confirm conditions
- **Offline support** - Local-first data storage
- **Multi-device sync** - Sync across devices with a sync key
- **Privacy-first** - No accounts required, anonymous by default

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PRD](./docs/PRD.md)
