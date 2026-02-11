import { db } from "@/lib/db";
import { profiles, tracks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getProfile(userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
}

export async function getTracksByUser(userId: string, page: number = 1, perPage: number = 3) {
  const offset = (page - 1) * perPage;

  const userTracks = await db.query.tracks.findMany({
    where: and(eq(tracks.userId, userId), eq(tracks.isDeleted, false)),
    orderBy: [desc(tracks.createdAt)],
    limit: perPage,
    offset,
  });

  const allTracks = await db.query.tracks.findMany({
    where: and(eq(tracks.userId, userId), eq(tracks.isDeleted, false)),
    columns: { id: true },
  });

  return {
    tracks: userTracks,
    total: allTracks.length,
    page,
    perPage,
    totalPages: Math.ceil(allTracks.length / perPage),
  };
}

export async function ensureProfile(userId: string, name?: string | null) {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (!existing) {
    await db.insert(profiles).values({
      id: userId,
      handle: name?.toLowerCase().replace(/\s+/g, "") || userId.slice(0, 8),
      credits: 20,
    });

    return db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    });
  }

  return existing;
}
