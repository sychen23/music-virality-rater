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

  // Wrap credit deduction, credit transaction record, and track status update
  // in a single transaction so they all succeed or all roll back atomically.
  // The neon-http driver batches these into one HTTP request.
  await db.transaction(async (tx) => {
    // Deduct credits first if cost > 0.
    // WHERE credits >= cost is an atomic guard against double-spend.
    if (creditsCost > 0) {
      const [deducted] = await tx
        .update(profiles)
        .set({ credits: sql`${profiles.credits} - ${creditsCost}` })
        .where(
          and(eq(profiles.id, userId), gte(profiles.credits, creditsCost))
        )
        .returning({ id: profiles.id });

      if (!deducted) {
        throw new Error("Insufficient credits");
      }

      // Record credit transaction
      await tx.insert(creditTransactions).values({
        userId,
        amount: -creditsCost,
        type: "track_submit",
        referenceId: data.trackId,
      });
    }

    // Update track (only if owned by the authenticated user AND still a draft).
    // If this fails (0 rows), the entire transaction rolls back — including
    // the credit deduction above.
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
