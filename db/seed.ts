/**
 * Seed script — populates the database with sample tracks, ratings, and results.
 *
 * Usage:
 *   bun run db/seed.ts              # auto-detects the first user in the DB
 *   bun run db/seed.ts <userId>     # seeds tracks owned by a specific user
 *   bun run db/seed.ts --clean      # delete seed data and start fresh
 */

import pg from "pg";
import { randomBytes, randomUUID } from "crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
});

// ─── Seed data ───────────────────────────────────────────────────────────────

const RATER_IDS = [
  "seed-rater-01",
  "seed-rater-02",
  "seed-rater-03",
  "seed-rater-04",
  "seed-rater-05",
  "seed-rater-06",
  "seed-rater-07",
  "seed-rater-08",
];

const SEED_TRACKS = [
  // TikTok context — 3 tracks for meaningful percentiles
  {
    title: "Neon Drip",
    context: "tiktok",
    genreTags: ["Pop", "Electronic"],
    ratings: [
      [3, 2, 3, 2],
      [2, 3, 2, 3],
      [3, 3, 2, 2],
      [2, 2, 3, 3],
      [3, 3, 3, 2],
    ],
  },
  {
    title: "Glitch Mode",
    context: "tiktok",
    genreTags: ["Hip-Hop", "Electronic"],
    ratings: [
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 1, 2, 2],
      [2, 2, 1, 1],
      [1, 2, 2, 1],
    ],
  },
  {
    title: "Sugar Rush",
    context: "tiktok",
    genreTags: ["Pop"],
    ratings: [
      [3, 3, 3, 3],
      [3, 2, 3, 3],
      [2, 3, 3, 3],
      [3, 3, 2, 3],
      [3, 3, 3, 2],
    ],
  },

  // Spotify context — 2 tracks
  {
    title: "Midnight Drive",
    context: "spotify",
    genreTags: ["Indie", "Lo-Fi"],
    ratings: [
      [3, 3, 2, 3],
      [2, 3, 3, 2],
      [3, 2, 3, 3],
      [2, 3, 2, 3],
      [3, 3, 3, 2],
    ],
  },
  {
    title: "Golden Hour",
    context: "spotify",
    genreTags: ["R&B", "Pop"],
    ratings: [
      [2, 2, 3, 2],
      [2, 3, 2, 2],
      [3, 2, 2, 3],
      [2, 2, 2, 2],
      [2, 3, 2, 2],
    ],
  },

  // Radio context — 1 complete track
  {
    title: "Highway Anthem",
    context: "radio",
    genreTags: ["Rock", "Country"],
    ratings: [
      [3, 3, 2, 2],
      [2, 3, 3, 2],
      [3, 2, 3, 3],
      [2, 3, 2, 3],
      [3, 3, 3, 2],
    ],
  },

  // Sync context — 1 complete track
  {
    title: "Tension Rising",
    context: "sync",
    genreTags: ["Electronic"],
    ratings: [
      [3, 2, 3, 3],
      [2, 3, 3, 2],
      [3, 3, 2, 3],
      [3, 2, 3, 2],
      [2, 3, 2, 3],
    ],
  },

  // 1 track still collecting (incomplete)
  {
    title: "Work In Progress",
    context: "tiktok",
    genreTags: ["Hip-Hop"],
    ratings: [
      [2, 1, 3, 2],
      [3, 2, 1, 3],
    ],
    votesRequested: 10, // only 2 of 10 received — still collecting
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeScore(allRatings: number[][]): number {
  const dimAvgs = [0, 1, 2, 3].map(
    (i) => allRatings.reduce((sum, r) => sum + r[i], 0) / allRatings.length
  );
  return Math.round((dimAvgs.reduce((a, b) => a + b, 0) / 4) * 10) / 10;
}

function computePercentile(score: number, allScores: number[]): number | null {
  if (allScores.length < 2) return null;
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / (allScores.length - 1)) * 100);
}

// ─── Clean ───────────────────────────────────────────────────────────────────

async function clean() {
  console.log("Cleaning seed data...");

  // Delete ratings by seed raters
  await pool.query(
    `DELETE FROM ratings WHERE rater_id = ANY($1)`,
    [RATER_IDS]
  );

  // Delete tracks with seed share tokens
  await pool.query(
    `DELETE FROM tracks WHERE share_token LIKE 'seed-%'`
  );

  // Delete seed rater profiles and credit transactions
  await pool.query(
    `DELETE FROM credit_transactions WHERE user_id = ANY($1)`,
    [RATER_IDS]
  );
  await pool.query(
    `DELETE FROM profiles WHERE id = ANY($1)`,
    [RATER_IDS]
  );

  console.log("Done.");
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed(ownerId: string) {
  // Clean any previous seed data first
  await clean();

  console.log(`Seeding data for user: ${ownerId}`);

  // 1. Ensure owner profile exists
  await pool.query(
    `INSERT INTO profiles (id, handle, credits, tracks_uploaded, tracks_rated)
     VALUES ($1, $2, 20, 0, 0)
     ON CONFLICT (id) DO NOTHING`,
    [ownerId, `user-${ownerId.slice(0, 8)}`]
  );

  // 2. Create rater profiles
  for (const raterId of RATER_IDS) {
    await pool.query(
      `INSERT INTO profiles (id, handle, credits, tracks_uploaded, tracks_rated)
       VALUES ($1, $2, 20, 0, 0)
       ON CONFLICT (id) DO NOTHING`,
      [raterId, `rater-${raterId.slice(-2)}`]
    );
  }

  // 3. Insert tracks and ratings, computing scores
  const scoresByContext: Record<string, { trackId: string; score: number }[]> = {};

  for (const t of SEED_TRACKS) {
    const trackId = randomUUID();
    const shareToken = `seed-${randomBytes(6).toString("hex")}`;
    const votesRequested = t.votesRequested ?? t.ratings.length;
    const votesReceived = t.ratings.length;
    const isComplete = votesReceived >= votesRequested;

    // Compute score for completed tracks
    const overallScore = isComplete ? computeScore(t.ratings) : null;

    // Track scores by context for percentile computation later
    if (isComplete && overallScore !== null) {
      if (!scoresByContext[t.context]) scoresByContext[t.context] = [];
      scoresByContext[t.context].push({ trackId, score: overallScore });
    }

    await pool.query(
      `INSERT INTO tracks
         (id, user_id, title, audio_filename, duration, genre_tags, context_id,
          status, snippet_start, snippet_end, votes_requested, votes_received,
          overall_score, share_token, is_deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,false)`,
      [
        trackId,
        ownerId,
        t.title,
        `/uploads/seed-${trackId.slice(0, 8)}.mp3`,
        27.5, // fake duration
        t.genreTags,
        t.context,
        isComplete ? "complete" : "collecting",
        0,    // snippetStart
        27.5, // snippetEnd
        votesRequested,
        votesReceived,
        overallScore,
        shareToken,
      ]
    );

    // Insert ratings from different raters
    for (let i = 0; i < t.ratings.length; i++) {
      const [d1, d2, d3, d4] = t.ratings[i];
      await pool.query(
        `INSERT INTO ratings (id, track_id, rater_id, dimension_1, dimension_2, dimension_3, dimension_4)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), trackId, RATER_IDS[i % RATER_IDS.length], d1, d2, d3, d4]
      );
    }

    console.log(
      `  ${isComplete ? "✓" : "…"} ${t.title} (${t.context}) — score: ${overallScore ?? "pending"}`
    );
  }

  // 4. Compute and update percentiles per context
  for (const [context, entries] of Object.entries(scoresByContext)) {
    const allScores = entries.map((e) => e.score);
    for (const { trackId, score } of entries) {
      const percentile = computePercentile(score, allScores);
      if (percentile !== null) {
        await pool.query(
          `UPDATE tracks SET percentile = $1 WHERE id = $2`,
          [percentile, trackId]
        );
      }
    }
    console.log(`  Percentiles computed for ${context} (${entries.length} tracks)`);
  }

  // 5. Update owner's tracksUploaded count
  await pool.query(
    `UPDATE profiles SET tracks_uploaded = $1 WHERE id = $2`,
    [SEED_TRACKS.length, ownerId]
  );

  console.log(`\nSeeded ${SEED_TRACKS.length} tracks with ratings. Done!`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];

  if (arg === "--clean") {
    await clean();
    await pool.end();
    return;
  }

  let ownerId = arg;

  if (!ownerId) {
    // Auto-detect: use the first real user in the DB
    const { rows } = await pool.query(
      `SELECT id FROM "user" LIMIT 1`
    );
    if (rows.length === 0) {
      console.error("No users found. Sign in to the app first, then re-run.");
      process.exit(1);
    }
    ownerId = rows[0].id;
  }

  await seed(ownerId);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
