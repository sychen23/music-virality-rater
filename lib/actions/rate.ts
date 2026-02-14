"use server";

import { db } from "@/lib/db";
import { ratings, tracks, profiles, creditTransactions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, sql, and } from "drizzle-orm";
import { generateAIInsights } from "@/lib/services/ai";

// --- Constants ---
const MIN_SCORE = 0;
const MAX_SCORE = 3;
const MAX_FEEDBACK_LENGTH = 2000;
const MIN_CREDIT_PER_RATING = 1;
const CREDIT_DURATION_DIVISOR = 10; // creditsEarned = max(1, round(clipDuration / 10))
const AI_MILESTONES = [10, 20, 50] as const;
const SCORE_DECIMAL_PLACES = 10; // multiply/divide factor for rounding to 1 decimal
const MIN_TRACKS_FOR_PERCENTILE = 2;

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

  // Validate dimension scores are integers between 0 and 3
  const dims = [data.dimension1, data.dimension2, data.dimension3, data.dimension4];
  if (dims.some((d) => !Number.isInteger(d) || d < MIN_SCORE || d > MAX_SCORE)) {
    throw new Error(`Invalid rating values. Each dimension must be an integer between ${MIN_SCORE} and ${MAX_SCORE}.`);
  }

  // Validate feedback if provided
  if (data.feedback !== undefined && data.feedback !== null) {
    if (typeof data.feedback !== "string" || data.feedback.length > MAX_FEEDBACK_LENGTH) {
      throw new Error(`Feedback must be a string of ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
    }
  }

  const raterId = session.user.id;

  // Prevent duplicate ratings — check + unique constraint as belt-and-suspenders
  const existing = await db.query.ratings.findFirst({
    where: and(eq(ratings.trackId, data.trackId), eq(ratings.raterId, raterId)),
    columns: { id: true },
  });
  if (existing) throw new Error("You have already rated this track");

  // Fetch track and verify it exists, is actively collecting, and isn't owned by the rater
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, data.trackId),
    columns: { userId: true, status: true, snippetStart: true, snippetEnd: true },
  });
  if (!track) throw new Error("Track not found");
  if (track.status !== "collecting") {
    throw new Error("This track is not currently accepting ratings");
  }
  if (track.userId === raterId) throw new Error("You cannot rate your own track");

  // Insert rating, increment counters, and award credits as sequential queries.
  // Each step uses atomic WHERE guards to prevent race conditions.
  // (The neon-http driver does not support transactions.)

  // Create rating (unique constraint on trackId+raterId prevents duplicates)
  await db.insert(ratings).values({
    trackId: data.trackId,
    raterId,
    dimension1: data.dimension1,
    dimension2: data.dimension2,
    dimension3: data.dimension3,
    dimension4: data.dimension4,
    feedback: data.feedback || null,
  });

  // Increment votes_received on track
  const [updatedTrack] = await db
    .update(tracks)
    .set({ votesReceived: sql`${tracks.votesReceived} + 1` })
    .where(eq(tracks.id, data.trackId))
    .returning();

  // Fire-and-forget AI insight generation at vote milestones.
  // Only triggers if the vote package includes that many votes.
  if (
    updatedTrack &&
    (AI_MILESTONES as readonly number[]).includes(updatedTrack.votesReceived) &&
    updatedTrack.votesReceived <= updatedTrack.votesRequested
  ) {
    generateAIInsights(data.trackId, updatedTrack.votesReceived).catch(
      (err) => console.error("[AI Insights] Background generation failed:", err)
    );
  }

  // Compute credits earned based on clip duration
  const clipDuration = (track.snippetEnd ?? 0) - (track.snippetStart ?? 0);
  const creditsEarned = Math.max(MIN_CREDIT_PER_RATING, Math.round(clipDuration / CREDIT_DURATION_DIVISOR));

  // Increment rater stats and award credits
  const [updatedProfile] = await db
    .update(profiles)
    .set({
      tracksRated: sql`${profiles.tracksRated} + 1`,
      credits: sql`${profiles.credits} + ${creditsEarned}`,
    })
    .where(eq(profiles.id, raterId))
    .returning();

  if (!updatedProfile) {
    throw new Error("Rater profile not found");
  }

  // Log credit transaction
  await db.insert(creditTransactions).values({
    userId: raterId,
    amount: creditsEarned,
    type: "rating_bonus",
  });

  const result = {
    updatedTrack,
    creditsEarned,
  };

  // If track reached vote goal, compute scores.
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
    creditsEarned: result.creditsEarned,
  };
}

async function computeTrackScores(trackId: string) {
  // Check status first: if another caller already completed this track, skip.
  const current = await db.query.tracks.findFirst({
    where: eq(tracks.id, trackId),
    columns: { status: true },
  });
  if (current?.status === "complete") return;

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

  // Round once to 1 decimal place so the percentile comparison uses
  // the same precision as stored overallScore values from other tracks.
  const overall = Math.round(((d1 + d2 + d3 + d4) / 4) * SCORE_DECIMAL_PLACES) / SCORE_DECIMAL_PLACES;

  // Get track to find context for percentile
  const trackData = await db.query.tracks.findFirst({
    where: eq(tracks.id, trackId),
  });

  let percentile: number | null = null;
  if (trackData?.contextId) {
    // Fetch all already-completed tracks in the same context
    const allCompleted = await db.query.tracks.findMany({
      where: and(
        eq(tracks.status, "complete"),
        eq(tracks.contextId, trackData.contextId),
        eq(tracks.isDeleted, false),
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

    if (scores.length >= MIN_TRACKS_FOR_PERCENTILE) {
      const below = scores.filter((s) => s < overall).length;
      percentile = Math.round((below / (scores.length - 1)) * 100);
    }
  }

  // Atomically update only if still "collecting" — guards against
  // concurrent callers both computing scores for the same track.
  await db
    .update(tracks)
    .set({
      status: "complete",
      overallScore: overall,
      percentile,
    })
    .where(
      and(
        eq(tracks.id, trackId),
        eq(tracks.status, "collecting"),
      )
    );
}
