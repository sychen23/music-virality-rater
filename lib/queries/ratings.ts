import { db } from "@/lib/db";
import { ratings, aiInsights } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { AIInsight } from "@/lib/services/ai";

export async function getTrackRatings(trackId: string) {
  return db.query.ratings.findMany({
    where: eq(ratings.trackId, trackId),
  });
}

export function computeDimensionAverages(
  trackRatings: { dimension1: number; dimension2: number; dimension3: number; dimension4: number }[]
) {
  if (trackRatings.length === 0) return [0, 0, 0, 0];

  const avg = (values: number[]) =>
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

  return [
    avg(trackRatings.map((r) => r.dimension1)),
    avg(trackRatings.map((r) => r.dimension2)),
    avg(trackRatings.map((r) => r.dimension3)),
    avg(trackRatings.map((r) => r.dimension4)),
  ];
}

export function generateInsights(
  dimensionAverages: number[],
  dimensionNames: string[]
) {
  const insights: { title: string; description: string; variant: "success" | "warning" | "default" }[] = [];

  // Find strongest/weakest dimension
  const maxIdx = dimensionAverages.indexOf(Math.max(...dimensionAverages));
  const minIdx = dimensionAverages.indexOf(Math.min(...dimensionAverages));

  // Guard: bail to generic insights when dimensions are missing or empty
  if (
    maxIdx < 0 ||
    minIdx < 0 ||
    !dimensionNames[maxIdx] ||
    !dimensionNames[minIdx]
  ) {
    return insights;
  }

  insights.push({
    title: `Strongest: ${dimensionNames[maxIdx]}`,
    description: `Your ${dimensionNames[maxIdx].toLowerCase()} scored ${Math.round((dimensionAverages[maxIdx] / 3) * 100)}%. This is your track's standout quality — lean into it in your promotion strategy.`,
    variant: "success",
  });

  if (dimensionAverages[minIdx] < 1.8) {
    insights.push({
      title: `Room to Grow: ${dimensionNames[minIdx]}`,
      description: `${dimensionNames[minIdx]} scored ${Math.round((dimensionAverages[minIdx] / 3) * 100)}%. Consider reworking this aspect — small improvements here could significantly boost your overall virality score.`,
      variant: "warning",
    });
  }

  const overall = dimensionAverages.reduce((a, b) => a + b, 0) / dimensionAverages.length;
  if (overall >= 2.1) {
    insights.push({
      title: "High Potential",
      description: "Your track scores well across all dimensions. It has strong viral potential — focus on distribution and timing for maximum impact.",
      variant: "default",
    });
  } else {
    insights.push({
      title: "Optimization Opportunity",
      description: "Your track has solid foundations. Focus on strengthening your weaker dimensions to unlock its full potential.",
      variant: "default",
    });
  }

  return insights;
}

/**
 * Fetch the latest AI-generated insights for a track.
 * Returns insights from the highest milestone reached, or null if none exist.
 */
export async function getAIInsights(trackId: string): Promise<AIInsight[] | null> {
  const rows = await db.query.aiInsights.findMany({
    where: eq(aiInsights.trackId, trackId),
    orderBy: [desc(aiInsights.milestone)],
    limit: 1,
  });

  if (rows.length === 0) return null;

  try {
    const parsed = JSON.parse(rows[0].insights) as AIInsight[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
