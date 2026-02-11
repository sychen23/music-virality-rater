import { db } from "@/lib/db";
import { profiles, tracks } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { generateUniqueHandle } from "@/lib/handle";

export async function getProfile(userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
}

export async function getTracksByUser(userId: string, page: number = 1, perPage: number = 3) {
  const offset = (page - 1) * perPage;

  const [userTracks, [{ total }]] = await Promise.all([
    db.query.tracks.findMany({
      where: and(eq(tracks.userId, userId), eq(tracks.isDeleted, false)),
      orderBy: [desc(tracks.createdAt)],
      limit: perPage,
      offset,
    }),
    db
      .select({ total: count() })
      .from(tracks)
      .where(and(eq(tracks.userId, userId), eq(tracks.isDeleted, false))),
  ]);

  return {
    tracks: userTracks,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function ensureProfile(userId: string, name?: string | null) {
  // Check if profile already exists before generating a handle
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { id: true },
  });

  if (!existing) {
    const handle = await generateUniqueHandle(name, userId);
    await db
      .insert(profiles)
      .values({
        id: userId,
        handle,
        credits: 20,
      })
      .onConflictDoNothing({ target: profiles.id });
  }

  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
}
