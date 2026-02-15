# SoundCheck

A music virality rater web app. Upload audio tracks, select a snippet, choose a context (TikTok, Spotify, Radio, Sync), and submit for community ratings. Raters score tracks on 4 context-specific dimensions (0–3: No, Kinda, Yes, Very). A credit system incentivizes rating: each rating earns credits based on the clip duration; credits are spent to submit tracks for rating.

## Tech Stack

- **Next.js 16** (App Router, RSC) / **React 19** / **TypeScript**
- **Tailwind CSS v4** / **shadcn/ui** / **Hugeicons**
- **Drizzle ORM** with **Neon Postgres** (neon-http driver)
- **better-auth** (Google OAuth)
- **Vercel Blob** (audio storage)
- **AI SDK** with Claude for AI-powered track insights
- **bun** (package manager)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- [Docker](https://www.docker.com/) (for local Neon Postgres proxy)

### Setup

1. Clone the repo and install dependencies:

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

3. Start the local database:

   ```bash
   docker compose up -d
   ```

4. Push the schema to the database:

   ```bash
   bun run db:push
   ```

5. Start the dev server:

   ```bash
   bun dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `bun dev`             | Start dev server                    |
| `bun run build`       | Production build                    |
| `bun run lint`        | Run ESLint                          |
| `bun start`           | Start production server             |
| `bun run db:generate` | Generate Drizzle migrations         |
| `bun run db:migrate`  | Run migrations                      |
| `bun run db:push`     | Push schema directly (dev shortcut) |
| `bun run db:studio`   | Open Drizzle Studio GUI             |

## Environment Variables

See `.env.example` for all required variables:

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Auth config |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `DATABASE_URL` | Postgres connection string (`localhost:5434` for local Neon) |
| `NEON_API_KEY` / `NEON_PROJECT_ID` | Neon project config |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `CLEANUP_SECRET` | Bearer token for cleanup cron endpoint |
| `ANTHROPIC_API_KEY` | Claude API key for AI-powered insights |

## How It Works

1. **Upload** — Upload an audio file and select a snippet
2. **Context** — Pick a context (TikTok/Reels, Spotify Discover, Radio/Mainstream, Sync/Licensing) and a vote package
3. **Collect** — Other users rate the track on 4 context-specific dimensions (0–3 scale)
4. **Results** — View scores, percentiles, and AI-generated insights

### Credit System

- **20 credits** on signup
- **Earn** credits by rating other tracks (based on clip duration: `max(1, round(duration / 10))`)
- **Spend** credits to submit tracks: Starter (10 votes / 20 credits), Standard (20 votes / 40 credits), Premium (50 votes / 100 credits)

### AI Insights

At vote milestones (5, 10, 20, 50), Claude generates analytical insights for each track — target audience analysis, similar track comparisons, actionable suggestions, strengths, and opportunities.
