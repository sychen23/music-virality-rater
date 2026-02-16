import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

export const snippetSuggestionSchema = z.object({
  startSeconds: z
    .number()
    .describe("Start time in seconds for the suggested snippet"),
  endSeconds: z
    .number()
    .describe("End time in seconds for the suggested snippet"),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of why this section was chosen (1-2 sentences)"
    ),
});

export type SnippetSuggestion = z.infer<typeof snippetSuggestionSchema>;

export async function suggestSnippet(
  waveformBars: number[],
  duration: number
): Promise<SnippetSuggestion> {
  const barsString = waveformBars.map((v) => v.toFixed(2)).join(", ");

  const prompt = `You are an audio analysis assistant. Given a waveform energy profile represented as ${waveformBars.length} normalized amplitude bars (0.00 to 1.00) spanning a ${duration.toFixed(1)}-second audio track, find the best 15-30 second snippet for a music preview.

Waveform bars (each represents ~${(duration / waveformBars.length).toFixed(2)}s):
[${barsString}]

Find the most engaging section by looking for:
- High energy peaks and dynamic variation (not flat/quiet sections)
- A natural-sounding start point (prefer slight ramps over cutting into peaks)
- Avoid dead spots, intros with silence, and fade-outs at the end

Constraints:
- startSeconds must be >= 0
- endSeconds must be <= ${duration.toFixed(1)}
- The snippet must be between 15 and 30 seconds long
- Prefer ~25-30 seconds when there's a strong section that long
- Round to 1 decimal place

Return the optimal snippet window.`;

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    output: Output.object({
      schema: snippetSuggestionSchema,
    }),
    prompt,
  });

  if (!output) {
    throw new Error("Failed to generate snippet suggestion");
  }

  // Clamp to valid bounds
  const start = Math.max(0, Math.round(output.startSeconds * 10) / 10);
  const end = Math.min(duration, Math.round(output.endSeconds * 10) / 10);
  const clampedDuration = end - start;

  // If the suggestion is out of range, fall back to a sensible default
  if (clampedDuration < 15 || clampedDuration > 30) {
    const fallbackEnd = Math.min(start + 30, duration);
    const fallbackStart = Math.max(fallbackEnd - 30, 0);
    return {
      startSeconds: Math.round(fallbackStart * 10) / 10,
      endSeconds: Math.round(fallbackEnd * 10) / 10,
      reasoning: output.reasoning,
    };
  }

  return {
    startSeconds: start,
    endSeconds: end,
    reasoning: output.reasoning,
  };
}
