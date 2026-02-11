"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteTrack } from "@/lib/actions/track";

interface TrackCardProps {
  track: {
    id: string;
    title: string;
    contextId: string | null;
    status: string;
    votesReceived: number;
    votesRequested: number;
    overallScore: number | null;
    percentile: number | null;
    shareToken: string;
  };
  onDeleted?: () => void;
}

export function TrackCard({ track, onDeleted }: TrackCardProps) {
  const handleDelete = async () => {
    if (!confirm("Delete this track?")) return;
    try {
      await deleteTrack(track.id);
      toast.success("Track deleted");
      onDeleted?.();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/r/${track.shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={track.status === "complete" ? "default" : "secondary"}>
            {track.status === "complete"
              ? "Complete"
              : track.status === "collecting"
                ? `${track.votesReceived}/${track.votesRequested}`
                : "Draft"}
          </Badge>
          {track.overallScore !== null && (
            <span className="text-sm font-bold text-primary">
              {track.overallScore.toFixed(1)}
            </span>
          )}
          {track.percentile !== null && (
            <span className="text-xs text-muted-foreground">
              Top {100 - track.percentile}%
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Link href={`/results/${track.id}`}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleShare}>
          Share
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
