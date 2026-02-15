import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { eq, and, ne, lt, sql, asc, desc, isNotNull } from "drizzle-orm";

export async function getNextTrackToRate(userId: string) {
  // Single query with NOT EXISTS subquery — the "not already rated"
  // filter runs entirely in Postgres instead of loading the user's
  // full rating history into Node.js memory and building a large
  // NOT IN (...) clause.
  const result = await db.query.tracks.findFirst({
    where: and(
      eq(tracks.status, "collecting"),
      ne(tracks.userId, userId),
      eq(tracks.isDeleted, false),
      lt(tracks.votesReceived, tracks.votesRequested),
      sql`NOT EXISTS (
        SELECT 1 FROM ratings
        WHERE ratings.track_id = ${tracks.id}
          AND ratings.rater_id = ${userId}
      )`,
    ),
    orderBy: [asc(tracks.votesReceived)],
  });

  return result ?? null;
}

export async function getTrackById(trackId: string) {
  return db.query.tracks.findFirst({
    where: eq(tracks.id, trackId),
  });
}

export async function getTrackByShareToken(shareToken: string) {
  return db.query.tracks.findFirst({
    where: and(eq(tracks.shareToken, shareToken), eq(tracks.isDeleted, false)),
  });
}

export async function getTopTracks(limit = 10) {
  return db
    .select({
      id: tracks.id,
      title: tracks.title,
      overallScore: tracks.overallScore,
      contextId: tracks.contextId,
      votesReceived: tracks.votesReceived,
    })
    .from(tracks)
    .where(
      and(
        eq(tracks.status, "complete"),
        eq(tracks.isDeleted, false),
        isNotNull(tracks.overallScore)
      )
    )
    .orderBy(desc(tracks.overallScore))
    .limit(limit);
}
