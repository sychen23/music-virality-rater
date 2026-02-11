"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContextCard } from "@/components/context-card";
import { VotePackageSelector } from "@/components/vote-package-selector";
import { EarnProgressBar } from "@/components/earn-progress-bar";
import { CONTEXTS, type Context } from "@/lib/constants/contexts";
import { VOTE_PACKAGES } from "@/lib/constants/packages";
import { submitForRating, getUserProfileData } from "@/lib/actions/context";

export default function ContextPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");

  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [ratingProgress, setRatingProgress] = useState(0);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    getUserProfileData()
      .then(({ credits, ratingProgress }) => {
        setUserCredits(credits);
        setRatingProgress(ratingProgress);
        setProfileError(false);
      })
      .catch(() => {
        // Keep userCredits as null so the submit button stays disabled
        // (the disabled check includes userCredits === null).
        setProfileError(true);
      });
  }, []);

  const handleSubmit = async () => {
    if (!trackId || !selectedContext) return;

    setSubmitting(true);
    try {
      await submitForRating({
        trackId,
        contextId: selectedContext.id,
        packageIndex: selectedPackageIndex,
      });
      toast.success("Track submitted for rating!");
      router.push(`/results/${trackId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!trackId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">No track selected. Please upload a track first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">Choose Context</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Where will this track be heard? This determines what listeners rate.
      </p>

      {/* Context grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {CONTEXTS.map((ctx) => (
          <ContextCard
            key={ctx.id}
            context={ctx}
            selected={selectedContext?.id === ctx.id}
            onSelect={() => setSelectedContext(ctx)}
          />
        ))}
      </div>

      {/* Selected context dimensions */}
      {selectedContext && (
        <div className="mb-6 rounded-xl border border-border p-4">
          <h3 className="mb-3 text-sm font-medium">
            Rating Dimensions for {selectedContext.name}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {selectedContext.dimensions.map((dim) => (
              <div
                key={dim.key}
                className="rounded-lg bg-muted/50 px-3 py-2 text-center"
              >
                <span className="text-lg">{dim.emoji}</span>
                <p className="text-xs font-medium">{dim.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote package selector */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium">How many votes?</h3>
        <VotePackageSelector
          selectedIndex={selectedPackageIndex}
          onSelect={setSelectedPackageIndex}
          userCredits={userCredits ?? 0}
        />
      </div>

      {/* Earn callout */}
      <div className="mb-6">
        <EarnProgressBar ratingProgress={ratingProgress} />
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Earn votes by rating other artists&apos; tracks
        </p>
      </div>

      {/* Profile error */}
      {profileError && (
        <p className="mb-4 text-center text-sm text-destructive">
          Could not load your profile. Please refresh the page or sign in again.
        </p>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        disabled={!selectedContext || submitting || userCredits === null || userCredits < VOTE_PACKAGES[selectedPackageIndex].credits}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting..." : "Submit for Rating"}
      </Button>
    </div>
  );
}
