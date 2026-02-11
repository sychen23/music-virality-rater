"use server";

import { db } from "@/lib/db";
import { tracks, profiles, creditTransactions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, sql, and, gte } from "drizzle-orm";
import { VOTE_PACKAGES } from "@/lib/constants/packages";
import { getContextById } from "@/lib/constants/contexts";

export async function getUserProfileData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.user.id),
    columns: { credits: true, ratingProgress: true },
  });

  if (!profile) throw new Error("Profile not found");

  return { credits: profile.credits, ratingProgress: profile.ratingProgress };
}

export async function submitForRating(data: {
  trackId: string;
  contextId: string;
  packageIndex: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Validate contextId against the known CONTEXTS list
  if (!getContextById(data.contextId)) {
    throw new Error("Invalid context");
  }

  // Look up package server-side — never trust client-supplied cost/votes
  const votePackage = VOTE_PACKAGES[data.packageIndex];
  if (!votePackage) throw new Error("Invalid vote package");

  const { votes: votesRequested, credits: creditsCost } = votePackage;
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    // Atomically deduct credits if cost > 0
    if (creditsCost > 0) {
      // WHERE credits >= cost acts as an atomic guard against double-spend:
      // if a concurrent request already deducted, this UPDATE matches 0 rows.
      const [updated] = await tx
        .update(profiles)
        .set({ credits: sql`${profiles.credits} - ${creditsCost}` })
        .where(
          and(eq(profiles.id, userId), gte(profiles.credits, creditsCost))
        )
        .returning({ id: profiles.id });

      if (!updated) {
        throw new Error("Insufficient credits");
      }

      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        amount: -creditsCost,
        type: "track_submit",
        referenceId: data.trackId,
      });
    }

    // Update track (only if owned by the authenticated user AND still a draft)
    const [updatedTrack] = await tx
      .update(tracks)
      .set({
        contextId: data.contextId,
        votesRequested,
        status: "collecting",
      })
      .where(
        and(
          eq(tracks.id, data.trackId),
          eq(tracks.userId, userId),
          eq(tracks.status, "draft"),
          eq(tracks.isDeleted, false),
        )
      )
      .returning({ id: tracks.id });

    if (!updatedTrack) {
      throw new Error("Track not found or already submitted");
    }
  });

  return { success: true };
}
