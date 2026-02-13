"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";
import { RatingTrackColumns } from "@/components/rating-track-columns";
import { EarnProgressBar } from "@/components/earn-progress-bar";
import { useAuth } from "@/components/auth-provider";
import { getContextById, type Dimension } from "@/lib/constants/contexts";
import { submitRating } from "@/lib/actions/rate";

interface TrackToRate {
  id: string;
  title: string;
  audioFilename: string;
  contextId: string;
  snippetStart: number | null;
  snippetEnd: number | null;
}

export default function RatePage() {
  const { requireAuth, user } = useAuth();
  const [track, setTrack] = useState<TrackToRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTracks, setNoTracks] = useState(false);
  const [ratings, setRatings] = useState<(number | null)[]>([null, null, null, null]);
  const [feedback, setFeedback] = useState("");
  const [hasListened, setHasListened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratingProgress, setRatingProgress] = useState(0);
  const [trackCount, setTrackCount] = useState(0);

  const [needsAuth, setNeedsAuth] = useState(false);

  const fetchTrack = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/rate/next");
      if (res.status === 401) {
        setNeedsAuth(true);
        setTrack(null);
      } else if (res.status === 404) {
        setNoTracks(true);
        setTrack(null);
        setHasListened(false);
        setRatings([null, null, null, null]);
        setFeedback("");
      } else if (!res.ok) {
        throw new Error("Failed to load track");
      } else {
        setNeedsAuth(false);
        const data = await res.json();
        // Reset form state only after a successful fetch so a network
        // error doesn't wipe the user's in-progress ratings.
        setHasListened(false);
        setRatings([null, null, null, null]);
        setFeedback("");
        setTrack(data.track);
        setRatingProgress(data.ratingProgress ?? 0);
        setNoTracks(false);
        setTrackCount((c) => c + 1);
      }
    } catch {
      toast.error("Failed to load track");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when user signs in. Use user?.id rather than the full user object
  // to avoid spurious refetches when better-auth's useSession returns a new
  // object reference on background refreshes without an actual user change.
  const userId = user?.id;
  useEffect(() => {
    fetchTrack();
  }, [fetchTrack, userId]);

  const context = track?.contextId ? getContextById(track.contextId) : null;
  const dimensions: Dimension[] = context?.dimensions ?? [];

  const allRated = ratings.every((r) => r !== null);

  const handleSubmit = () => {
    if (!track || !hasListened || !allRated) return;

    requireAuth(async () => {
      setSubmitting(true);
      try {
        const result = await submitRating({
          trackId: track.id,
          dimension1: ratings[0] as number,
          dimension2: ratings[1] as number,
          dimension3: ratings[2] as number,
          dimension4: ratings[3] as number,
          feedback: feedback.trim() || undefined,
        });

        if (result.creditEarned) {
          toast.success("You earned +1 credit!");
        } else {
          toast.success("Rating submitted!");
        }
        setRatingProgress(result.newProgress);
        fetchTrack();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit rating"
        );
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading track...</p>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium">Rate tracks &amp; earn credits</p>
        <p className="text-sm text-muted-foreground">
          Sign in to start rating other artists&apos; music and earn credits for your own uploads.
        </p>
        <Button onClick={() => requireAuth(() => {})} className="mt-2">
          Sign In
        </Button>
      </div>
    );
  }

  if (noTracks || !track) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium">No tracks to rate right now</p>
        <p className="text-sm text-muted-foreground">
          Check back later — new tracks are submitted all the time!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Progress */}
      <EarnProgressBar ratingProgress={ratingProgress} />

      {/* Context badge + track count */}
      <div className="mt-4 mb-4 flex items-center justify-between">
        {context && (
          <Badge variant="secondary">
            {context.icon} {context.name}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          Track #{trackCount}
        </span>
      </div>

      {/* Audio player */}
      <div className="mb-6">
        <AudioPlayer
          key={track.id}
          audioUrl={track.audioFilename}
          snippetStart={track.snippetStart ?? undefined}
          snippetEnd={track.snippetEnd ?? undefined}
          onPlayedOnce={() => setHasListened(true)}
        />
        {!hasListened && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Listen at least once to enable rating
          </p>
        )}
      </div>

      {/* Rating columns */}
      <div className="mb-6">
        <RatingTrackColumns
          dimensions={dimensions}
          values={ratings}
          onChange={setRatings}
        />
      </div>

      {/* Feedback */}
      <div className="mb-6">
        <label className="mb-1.5 block text-sm font-medium">
          Feedback <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Any thoughts for the artist?"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={fetchTrack}
        >
          Skip
        </Button>
        <Button
          className="flex-1"
          disabled={!hasListened || !allRated || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : !allRated ? "Rate all dimensions" : "Submit & Next"}
        </Button>
      </div>
    </div>
  );
}
