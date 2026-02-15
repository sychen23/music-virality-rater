"use server";

import { db } from "@/lib/db";
import {
  tracks,
  profiles,
  uploads,
  creditTransactions,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ensureProfile } from "@/lib/queries/profiles";
import { VOTE_PACKAGES } from "@/lib/constants/packages";
import { getContextById } from "@/lib/constants/contexts";
import { PRODUCTION_STAGES } from "@/lib/constants/production-stages";

/** Validates that a string is a valid audio upload path (local or Vercel Blob) */
function isValidAudioUrl(url: string): boolean {
  // Local uploads: /uploads/{timestamp}-{random}.{ext}
  if (/^\/uploads\/\d+-[a-z0-9]+\.(mp3|wav|m4a)$/i.test(url)) {
    return true;
  }
  // Vercel Blob URLs
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
      /\/uploads\/\d+-[a-z0-9]+\.(mp3|wav|m4a)$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

const VALID_STAGE_IDS = new Set(PRODUCTION_STAGES.map((s) => s.id));

/**
 * Validates common track input fields shared between createTrack and
 * createAndSubmitTrack.
 */
function validateTrackInputs(data: {
  title: string;
  audioFilename: string;
  duration: number;
  genreTags: string[];
  snippetStart: number;
  snippetEnd: number;
}) {
  // 1. Title
  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Title is required");
  }
  if (data.title.trim().length > 200) {
    throw new Error("Title must be 200 characters or fewer");
  }

  // 2. Genre tags
  if (!Array.isArray(data.genreTags)) {
    throw new Error("Genre tags must be an array");
  }
  if (data.genreTags.length > 5) {
    throw new Error("You can select up to 5 genre tags");
  }
  for (const tag of data.genreTags) {
    if (typeof tag !== "string" || !tag.trim()) {
      throw new Error("Each genre tag must be a non-empty string");
    }
    if (tag.trim().length > 50) {
      throw new Error("Each genre tag must be 50 characters or fewer");
    }
  }

  // 3. Audio URL
  if (!isValidAudioUrl(data.audioFilename)) {
    throw new Error("Invalid audio file URL");
  }

  // 4. Duration
  if (!Number.isFinite(data.duration) || data.duration <= 0) {
    throw new Error("Invalid duration");
  }

  // 5. Snippet bounds
  const { snippetStart, snippetEnd, duration } = data;
  if (
    !Number.isFinite(snippetStart) ||
    !Number.isFinite(snippetEnd) ||
    snippetStart < 0 ||
    snippetEnd > duration ||
    snippetEnd <= snippetStart
  ) {
    throw new Error(
      "Invalid snippet bounds. Start must be >= 0, end must be <= duration, and end must be > start.",
    );
  }

  const snippetDuration = snippetEnd - snippetStart;
  if (snippetDuration < 15 || snippetDuration > 30) {
    throw new Error("Snippet must be between 15 and 30 seconds long.");
  }
}

/**
 * Unified action: uploads, sets context, production stage, and deducts credits
 * in a single call. The track is inserted as "draft" first, then atomically
 * transitioned to "collecting" only after credit deduction succeeds. This
 * ensures the track is never visible to raters until payment is secured.
 */
export async function createAndSubmitTrack(data: {
  title: string;
  audioFilename: string;
  duration: number;
  genreTags: string[];
  snippetStart: number;
  snippetEnd: number;
  productionStage: string;
  contextId: string;
  packageIndex: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // --- Validate all inputs ---

  validateTrackInputs(data);

  // Production stage
  if (!VALID_STAGE_IDS.has(data.productionStage)) {
    throw new Error("Invalid production stage");
  }

  // Context
  if (!getContextById(data.contextId)) {
    throw new Error("Invalid context");
  }

  // Vote package
  const votePackage = VOTE_PACKAGES[data.packageIndex];
  if (!votePackage) throw new Error("Invalid vote package");

  const { votes: votesRequested, credits: creditsCost } = votePackage;

  // --- Execute ---

  await ensureProfile(userId, session.user.name);

  const shareToken = randomBytes(8).toString("hex");

  // 1. Atomically claim the upload
  const [claimed] = await db
    .update(uploads)
    .set({ consumed: true })
    .where(
      and(
        eq(uploads.filename, data.audioFilename),
        eq(uploads.userId, userId),
        eq(uploads.consumed, false),
      ),
    )
    .returning({ id: uploads.id });

  if (!claimed) {
    throw new Error(
      "Audio file not found. Please upload the file before creating a track.",
    );
  }

  // 2. Insert track as draft — not yet visible to raters
  const [track] = await db
    .insert(tracks)
    .values({
      userId,
      title: data.title,
      audioFilename: data.audioFilename,
      duration: data.duration,
      genreTags: data.genreTags,
      snippetStart: data.snippetStart,
      snippetEnd: data.snippetEnd,
      productionStage: data.productionStage,
      shareToken,
      status: "draft",
    })
    .returning();

  // 3. Atomically deduct credits
  if (creditsCost > 0) {
    const [deducted] = await db
      .update(profiles)
      .set({ credits: sql`${profiles.credits} - ${creditsCost}` })
      .where(and(eq(profiles.id, userId), gte(profiles.credits, creditsCost)))
      .returning({ id: profiles.id });

    if (!deducted) {
      // Credit deduction failed — track stays as harmless draft.
      // Unclaim the upload so it can be reused.
      await db
        .update(uploads)
        .set({ consumed: false })
        .where(eq(uploads.id, claimed.id));
      throw new Error("Insufficient credits");
    }

    // Log credit transaction
    await db.insert(creditTransactions).values({
      userId,
      amount: -creditsCost,
      type: "track_submit",
      referenceId: track.id,
    });
  }

  // 4. Atomically transition to "collecting" — only if still a draft.
  // This makes the track visible to raters only after credits are secured.
  const [activated] = await db
    .update(tracks)
    .set({
      status: "collecting",
      contextId: data.contextId,
      votesRequested,
    })
    .where(and(eq(tracks.id, track.id), eq(tracks.status, "draft")))
    .returning();

  if (!activated) {
    // Shouldn't happen — compensate by refunding credits
    if (creditsCost > 0) {
      await db
        .update(profiles)
        .set({ credits: sql`${profiles.credits} + ${creditsCost}` })
        .where(eq(profiles.id, userId));
      await db.insert(creditTransactions).values({
        userId,
        amount: creditsCost,
        type: "track_submit_refund",
        referenceId: track.id,
      });
    }
    throw new Error("Failed to activate track");
  }

  // 5. Increment tracks_uploaded
  await db
    .update(profiles)
    .set({ tracksUploaded: sql`${profiles.tracksUploaded} + 1` })
    .where(eq(profiles.id, userId));

  return activated;
}
