"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { tracks, ratings, aiInsights } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getContextById } from "@/lib/constants/contexts";
import { computeDimensionAverages } from "@/lib/queries/ratings";

const aiInsightSchema = z.object({
  emoji: z.string().describe("A single emoji icon representing this insight"),
  category: z
    .string()
    .describe(
      "Short uppercase category label, e.g. TARGET AUDIENCE, SIMILAR TRACKS, SUGGESTION, STRENGTH, OPPORTUNITY"
    ),
  title: z.string().describe("Brief descriptive title for the insight"),
  description: z
    .string()
    .describe(
      "2-3 sentence actionable insight with specific, data-backed observations"
    ),
  variant: z
    .enum(["success", "warning", "default"])
    .describe(
      "success = positive finding, warning = area to improve, default = neutral analysis"
    ),
});

export type AIInsight = z.infer<typeof aiInsightSchema>;

/**
 * Generate AI-powered analytical insights for a track at a vote milestone.
 * Called as fire-and-forget when votesReceived hits 20, 50, or 100.
 */
export async function generateAIInsights(
  trackId: string,
  milestone: number
): Promise<void> {
  // Guard: only generate for valid milestones
  if (![20, 50, 100].includes(milestone)) return;

  // Check if insights already exist for this track + milestone (idempotency)
  const existing = await db.query.aiInsights.findFirst({
    where: and(
      eq(aiInsights.trackId, trackId),
      eq(aiInsights.milestone, milestone)
    ),
    columns: { id: true },
  });
  if (existing) return;

  // Fetch track details
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, trackId),
  });
  if (!track) return;

  // Fetch context and dimensions
  const context = track.contextId ? getContextById(track.contextId) : null;
  const dimensions = context?.dimensions ?? [];
  const dimensionNames = dimensions.map((d) => d.name);

  // Fetch all ratings for this track
  const trackRatings = await db.query.ratings.findMany({
    where: eq(ratings.trackId, trackId),
  });
  if (trackRatings.length === 0) return;

  // Compute dimension averages
  const dimensionAverages = computeDimensionAverages(trackRatings);

  // Collect text feedback (filter out null/empty)
  const feedbackList = trackRatings
    .map((r) => r.feedback)
    .filter((f): f is string => !!f && f.trim().length > 0);

  // Build the dimension scores summary
  const dimensionSummary = dimensionNames
    .map((name, i) => `  - ${name}: ${dimensionAverages[i].toFixed(1)}/10`)
    .join("\n");

  const overallScore =
    dimensionAverages.reduce((a, b) => a + b, 0) / dimensionAverages.length;

  // Determine how many insights to generate based on milestone
  const insightCount = milestone === 20 ? 3 : milestone === 50 ? 4 : 5;

  const feedbackSection =
    feedbackList.length > 0
      ? `\n\nText feedback from raters (${feedbackList.length} responses):\n${feedbackList
          .slice(0, 50) // Cap at 50 to avoid token overflow
          .map((f, i) => `  ${i + 1}. "${f}"`)
          .join("\n")}`
      : "\n\nNo text feedback was provided by raters.";

  const prompt = `You are an expert music industry analyst for SoundCheck, a music virality rating platform. Analyze this track's rating data and provide actionable insights for the artist.

Track: "${track.title}"
Genre tags: ${track.genreTags?.length ? track.genreTags.join(", ") : "none specified"}
Context: ${context?.name ?? "unknown"} — ${context?.description ?? ""}
Votes received: ${milestone}
Overall score: ${overallScore.toFixed(1)}/10

Dimension scores (rated by ${milestone} listeners):
${dimensionSummary}
${feedbackSection}

Generate exactly ${insightCount} analytical insights. Each insight should be specific to this track's data — avoid generic advice. Consider:
- TARGET AUDIENCE: Which demographics or platforms this track resonates with based on the scores
- SIMILAR TRACKS: What the audio profile and scores suggest about comparable successful tracks
- SUGGESTION: Concrete, actionable improvements based on the weakest dimensions
- STRENGTH: What's working well and how to leverage it
- OPPORTUNITY: Untapped potential based on the score patterns

Make each insight data-driven, referencing specific scores and patterns. Be direct and practical.`;

  try {
    const { output } = await generateText({
      model: anthropic("claude-opus-4-6"),
      output: Output.array({
        element: aiInsightSchema,
      }),
      prompt,
    });

    if (!output || output.length === 0) return;

    // Store insights in the database
    await db
      .insert(aiInsights)
      .values({
        trackId,
        milestone,
        insights: JSON.stringify(output),
      })
      .onConflictDoNothing(); // idempotency guard
  } catch (error) {
    console.error(
      `[AI Insights] Failed to generate for track ${trackId} at milestone ${milestone}:`,
      error
    );
  }
}
