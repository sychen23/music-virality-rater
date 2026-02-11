import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a PERCENT_RANK-style percentile (0 = worst, 100 = best) into a
 * human-readable ranking label.
 *
 * Edge-case handling:
 *  - percentile 100 → "Top 1%"  (not "Top 0%")
 *  - percentile  95 → "Top 5%"
 *  - percentile  50 → "Top 50%"
 *  - percentile  49 → "Better than 49%"
 *  - percentile   0 → "Bottom of tracks tested"
 *
 * An optional `suffix` (default: "of tracks tested") is appended except for
 * the bottom-of-pool special case.
 */
export function formatPercentile(
  percentile: number,
  suffix = "of tracks tested",
): string {
  if (percentile <= 0) return `Bottom ${suffix}`;
  if (percentile >= 50) {
    const top = Math.max(1, 100 - percentile); // clamp so 100 → "Top 1%"
    return `Top ${top}% ${suffix}`;
  }
  return `Better than ${percentile}% ${suffix}`;
}
