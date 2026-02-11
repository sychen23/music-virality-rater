import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Delete unconsumed uploads older than 24 hours.
 * Removes both the physical file and the database row.
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

  // Best-effort file deletion — if a file is already gone we silently ignore
  const uploadDir = join(process.cwd(), "public", "uploads");
  await Promise.all(
    orphans.map(async ({ filename }) => {
      try {
        await unlink(join(uploadDir, filename));
      } catch {
        // File may have already been removed; ignore
      }
    }),
  );

  return orphans.length;
}
