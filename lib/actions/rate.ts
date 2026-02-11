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

    // Prevent self-rating — blocks score inflation and credit farming
    const track = await tx.query.tracks.findFirst({
      where: eq(tracks.id, data.trackId),
      columns: { userId: true },
    });
    if (!track) throw new Error("Track not found");
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

    return {
      updatedTrack,
      creditEarned,
      newProgress: creditEarned ? 0 : updatedProfile.ratingProgress,
    };
  });

  // If track reached vote goal, compute scores (outside transaction
  // since this is a read-heavy idempotent operation)
  if (
    result.updatedTrack &&
    result.updatedTrack.votesReceived >= result.updatedTrack.votesRequested
  ) {
    await computeTrackScores(data.trackId);
  }

  return {
    creditEarned: result.creditEarned,
    newProgress: result.newProgress,
  };
}

async function computeTrackScores(trackId: string) {
  const trackRatings = await db.query.ratings.findMany({
    where: eq(ratings.trackId, trackId),
  });

  if (trackRatings.length === 0) return;

  const avg = (values: number[]) =>
    values.reduce((a, b) => a + b, 0) / values.length;

  const d1 = avg(trackRatings.map((r) => r.dimension1));
  const d2 = avg(trackRatings.map((r) => r.dimension2));
  const d3 = avg(trackRatings.map((r) => r.dimension3));
  const d4 = avg(trackRatings.map((r) => r.dimension4));

  const overall = (d1 + d2 + d3 + d4) / 4;

  // Get track to find context for percentile
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, trackId),
  });

  let percentile = 50;
  if (track?.contextId) {
    // Fetch all already-completed tracks in the same context
    const allCompleted = await db.query.tracks.findMany({
      where: and(
        eq(tracks.status, "complete"),
        eq(tracks.contextId, track.contextId)
      ),
      columns: { overallScore: true },
    });

    const scores = allCompleted
      .map((t) => t.overallScore)
      .filter((s): s is number => s !== null);

    // Include the current track's score in the comparison set so the
    // percentile is computed against all N+1 tracks (not just the N
    // that were already marked "complete").
    scores.push(overall);

    const below = scores.filter((s) => s < overall).length;
    percentile = Math.round((below / scores.length) * 100);
  }

  await db
    .update(tracks)
    .set({
      status: "complete",
      overallScore: Math.round(overall * 10) / 10,
      percentile,
    })
    .where(eq(tracks.id, trackId));
}
