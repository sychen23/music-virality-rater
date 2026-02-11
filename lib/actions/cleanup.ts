import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { del } from "@vercel/blob";

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Delete unconsumed uploads older than 24 hours.
 * Removes both the Vercel Blob file and the database row.
 * Returns the number of cleaned-up uploads.
 */
export async function cleanupOrphanedUploads(): Promise<number> {
  const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);

  const orphans = await db
    .delete(uploads)
    .where(
      and(
        eq(uploads.consumed, false),
        lte(uploads.createdAt, cutoff),
      ),
    )
    .returning({ filename: uploads.filename });

  // Best-effort blob deletion — if a blob is already gone we silently ignore
  const urls = orphans.map(({ filename }) => filename);
  if (urls.length > 0) {
    try {
      await del(urls);
    } catch {
      // Blobs may have already been removed; ignore
    }
  }

  return orphans.length;
}
