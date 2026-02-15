import { getTrackByShareToken } from "@/lib/queries/tracks";
import { getTrackRatings, computeDimensionAverages, generateInsights, getAIInsights } from "@/lib/queries/ratings";
import { getContextById } from "@/lib/constants/contexts";
import { ResultsView } from "@/components/results-view";

export default async function PublicResultsPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const track = await getTrackByShareToken(shareToken);
  if (!track) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Track not found.</p>
      </div>
    );
  }

  const context = track.contextId ? getContextById(track.contextId) : null;
  const dimensions = context?.dimensions ?? [];
  const [trackRatings, aiInsights] = await Promise.all([
    getTrackRatings(track.id),
    getAIInsights(track.id),
  ]);
  const dimensionAverages = computeDimensionAverages(trackRatings);
  const dimensionNames = dimensions.map((d) => d.name);
  const insights = generateInsights(dimensionAverages, dimensionNames);

  return (
    <ResultsView
      track={{
        id: track.id,
        title: track.title,
        status: track.status,
        votesReceived: track.votesReceived,
        votesRequested: track.votesRequested,
        overallScore: track.overallScore,
        percentile: track.percentile,
        shareToken: track.shareToken,
        audioFilename: track.audioFilename,
        snippetStart: track.snippetStart,
        snippetEnd: track.snippetEnd,
      }}
      dimensions={dimensions}
      dimensionAverages={dimensionAverages}
      insights={insights}
      aiInsights={aiInsights}
    />
  );
}
