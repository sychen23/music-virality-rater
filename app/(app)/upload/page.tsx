"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AudioPlayer } from "@/components/audio-player";
import { SnippetTrimmer } from "@/components/snippet-trimmer";
import { GenreTagSelector } from "@/components/genre-tag-selector";
import { ContextCard } from "@/components/context-card";
import { VotePackageSelector } from "@/components/vote-package-selector";
import { createAndSubmitTrack } from "@/lib/actions/upload";
import { getUserProfileData } from "@/lib/actions/context";
import { clipAudio } from "@/lib/audio-clip";
import { evictCachedWaveform } from "@/lib/audio-context";
import { useAuth } from "@/components/auth-provider";
import { CONTEXTS, type Context } from "@/lib/constants/contexts";
import { PRODUCTION_STAGES } from "@/lib/constants/production-stages";
import { VOTE_PACKAGES } from "@/lib/constants/packages";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudUploadIcon,
  Delete02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { AdUnit } from "@/components/ad-unit";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const MIN_CREDITS = VOTE_PACKAGES[0].credits; // cheapest package

export default function UploadPage() {
  const router = useRouter();
  const { requireAuth, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File / audio state ---
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetEnd, setSnippetEnd] = useState(30);
  const metadataAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Metadata state ---
  const [title, setTitle] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [productionStage, setProductionStage] = useState<string | null>(null);

  // --- Context & package state (moved from /context page) ---
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);

  // --- Credits state ---
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [profileError, setProfileError] = useState(false);

  // --- Form state ---
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch credits when logged in
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setUserCredits(null);
      setProfileError(false);
      return;
    }
    getUserProfileData()
      .then(({ credits }) => {
        setUserCredits(credits);
        setProfileError(false);
      })
      .catch(() => {
        setProfileError(true);
      });
  }, [userId]);

  const insufficientCredits =
    userId != null && userCredits !== null && userCredits < MIN_CREDITS;

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setMetadataLoaded(false);

    // Clean up previous metadata-probing Audio element
    if (metadataAudioRef.current) {
      metadataAudioRef.current.removeAttribute("src");
      metadataAudioRef.current.load();
      metadataAudioRef.current = null;
    }

    // Revoke previous object URL and evict its waveform cache entries
    setAudioUrl((prev) => {
      if (prev) {
        evictCachedWaveform(prev);
        URL.revokeObjectURL(prev);
      }
      return null;
    });

    // Get duration from audio
    const url = URL.createObjectURL(f);
    setAudioUrl(url);

    const audio = new Audio(url);
    metadataAudioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => {
      // Guard against stale callbacks from a previously replaced file
      if (metadataAudioRef.current !== audio) return;
      const dur = audio.duration;
      setDuration(dur);
      setSnippetStart(0);
      setSnippetEnd(Math.min(30, dur));
      setMetadataLoaded(true);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) requireAuth(() => handleFile(f));
    },
    [handleFile, requireAuth],
  );

  const handleSubmit = () => {
    if (submitting) return;
    if (
      !file ||
      !title.trim() ||
      !tosAccepted ||
      !isSnippetValid ||
      !productionStage ||
      !selectedContext
    )
      return;

    requireAuth(async () => {
      setSubmitting(true);
      try {
        // Clip the audio to the selected snippet range
        const clippedFile = await clipAudio(file, snippetStart, snippetEnd);
        const clipDuration = snippetEnd - snippetStart;

        // Upload the clipped audio, preserving the original filename (with .mp3 ext)
        const originalName = file.name.replace(/\.[^.]+$/, ".mp3");
        const formData = new FormData();
        formData.append("file", clippedFile, originalName);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Create track + set context + deduct credits in one server action
        const track = await createAndSubmitTrack({
          title: title.trim(),
          audioFilename: data.filename,
          duration: clipDuration,
          genreTags,
          snippetStart: 0,
          snippetEnd: clipDuration,
          productionStage,
          contextId: selectedContext.id,
          packageIndex: selectedPackageIndex,
        });

        toast.success("Track submitted for rating!");
        router.push(`/results/${track.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit track",
        );
      } finally {
        setSubmitting(false);
      }
    });
  };

  const handleClear = () => {
    // Clean up metadata-probing Audio element
    if (metadataAudioRef.current) {
      metadataAudioRef.current.removeAttribute("src");
      metadataAudioRef.current.load();
      metadataAudioRef.current = null;
    }
    if (audioUrl) {
      evictCachedWaveform(audioUrl);
      URL.revokeObjectURL(audioUrl);
    }
    setFile(null);
    setAudioUrl(null);
    setMetadataLoaded(false);
    setDuration(0);
    setSnippetStart(0);
    setSnippetEnd(30);
    setTitle("");
    setGenreTags([]);
    setProductionStage(null);
    setSelectedContext(null);
    setSelectedPackageIndex(0);
    setTosAccepted(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Revoke object URL and evict waveform cache on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        evictCachedWaveform(audioUrl);
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const snippetDuration = snippetEnd - snippetStart;
  const isSnippetValid = snippetDuration >= 15 && snippetDuration <= 30;

  const canSubmit =
    file &&
    title.trim() &&
    tosAccepted &&
    isSnippetValid &&
    metadataLoaded &&
    duration > 0 &&
    productionStage &&
    selectedContext &&
    userCredits !== null &&
    userCredits >= VOTE_PACKAGES[selectedPackageIndex].credits;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {/* Credit warning banner */}
      {insufficientCredits && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-medium text-destructive">
            Not enough credits to submit a track.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rate other artists&apos; songs to earn credits.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => router.push("/rate")}
          >
            Start Rating
          </Button>
        </div>
      )}

      {/* Credit balance (when logged in and has credits) */}
      {userId && userCredits !== null && !insufficientCredits && (
        <div className="mb-4 text-right text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{userCredits}</span>{" "}
          credits
        </div>
      )}

      {profileError && (
        <p className="mb-4 text-center text-sm text-destructive">
          Could not load your profile. Please refresh the page.
        </p>
      )}

      {!file ? (
        <>
          {/* Drop zone */}
          <h1 className="mb-4 text-2xl font-bold">Upload Your Track</h1>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (!insufficientCredits) handleDrop(e);
            }}
            onClick={() => {
              if (insufficientCredits) return;
              requireAuth(() => fileInputRef.current?.click());
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
              insufficientCredits
                ? "cursor-not-allowed border-border opacity-50"
                : isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
            )}
          >
            <HugeiconsIcon
              icon={CloudUploadIcon}
              size={40}
              className="text-muted-foreground"
              strokeWidth={1.5}
            />
            <div>
              <p className="font-medium">Drag & drop your track here</p>
              <p className="text-sm text-muted-foreground">
                MP3, WAV, or M4A — up to 10MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,audio/*"
            className="hidden"
            disabled={insufficientCredits}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) requireAuth(() => handleFile(f));
            }}
          />

          {/* Ad — only visible before upload */}
          <div className="mt-6">
            <AdUnit adSlot="3426548881" />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* File info + delete */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={submitting}
            >
              <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} />
            </Button>
          </div>

          {/* Audio player */}
          {audioUrl && (
            <AudioPlayer
              audioUrl={audioUrl}
              snippetStart={snippetStart}
              snippetEnd={snippetEnd}
            />
          )}

          {/* Snippet trimmer */}
          {audioUrl && duration > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Select Snippet</h3>
              <SnippetTrimmer
                audioUrl={audioUrl}
                duration={duration}
                snippetStart={snippetStart}
                snippetEnd={snippetEnd}
                onRangeChange={(s, e) => {
                  setSnippetStart(s);
                  setSnippetEnd(e);
                }}
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Track Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title"
              maxLength={200}
            />
          </div>

          {/* Genre tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Genre Tags
            </label>
            <GenreTagSelector selected={genreTags} onChange={setGenreTags} />
          </div>

          {/* Production Stage */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label className="text-sm font-medium">Production Stage</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-muted-foreground">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      size={14}
                      strokeWidth={2}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>
                    How far along is this track in production? This helps raters
                    set expectations.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PRODUCTION_STAGES.map((stage) => (
                <Tooltip key={stage.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setProductionStage(stage.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all",
                        productionStage === stage.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="text-lg">{stage.emoji}</span>
                      <span className="text-xs font-semibold">
                        {stage.label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{stage.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Context Selection */}
          <div>
            <h3 className="mb-1.5 text-sm font-medium">
              Where will this track be heard?
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              This determines what listeners rate.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CONTEXTS.map((ctx) => (
                <ContextCard
                  key={ctx.id}
                  context={ctx}
                  selected={selectedContext?.id === ctx.id}
                  onSelect={() => setSelectedContext(ctx)}
                />
              ))}
            </div>
          </div>

          {/* Selected context dimensions */}
          {selectedContext && (
            <div className="rounded-xl border border-border p-4">
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
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">How many votes?</h3>
              {userCredits !== null && (
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {userCredits}
                  </span>{" "}
                  credits
                </span>
              )}
            </div>
            <VotePackageSelector
              selectedIndex={selectedPackageIndex}
              onSelect={setSelectedPackageIndex}
              userCredits={userCredits ?? 0}
            />
          </div>

          {/* Earn callout */}
          <p className="text-center text-xs text-muted-foreground">
            Earn credits by rating other artists&apos; tracks
          </p>

          {/* ToS */}
          <div className="flex items-start gap-2">
            <Checkbox
              checked={tosAccepted}
              onCheckedChange={(v) => setTosAccepted(v === true)}
              id="tos"
            />
            <label htmlFor="tos" className="text-sm text-muted-foreground">
              I confirm I have the rights to this track and agree to the Terms of
              Service.
            </label>
          </div>

          {/* Auth prompt */}
          {!userId && (
            <p className="text-center text-sm text-muted-foreground">
              Sign in to submit your track for rating.
            </p>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Clipping & submitting..." : "Submit for Rating"}
          </Button>
        </div>
      )}
    </div>
  );
}
