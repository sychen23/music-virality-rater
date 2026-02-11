import { db } from "@/lib/db";
import { ratings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    description: `Your ${dimensionNames[maxIdx].toLowerCase()} scored ${dimensionAverages[maxIdx].toFixed(1)}/10. This is your track's standout quality — lean into it in your promotion strategy.`,
    variant: "success",
  });

  if (dimensionAverages[minIdx] < 6) {
    insights.push({
      title: `Room to Grow: ${dimensionNames[minIdx]}`,
      description: `${dimensionNames[minIdx]} scored ${dimensionAverages[minIdx].toFixed(1)}/10. Consider reworking this aspect — small improvements here could significantly boost your overall virality score.`,
      variant: "warning",
    });
  }

  const overall = dimensionAverages.reduce((a, b) => a + b, 0) / dimensionAverages.length;
  if (overall >= 7) {
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
