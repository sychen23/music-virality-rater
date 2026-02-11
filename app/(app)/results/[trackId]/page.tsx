import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTrackById } from "@/lib/queries/tracks";
import { getTrackRatings, computeDimensionAverages, generateInsights } from "@/lib/queries/ratings";
import { getContextById } from "@/lib/constants/contexts";
import { ResultsViewWrapper } from "./results-wrapper";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

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
  const trackRatings = await getTrackRatings(trackId);
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
      }}
      dimensions={dimensions}
      dimensionAverages={dimensionAverages}
      insights={insights}
      isOwner={isOwner}
    />
  );
}
