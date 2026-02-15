import { db } from "@/lib/db";
import { uploads, tracks } from "@/lib/db/schema";
import { and, eq, lte, inArray } from "drizzle-orm";
import { storageDelete } from "@/lib/storage";

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DRAFT_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Delete unconsumed uploads older than 24 hours.
 * Removes files from storage first, then the database rows.
 * Returns the number of cleaned-up uploads.
 */
export async function cleanupOrphanedUploads(): Promise<number> {
  const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);

  // 1. Find orphaned uploads (don't delete yet — we need the rows as a retry
  //    record in case storage deletion fails).
  const orphans = await db.query.uploads.findMany({
    where: and(
      eq(uploads.consumed, false),
      lte(uploads.createdAt, cutoff),
    ),
    columns: { id: true, filename: true },
  });

  if (orphans.length === 0) return 0;

  const urls = orphans.map(({ filename }) => filename);

  // 2. Delete files first. If this fails, the DB rows survive and the next
  //    cleanup run will retry. Log URLs on failure for manual cleanup.
  try {
    await storageDelete(urls);
  } catch (error) {
    console.error(
      "[cleanup] Failed to delete files — DB rows preserved for retry. URLs:",
      urls,
      error,
    );
    // Don't delete DB rows — they serve as the record for the next retry.
    return 0;
  }

  // 3. Files deleted successfully — now remove the DB rows.
  const ids = orphans.map(({ id }) => id);
  await db.delete(uploads).where(inArray(uploads.id, ids));

  return orphans.length;
}

/**
 * Delete draft tracks older than 24 hours that were never submitted.
 * These accumulate when credit deduction fails in createAndSubmitTrack.
 * Removes blob files from storage first, then the database rows.
 * Returns the number of cleaned-up drafts.
 */
export async function cleanupOrphanedDrafts(): Promise<number> {
  const cutoff = new Date(Date.now() - DRAFT_ORPHAN_AGE_MS);

  // 1. Find orphaned drafts — old, still "draft", not soft-deleted.
  const orphans = await db
    .select({ id: tracks.id, audioFilename: tracks.audioFilename })
    .from(tracks)
    .where(
      and(
        eq(tracks.status, "draft"),
        eq(tracks.isDeleted, false),
        lte(tracks.createdAt, cutoff),
      ),
    );

  if (orphans.length === 0) return 0;

  const urls = orphans.map(({ audioFilename }) => audioFilename);

  // 2. Delete blob files first. If this fails, rows survive for next run.
  try {
    await storageDelete(urls);
  } catch (error) {
    console.error(
      "[cleanup] Failed to delete draft audio files — rows preserved for retry. URLs:",
      urls,
      error,
    );
    return 0;
  }

  // 3. Files deleted — hard-delete the track rows.
  const ids = orphans.map(({ id }) => id);
  await db.delete(tracks).where(inArray(tracks.id, ids));

  return orphans.length;
}
