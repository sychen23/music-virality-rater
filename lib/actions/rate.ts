"use server";

import { db } from "@/lib/db";
import { ratings, tracks, profiles, creditTransactions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, sql, and } from "drizzle-orm";

export async function submitRating(data: {
  trackId: string;
  dimension1: number;
  dimension2: number;
  dimension3: number;
  dimension4: number;
  feedback?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Validate trackId
  if (typeof data.trackId !== "string" || !data.trackId.trim()) {
    throw new Error("Invalid track ID");
  }

  // Validate dimension scores are integers between 1 and 10
  const dims = [data.dimension1, data.dimension2, data.dimension3, data.dimension4];
  if (dims.some((d) => !Number.isInteger(d) || d < 1 || d > 10)) {
    throw new Error("Invalid rating values. Each dimension must be an integer between 1 and 10.");
  }

  // Validate feedback if provided
  if (data.feedback !== undefined && data.feedback !== null) {
    if (typeof data.feedback !== "string" || data.feedback.length > 2000) {
      throw new Error("Feedback must be a string of 2000 characters or fewer.");
    }
  }

  const raterId = session.user.id;

  const result = await db.transaction(async (tx) => {
    // Prevent duplicate ratings — check + unique constraint as belt-and-suspenders
    const existing = await tx.query.ratings.findFirst({
      where: and(eq(ratings.trackId, data.trackId), eq(ratings.raterId, raterId)),
      columns: { id: true },
    });
    if (existing) throw new Error("You have already rated this track");

    // Fetch track and verify it exists, is actively collecting, and isn't owned by the rater
    const track = await tx.query.tracks.findFirst({
      where: eq(tracks.id, data.trackId),
      columns: { userId: true, status: true },
    });
    if (!track) throw new Error("Track not found");
    if (track.status !== "collecting") {
      throw new Error("This track is not currently accepting ratings");
    }
    if (track.userId === raterId) throw new Error("You cannot rate your own track");

    // Create rating
    await tx.insert(ratings).values({
      trackId: data.trackId,
      raterId,
      dimension1: data.dimension1,
      dimension2: data.dimension2,
      dimension3: data.dimension3,
      dimension4: data.dimension4,
      feedback: data.feedback || null,
    });

    // Increment votes_received on track
    const [updatedTrack] = await tx
      .update(tracks)
      .set({ votesReceived: sql`${tracks.votesReceived} + 1` })
      .where(eq(tracks.id, data.trackId))
      .returning();

    // Increment rater stats
    const [updatedProfile] = await tx
      .update(profiles)
      .set({
        tracksRated: sql`${profiles.tracksRated} + 1`,
        ratingProgress: sql`${profiles.ratingProgress} + 1`,
      })
      .where(eq(profiles.id, raterId))
      .returning();

    if (!updatedProfile) {
      throw new Error("Rater profile not found");
    }

    // Check if rating progress reached 5 — use atomic compare-and-set
    // to prevent concurrent requests from both awarding a credit.
    let creditEarned = false;
    if (updatedProfile.ratingProgress >= 5) {
      // Only reset & award if ratingProgress is still >= 5 (guards against
      // a concurrent transaction that already reset it).
      const [reset] = await tx
        .update(profiles)
        .set({
          ratingProgress: 0,
          credits: sql`${profiles.credits} + 1`,
        })
        .where(
          and(
            eq(profiles.id, raterId),
            sql`${profiles.ratingProgress} >= 5`
          )
        )
        .returning({ id: profiles.id });

      if (reset) {
        creditEarned = true;
        await tx.insert(creditTransactions).values({
          userId: raterId,
          amount: 1,
          type: "rating_bonus",
        });
      }
    }

    // If the CAS succeeded, progress was reset to 0. If it didn't
    // (unlikely race where a concurrent tx already reset it), the
    // DB value may be >= 5. Clamp to 0-4 so the client never sees
    // an out-of-range value.
    const newProgress = creditEarned
      ? 0
      : Math.max(0, Math.min(updatedProfile.ratingProgress, 4));

    return {
      updatedTrack,
      creditEarned,
      newProgress,
    };
  });

  // If track reached vote goal, compute scores. Runs outside the main
  // transaction to keep that transaction short. computeTrackScores uses
  // its own transaction with an advisory lock to prevent concurrent
  // callers from racing (e.g. two final ratings arriving simultaneously).
  // Guard: votesRequested must be > 0 to avoid triggering on draft tracks
  // where votesRequested defaults to 0 (defense-in-depth alongside the
  // status === 'collecting' check above).
  if (
    result.updatedTrack &&
    result.updatedTrack.votesRequested > 0 &&
    result.updatedTrack.votesReceived >= result.updatedTrack.votesRequested
  ) {
    await computeTrackScores(data.trackId);
  }

  return {
    creditEarned: result.creditEarned,
    newProgress: result.newProgress,
  };
}

/**
 * Derive a stable 32-bit integer from a UUID string for use as a
 * PostgreSQL advisory lock key. Uses FNV-1a for speed and simplicity.
 */
function hashTrackId(trackId: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < trackId.length; i++) {
    hash ^= trackId.charCodeAt(i);
    hash = (hash * 0x01000193) | 0; // FNV prime, keep 32-bit
  }
  return hash;
}

async function computeTrackScores(trackId: string) {
  // Wrap in a transaction so the advisory lock is held on a single
  // connection for the duration, then auto-released on commit.
  // This prevents two concurrent final-rating requests from both
  // computing and overwriting scores for the same track.
  await db.transaction(async (tx) => {
    // Acquire a transaction-scoped advisory lock keyed on the track.
    // pg_advisory_xact_lock blocks until the lock is available and
    // releases automatically when the transaction ends.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${hashTrackId(trackId)})`
    );

    // Re-check status: if another caller already completed this track
    // while we waited for the lock, there's nothing left to do.
    const current = await tx.query.tracks.findFirst({
      where: eq(tracks.id, trackId),
      columns: { status: true },
    });
    if (current?.status === "complete") return;

    const trackRatings = await tx.query.ratings.findMany({
      where: eq(ratings.trackId, trackId),
    });

    if (trackRatings.length === 0) return;

    const avg = (values: number[]) =>
      values.reduce((a, b) => a + b, 0) / values.length;

    const d1 = avg(trackRatings.map((r) => r.dimension1));
    const d2 = avg(trackRatings.map((r) => r.dimension2));
    const d3 = avg(trackRatings.map((r) => r.dimension3));
    const d4 = avg(trackRatings.map((r) => r.dimension4));

    // Round once to 1 decimal place so the percentile comparison uses
    // the same precision as stored overallScore values from other tracks.
    const overall = Math.round(((d1 + d2 + d3 + d4) / 4) * 10) / 10;

    // Get track to find context for percentile
    const track = await tx.query.tracks.findFirst({
      where: eq(tracks.id, trackId),
    });

    let percentile: number | null = null;
    if (track?.contextId) {
      // Fetch all already-completed tracks in the same context
      const allCompleted = await tx.query.tracks.findMany({
        where: and(
          eq(tracks.status, "complete"),
          eq(tracks.contextId, track.contextId),
          eq(tracks.isDeleted, false),
        ),
        columns: { overallScore: true },
      });

      const scores = allCompleted
        .map((t) => t.overallScore)
        .filter((s): s is number => s !== null);

      // Include the current track's score in the comparison set so the
      // percentile is computed against all N+1 tracks (not just the N
      // that were already marked "complete"). Without this, the highest-
      // scoring track would always show percentile = 100 (N/N) even
      // though it wasn't compared against itself.
      //
      // NOTE: Percentiles are point-in-time snapshots — they reflect the
      // pool of completed tracks at the moment THIS track finishes. They
      // are NOT retroactively updated when new tracks complete later, so
      // percentiles across tracks are not directly comparable. An early
      // track scored against 5 peers and a later track scored against 50
      // peers may both show "80th percentile" but represent very different
      // rankings. This is an intentional trade-off: recalculating all
      // percentiles on every completion would be expensive and introduce
      // its own race conditions. If live-updated percentiles become a
      // requirement, consider computing them at read time via a SQL
      // window function (PERCENT_RANK) instead.
      scores.push(overall);

      if (scores.length >= 2) {
        // Only compute percentile when there are at least 2 tracks to
        // compare against — a single track has no meaningful ranking.
        //
        // Uses PERCENT_RANK semantics: (count of scores strictly below) / (N - 1).
        // This yields 0 for the lowest-scoring track and 100 for the highest,
        // matching the intuitive meaning of "percentile" and avoiding the
        // confusing edge where the worst track would otherwise show a non-zero
        // percentile (which the display would render as an impressive "TOP" rank).
        const below = scores.filter((s) => s < overall).length;
        percentile = Math.round((below / (scores.length - 1)) * 100);
      }
    }

    await tx
      .update(tracks)
      .set({
        status: "complete",
        overallScore: overall,
        percentile,
      })
      .where(eq(tracks.id, trackId));
  });
}
