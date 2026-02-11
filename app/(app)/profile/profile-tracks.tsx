"use client";

import { useRouter } from "next/navigation";
import { TrackCard } from "@/components/track-card";
import { Button } from "@/components/ui/button";

interface ProfileTracksProps {
  tracks: {
    id: string;
    title: string;
    contextId: string | null;
    status: string;
    votesReceived: number;
    votesRequested: number;
    overallScore: number | null;
    percentile: number | null;
    shareToken: string;
  }[];
  page: number;
  perPage: number;
  totalPages: number;
  total: number;
}

export function ProfileTracks({
  tracks,
  page,
  perPage,
  totalPages,
  total,
}: ProfileTracksProps) {
  const router = useRouter();

  if (tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tracks yet. Upload your first track to get started!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          onDeleted={() => router.refresh()}
        />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total} tracks
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/profile?page=${page - 1}`)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(`/profile?page=${page + 1}`)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
