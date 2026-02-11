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

  // Verify the user has enough credits before touching anything, so we can
  // fail fast with a clear message (the atomic deduction below would also
  // catch this, but with a less descriptive error).
  if (creditsCost > 0) {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { credits: true },
    });
    if (!profile || profile.credits < creditsCost) {
      throw new Error("Insufficient credits");
    }
  }

  // Claim the track FIRST: atomically update only if the user owns it, it's
  // still a draft, and not deleted. This must happen before credit deduction
  // so that if the track is invalid / already submitted, no credits are lost.
  const [updatedTrack] = await db
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

  // Now deduct credits. The track is already claimed, so if this fails the
  // worst case is a track in "collecting" with no payment — we roll it back.
  if (creditsCost > 0) {
    const [deducted] = await db
      .update(profiles)
      .set({ credits: sql`${profiles.credits} - ${creditsCost}` })
      .where(
        and(eq(profiles.id, userId), gte(profiles.credits, creditsCost))
      )
      .returning({ id: profiles.id });

    if (!deducted) {
      // Roll back the track claim — revert to draft so the user can retry
      await db
        .update(tracks)
        .set({ status: "draft", contextId: null, votesRequested: 0 })
        .where(eq(tracks.id, data.trackId));
      throw new Error("Insufficient credits");
    }

    // Record credit transaction
    await db.insert(creditTransactions).values({
      userId,
      amount: -creditsCost,
      type: "track_submit",
      referenceId: data.trackId,
    });
  }

  return { success: true };
}
