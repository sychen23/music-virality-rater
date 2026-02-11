"use server";

import { db } from "@/lib/db";
import { tracks } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, ne } from "drizzle-orm";

export async function deleteTrack(trackId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const track = await db.query.tracks.findFirst({
    where: and(eq(tracks.id, trackId), eq(tracks.userId, session.user.id)),
  });

  if (!track) throw new Error("Track not found");

  if (track.status === "collecting") {
    throw new Error(
      "Cannot delete a track that is currently collecting ratings. Wait for collection to complete."
    );
  }

  // Re-assert ownership and non-collecting status in the UPDATE itself
  // to close the TOCTOU window between the SELECT above and this write.
  // If a concurrent submitForRating changed status to "collecting" after
  // our SELECT, the WHERE won't match and no rows are updated.
  const [updated] = await db
    .update(tracks)
    .set({ isDeleted: true })
    .where(
      and(
        eq(tracks.id, trackId),
        eq(tracks.userId, session.user.id),
        ne(tracks.status, "collecting")
      )
    )
    .returning({ id: tracks.id });

  if (!updated) {
    throw new Error(
      "Cannot delete a track that is currently collecting ratings. Wait for collection to complete."
    );
  }

  return { success: true };
}
