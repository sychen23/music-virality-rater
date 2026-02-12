"use server";

import { db } from "@/lib/db";
import { tracks, profiles, uploads } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ensureProfile } from "@/lib/queries/profiles";

/** Validates that a string is a Vercel Blob URL pointing to an audio upload */
function isValidBlobUrl(url: string): boolean {
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

export async function createTrack(data: {
  title: string;
  audioFilename: string;
  duration: number;
  genreTags: string[];
  snippetStart: number;
  snippetEnd: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // --- Validate inputs ---

  // 1. Title: must be a non-empty string with a reasonable length limit
  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Title is required");
  }
  if (data.title.trim().length > 200) {
    throw new Error("Title must be 200 characters or fewer");
  }

  // 2. Genre tags: at most 5 tags, each a non-empty string of at most 50 chars
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

  // 3. URL check: must be a valid Vercel Blob URL produced by /api/upload
  if (!isValidBlobUrl(data.audioFilename)) {
    throw new Error("Invalid audio file URL");
  }

  // 4. Validate duration is a positive finite number
  if (!Number.isFinite(data.duration) || data.duration <= 0) {
    throw new Error("Invalid duration");
  }

  // 5. Validate snippet bounds are within the track and form a valid range
  const { snippetStart, snippetEnd, duration } = data;
  if (
    !Number.isFinite(snippetStart) ||
    !Number.isFinite(snippetEnd) ||
    snippetStart < 0 ||
    snippetEnd > duration ||
    snippetEnd <= snippetStart
  ) {
    throw new Error(
      "Invalid snippet bounds. Start must be >= 0, end must be <= duration, and end must be > start."
    );
  }

  const snippetDuration = snippetEnd - snippetStart;
  if (snippetDuration < 15 || snippetDuration > 30) {
    throw new Error("Snippet must be between 15 and 30 seconds long.");
  }

  // Ensure profile exists (outside transaction since it uses onConflictDoNothing
  // and has no ordering dependency with the transactional block below)
  await ensureProfile(userId, session.user.name);

  const shareToken = randomBytes(8).toString("hex");

  // Wrap the upload claim, track insert, and counter update in a transaction
  // so they all succeed or all fail atomically. The neon-http driver batches
  // the SQL into a single HTTP request for transaction support.
  const track = await db.transaction(async (tx) => {
    // Atomically claim the upload: UPDATE ... WHERE consumed = false ensures
    // only one concurrent caller can succeed (the other matches 0 rows).
    const [claimed] = await tx
      .update(uploads)
      .set({ consumed: true })
      .where(
        and(
          eq(uploads.filename, data.audioFilename),
          eq(uploads.userId, userId),
          eq(uploads.consumed, false),
        )
      )
      .returning({ id: uploads.id });

    if (!claimed) {
      throw new Error(
        "Audio file not found. Please upload the file before creating a track.",
      );
    }

    const [newTrack] = await tx
      .insert(tracks)
      .values({
        userId,
        title: data.title,
        audioFilename: data.audioFilename,
        duration: data.duration,
        genreTags: data.genreTags,
        snippetStart: data.snippetStart,
        snippetEnd: data.snippetEnd,
        shareToken,
        status: "draft",
      })
      .returning();

    // Increment tracks_uploaded
    await tx
      .update(profiles)
      .set({ tracksUploaded: sql`${profiles.tracksUploaded} + 1` })
      .where(eq(profiles.id, userId));

    return newTrack;
  });

  return track;
}
