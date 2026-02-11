import { db } from "@/lib/db";
import { tracks, ratings } from "@/lib/db/schema";
import { eq, and, ne, lt, sql, asc, notInArray } from "drizzle-orm";

export async function getNextTrackToRate(userId: string) {
  // Get track IDs already rated by this user
  const userRatings = await db.query.ratings.findMany({
    where: eq(ratings.raterId, userId),
    columns: { trackId: true },
  });

  const ratedTrackIds = userRatings.map((r) => r.trackId);

  // Find a track: collecting, not owned by user, not rated by user, not deleted
  const conditions = [
    eq(tracks.status, "collecting"),
    ne(tracks.userId, userId),
    eq(tracks.isDeleted, false),
    lt(tracks.votesReceived, tracks.votesRequested),
  ];

  if (ratedTrackIds.length > 0) {
    conditions.push(notInArray(tracks.id, ratedTrackIds));
  }

  const result = await db.query.tracks.findFirst({
    where: and(...conditions),
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
