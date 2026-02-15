# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Soundcheck** — a music virality rater web app. Users upload audio tracks, select a snippet, choose a context (TikTok, Spotify, Radio, Sync), and submit for community ratings. Raters score tracks on 4 context-specific dimensions (0–3: No, Kinda, Yes, Very). A credit system incentivizes rating: each rating earns credits based on the clip duration; credits are spent to submit tracks for rating.

## Commands

```bash
bun dev          # Start dev server (localhost:3000)
bun run build    # Production build
bun start        # Start production server
bun run lint     # ESLint (next core-web-vitals + typescript)
```

Database (requires `docker compose up -d` for Neon Local proxy on port 5434):
```bash
bun run db:generate   # Generate Drizzle migrations from schema
bun run db:migrate    # Run migrations
bun run db:push       # Push schema directly (dev shortcut)
bun run db:studio     # Open Drizzle Studio GUI
```

Add shadcn components:
```bash
bunx shadcn@latest add <component-name>
```

## Tech Stack

- **Next.js 16** with App Router (RSC enabled), **React 19**, TypeScript (strict)
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config` — config is CSS-based in `app/globals.css`)
- **shadcn/ui** (`radix-nova` style) with `radix-ui` primitives and `class-variance-authority`
- **Hugeicons** (`@hugeicons/react` + `@hugeicons/core-free-icons`) — **not Lucide**
- **Drizzle ORM** with `@neondatabase/serverless` (neon-http driver), migrations in `db/migrations/`
- **better-auth** with Google OAuth
- **Vercel Blob** for audio file storage
- **AI SDK** (`ai` + `@ai-sdk/react`) with **Zod v4** for validation (API differs from v3)
- **bun** as the package manager (lockfile: `bun.lock`)

## Architecture

### Route Structure

```
app/
├── page.tsx                          # Landing page
├── r/[shareToken]/page.tsx           # Public results share page
├── (app)/
│   ├── upload/page.tsx               # File upload + snippet selection
│   ├── context/page.tsx              # Context + vote package selection
│   ├── rate/page.tsx                 # Rating interface
│   ├── results/page.tsx              # User's track results list
│   ├── results/[trackId]/page.tsx    # Individual track results + insights
│   └── profile/page.tsx              # User profile + stats
└── api/
    ├── auth/[...all]/route.ts        # better-auth catch-all handler
    ├── upload/route.ts               # File upload to Vercel Blob
    ├── rate/next/route.ts            # Get next track to rate
    └── cleanup/route.ts              # Cleanup orphaned uploads (cron)
```

### Data Layer

**Server Actions** (`lib/actions/`):
- `upload.ts` — `createTrack()`: legacy draft flow; `createAndSubmitTrack()`: unified flow that validates input, claims upload, inserts track as "collecting", and deducts credits atomically (with rollback on failure)
- `rate.ts` — `submitRating()`: inserts rating, updates stats, awards duration-based credits per rating; `computeTrackScores()`: averages dimensions, calculates percentile
- `context.ts` — `submitForRating()`: deducts credits + sets track to "collecting" in atomic transaction; `getUserProfileData()`
- `track.ts` — `deleteTrack()`: soft-deletes track + removes blob from Vercel storage
- `cleanup.ts` — `cleanupOrphanedUploads()`: deletes unconsumed uploads older than 24h

**Queries** (`lib/queries/`):
- `profiles.ts` — `getProfile()`, `getTracksByUser()`, `ensureProfile()`
- `tracks.ts` — `getNextTrackToRate()` (NOT EXISTS subquery for unrated filter), `getTrackById()`, `getTrackByShareToken()`, `getTopTracks()`
- `ratings.ts` — `getTrackRatings()`, `computeDimensionAverages()`, `getAIInsights()`, `generateInsights()` (legacy fallback)

### Database Schema (`lib/db/schema.ts`)

Beyond the better-auth tables (user, session, account, verification), the app defines:
- **profiles** — extends users with `handle`, `credits` (default 20), `tracksUploaded`, `tracksRated`, `ratingProgress` (legacy column, no longer used by credit system)
- **tracks** — audio tracks with `status` (draft → collecting → complete), snippet bounds, vote counts, `overallScore`, `percentile`, `shareToken`
- **ratings** — 4 dimension scores (0–3) per track per rater, unique constraint on (trackId, raterId)
- **uploads** — temporary Vercel Blob file tracking with `consumed` flag
- **aiInsights** — AI-generated insights per track per milestone (5/10/20/50), unique on `(trackId, milestone)`, stored as JSON string
- **creditTransactions** — audit log of all credit changes with type + referenceId

DB client (`lib/db/index.ts`) uses `drizzle-orm/neon-http` with `@neondatabase/serverless`. In dev, the Neon Local proxy runs via Docker on port 5434.

### Authentication (action-gated pattern)

The app is fully browsable without login. Actions are gated via `requireAuth()`:

- `lib/auth.ts` — Server-side better-auth config with Drizzle adapter
- `lib/auth-client.ts` — Client-side exports: `signIn`, `signOut`, `signUp`, `useSession`
- `lib/auth-session.ts` — Server-side `getSession()` helper (uses `headers()`)
- `components/auth-provider.tsx` — `AuthProvider` context + `useAuth()` hook

```tsx
const { requireAuth } = useAuth()
<Button onClick={() => requireAuth(() => { /* runs only if logged in */ })}>Action</Button>
```

### Credit System

- **Start**: 20 credits on signup
- **Earn**: Each rating awards credits based on clip duration (`max(1, round(clipDuration / 10))`)
- **Spend**: Starter (10 votes, 20 credits), Standard (20 votes, 40 credits), Premium (50 votes, 100 credits)
- All changes logged in `creditTransactions` table
- Deductions use atomic WHERE guards (`WHERE credits >= cost`) — see Neon HTTP constraints below

### Key Constants

- **Contexts** (`lib/constants/contexts.ts`): TikTok/Reels, Spotify Discover, Radio/Mainstream, Sync/Licensing — each with 4 unique rating dimensions
- **Vote Packages** (`lib/constants/packages.ts`): Starter (10 votes, 20 credits), Standard (20 votes, 40 credits), Premium (50 votes, 100 credits)

### File Upload Flow

1. Client POSTs FormData to `/api/upload/route.ts`
2. Validates: auth, rate limit (10/hour), MIME type (audio/mpeg, wav, x-m4a), file size (≤10MB)
3. Uploads to Vercel Blob (`uploads/{timestamp}-{random}.{ext}`)
4. Records in `uploads` table with `consumed=false`
5. When track is created, upload is claimed (`consumed=true`) in atomic transaction
6. Orphaned uploads cleaned up after 24h via cron endpoint

### AI Insights System (`lib/services/ai.ts`)

Fire-and-forget AI-powered insights generated at vote milestones (5, 10, 20, 50). Called from `submitRating()` when `votesReceived` hits a milestone.

- Uses Claude Opus 4.6 via AI SDK with Zod structured output
- Generates 2–5 insights per milestone (5→2, 10→3, 20→4, 50→5; categories: TARGET AUDIENCE, SIMILAR TRACKS, SUGGESTION, STRENGTH, OPPORTUNITY)
- Sanitizes user-controlled text (title, tags, feedback) before prompt interpolation to prevent injection
- Stored in `aiInsights` table with `onConflictDoNothing()` for idempotency
- Type: `AIInsight` (exported, Zod-inferred)
- Requires `ANTHROPIC_API_KEY` env var

### Neon HTTP Driver Constraints

The project uses `drizzle-orm/neon-http` which does **not** support `db.transaction()`. Instead:

- **`db.batch([...queries])`** — sends multiple statements in one HTTP round-trip (sequential, but no automatic rollback)
- **Atomic WHERE guards** — e.g. `WHERE credits >= cost`, `WHERE consumed = false`, `WHERE status = 'draft'`
- **Ordering**: claim/validate first, then deduct; manually roll back on failure with compensating UPDATEs
- For true ACID transactions, would need to switch to `drizzle-orm/neon-serverless` with WebSocket `Pool`

### Storage Abstraction (`lib/storage.ts`)

- `storageUpload(filename, file)` — Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise local filesystem (`public/uploads/`)
- `storageDelete(urls)` — batch delete with path traversal protection via `safePublicPath()`

### Audio Processing

**Waveform** (`lib/audio-context.ts`): Single shared `AudioContext` (browser limit ~6). Waveform data cached by `${url}:${barCount}` with LRU eviction (max 64 entries).

**Clip Encoding** (`lib/audio-clip.ts`): Client-side audio trimming + MP3 encoding via `mediabunny` / `@mediabunny/mp3-encoder`. Output: mono, 128kbps, 44.1kHz (~480KB for 30s, ~240KB for 15s).

### Production Stages (`lib/constants/production-stages.ts`)

Tracks have a production stage: Demo, Mixed, or Mastered — displayed with emoji indicators and tooltips.

## Environment Variables

See `.env.example`:
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — better-auth config
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `DATABASE_URL` — Postgres connection string (Neon Local in dev, Neon cloud in prod)
- `NEON_API_KEY` / `NEON_PROJECT_ID` — Neon project config
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage
- `CLEANUP_SECRET` — Bearer token for cleanup cron endpoint
- `ANTHROPIC_API_KEY` — Claude API key for AI-powered insights

## Conventions

- `@/*` path alias maps to project root
- Icons: `<HugeiconsIcon icon={SomeIcon} strokeWidth={2} />` — import from `@hugeicons/core-free-icons`
- shadcn components use `data-slot` attributes for styling hooks; avoid manual edits to `components/ui/`
- CSS theming uses oklch color space with CSS custom properties and `.dark` class for dark mode
- Server-side session: `getSession()` from `lib/auth-session.ts`. Client-side: `useAuth()` from `components/auth-provider.tsx`
- All multi-step mutations use `db.batch()` or sequential queries with atomic WHERE guards (no `db.transaction()` — see Neon HTTP constraints above)
- `proxy.ts` exists at project root but is dead code (references `/dashboard` routes that don't exist) — ignore it
- Root layout applies `pb-20` for bottom nav clearance — account for this when adding full-height layouts
- No test infrastructure or CI/CD — project has no tests, no vitest/jest config, no `.github/workflows`
