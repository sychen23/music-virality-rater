"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getContextById } from "@/lib/constants/contexts";
import { cn } from "@/lib/utils";

interface LeaderboardTrack {
  id: string;
  title: string;
  overallScore: number | null;
  contextId: string | null;
  votesReceived: number;
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, { label: string; className: string }> = {
    1: { label: "1", className: "bg-yellow-500 text-white" },
    2: { label: "2", className: "bg-gray-400 text-white" },
    3: { label: "3", className: "bg-amber-700 text-white" },
  };

  const medal = medals[rank];

  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        medal ? medal.className : "bg-muted text-muted-foreground"
      )}
    >
      {medal ? medal.label : rank}
    </div>
  );
}

export function LeaderboardSection({
  tracks,
}: {
  tracks: LeaderboardTrack[];
}) {
  const router = useRouter();
  const { requireAuth } = useAuth();

  if (tracks.length === 0) return null;

  return (
    <section className="mt-8 w-full max-w-sm">
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide">
        Top Tracks
      </h2>
      <div className="flex flex-col gap-2">
        {tracks.map((track, index) => {
          const rank = index + 1;
          const context = track.contextId
            ? getContextById(track.contextId)
            : null;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() =>
                requireAuth(() => router.push("/rate"))
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-accent/50",
                rank <= 3 && "border-primary/20"
              )}
            >
              <RankBadge rank={rank} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {track.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {context && (
                    <span className="text-xs text-muted-foreground">
                      {context.icon} {context.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-lg font-bold tabular-nums text-primary">
                  {track.overallScore?.toFixed(1) ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">/ 3.0</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
