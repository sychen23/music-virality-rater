"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ResultsView } from "@/components/results-view";
import { deleteTrack } from "@/lib/actions/track";
import type { Dimension } from "@/lib/constants/contexts";

interface ResultsViewWrapperProps {
  track: {
    id: string;
    title: string;
    status: string;
    votesReceived: number;
    votesRequested: number;
    overallScore: number | null;
    percentile: number | null;
    shareToken: string;
    audioFilename: string;
    snippetStart: number | null;
    snippetEnd: number | null;
  };
  dimensions: Dimension[];
  dimensionAverages: number[];
  insights: { title: string; description: string; variant: "success" | "warning" | "default" }[];
  isOwner: boolean;
}

export function ResultsViewWrapper({
  track,
  dimensions,
  dimensionAverages,
  insights,
  isOwner,
}: ResultsViewWrapperProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this track?")) return;
    try {
      await deleteTrack(track.id);
      toast.success("Track deleted");
      router.push("/profile");
    } catch {
      toast.error("Failed to delete track");
    }
  };

  return (
    <ResultsView
      track={track}
      dimensions={dimensions}
      dimensionAverages={dimensionAverages}
      insights={insights}
      isOwner={isOwner}
      onDelete={handleDelete}
    />
  );
}
