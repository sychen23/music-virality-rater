import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Derive a base handle from a display name (or fall back to a user-id prefix).
 * Strips whitespace, lowercases, and removes non-alphanumeric characters.
 */
function baseHandle(name: string | null | undefined, userId: string): string {
  if (name) {
    const cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleaned.length > 0) return cleaned;
  }
  return userId.slice(0, 8);
}

/**
 * Generate a unique handle.  Starts with the base handle and, on collision,
 * appends incrementing random-digit suffixes until a free one is found.
 *
 * Uniqueness is also enforced at the DB level via a UNIQUE constraint on
 * profiles.handle, so callers still need to handle the (rare) race-condition
 * error from a concurrent insert.
 */
export async function generateUniqueHandle(
  name: string | null | undefined,
  userId: string,
): Promise<string> {
  const base = baseHandle(name, userId);
  let candidate = base;

  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.handle, candidate),
      columns: { id: true },
    });

    if (!existing) return candidate;

    // Append random 3-digit suffix to avoid predictable enumeration
    const suffix = Math.floor(Math.random() * 900 + 100); // 100–999
    candidate = `${base}${suffix}`;
  }

  // Extremely unlikely: 10 collisions in a row. Fall back to user-id prefix.
  return `${base}${userId.slice(0, 6)}`;
}
