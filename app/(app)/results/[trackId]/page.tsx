import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTrackById } from "@/lib/queries/tracks";
import { getTrackRatings, computeDimensionAverages, generateInsights, getAIInsights } from "@/lib/queries/ratings";
import { getContextById } from "@/lib/constants/contexts";
import { ResultsViewWrapper } from "./results-wrapper";
import { SignInPrompt } from "@/components/sign-in-prompt";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <SignInPrompt
        title="Sign in to view your results"
        description="You need to be signed in to access your track results."
      />
    );
  }

  const track = await getTrackById(trackId);
  if (!track || track.isDeleted || track.userId !== session.user.id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Track not found.</p>
      </div>
    );
  }

  const context = track.contextId ? getContextById(track.contextId) : null;
  const dimensions = context?.dimensions ?? [];
  const [trackRatings, aiInsights] = await Promise.all([
    getTrackRatings(trackId),
    getAIInsights(trackId),
  ]);
  const dimensionAverages = computeDimensionAverages(trackRatings);
  const dimensionNames = dimensions.map((d) => d.name);
  const insights = generateInsights(dimensionAverages, dimensionNames);

  const isOwner = track.userId === session.user.id;

  return (
    <ResultsViewWrapper
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
      isOwner={isOwner}
    />
  );
}
