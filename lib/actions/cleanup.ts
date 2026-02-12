import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { and, eq, lte, inArray } from "drizzle-orm";
import { del } from "@vercel/blob";

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Delete unconsumed uploads older than 24 hours.
 * Removes the Vercel Blob files first, then the database rows.
 * Returns the number of cleaned-up uploads.
 */
export async function cleanupOrphanedUploads(): Promise<number> {
  const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);

  // 1. Find orphaned uploads (don't delete yet — we need the rows as a retry
  //    record in case blob deletion fails).
  const orphans = await db.query.uploads.findMany({
    where: and(
      eq(uploads.consumed, false),
      lte(uploads.createdAt, cutoff),
    ),
    columns: { id: true, filename: true },
  });

  if (orphans.length === 0) return 0;

  const urls = orphans.map(({ filename }) => filename);

  // 2. Delete blobs first. If this fails, the DB rows survive and the next
  //    cleanup run will retry. Log URLs on failure for manual cleanup.
  try {
    await del(urls);
  } catch (error) {
    console.error(
      "[cleanup] Failed to delete blobs — DB rows preserved for retry. URLs:",
      urls,
      error,
    );
    // Don't delete DB rows — they serve as the record for the next retry.
    return 0;
  }

  // 3. Blobs deleted successfully — now remove the DB rows.
  const ids = orphans.map(({ id }) => id);
  await db.delete(uploads).where(inArray(uploads.id, ids));

  return orphans.length;
}
