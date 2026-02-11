import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTracksByUser } from "@/lib/queries/profiles";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ResultsListPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { tracks } = await getTracksByUser(session.user.id, 1, 50);

  const completedTracks = tracks.filter(
    (t) => t.status === "complete" || t.status === "collecting"
  );

  if (completedTracks.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium">No results yet</p>
        <p className="text-sm text-muted-foreground">
          Upload a track and submit it for rating to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Results</h1>
      <div className="space-y-3">
        {completedTracks.map((track) => (
          <Link
            key={track.id}
            href={`/results/${track.id}`}
            className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">{track.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={track.status === "complete" ? "default" : "secondary"}>
                  {track.status === "complete" ? "Complete" : "Collecting"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {track.votesReceived}/{track.votesRequested} votes
                </span>
              </div>
            </div>
            {track.overallScore !== null && (
              <span className="text-2xl font-bold text-primary">
                {track.overallScore.toFixed(1)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
