# Soundcheck

A music virality rater web app. Upload a track, select a snippet, choose a context (TikTok, Spotify, Radio, or Sync), and get community ratings across 4 context-specific dimensions. A credit system incentivizes participation — rate 5 tracks to earn a credit, spend credits to get more votes on your own tracks.

## Tech Stack

- **Next.js 16** (App Router) / **React 19** / **TypeScript**
- **Tailwind CSS v4** / **shadcn/ui** / **Hugeicons**
- **Drizzle ORM** with **Neon Postgres**
- **better-auth** (Google OAuth)
- **Vercel Blob** (audio storage)
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

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `bun dev`            | Start dev server                     |
| `bun run build`      | Production build                     |
| `bun run lint`       | Run ESLint                           |
| `bun start`          | Start production server              |
| `bun run db:generate`| Generate Drizzle migrations          |
| `bun run db:migrate` | Run migrations                       |
| `bun run db:push`    | Push schema directly (dev shortcut)  |
| `bun run db:studio`  | Open Drizzle Studio GUI              |
