"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCachedWaveform } from "@/lib/audio-context";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; startSeconds: number; endSeconds: number; reasoning: string };

interface SnippetSuggestionProps {
  audioUrl: string;
  duration: number;
  onApply: (start: number, end: number) => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SnippetSuggestion({
  audioUrl,
  duration,
  onApply,
}: SnippetSuggestionProps) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const handleSuggest = async () => {
    setState({ kind: "loading" });

    const bars = getCachedWaveform(audioUrl, 80);
    if (!bars) {
      toast.error("Waveform not loaded yet — try again in a moment");
      setState({ kind: "idle" });
      return;
    }

    try {
      const res = await fetch("/api/snippet-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waveformBars: bars, duration }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get suggestion");
      }

      const { startSeconds, endSeconds, reasoning } = await res.json();
      setState({ kind: "result", startSeconds, endSeconds, reasoning });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to get suggestion"
      );
      setState({ kind: "idle" });
    }
  };

  if (state.kind === "idle") {
    return (
      <button
        type="button"
        onClick={handleSuggest}
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full",
          "border border-border bg-background px-3 py-1.5",
          "text-xs font-medium text-muted-foreground",
          "transition-colors hover:border-primary/50 hover:text-foreground"
        )}
      >
        <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={2} />
        AI Suggest
      </button>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Analyzing waveform...
      </div>
    );
  }

  // result state
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
        <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={2} />
        AI Suggestion
      </div>
      <p className="mb-1 text-sm font-medium">
        {formatTime(state.startSeconds)} – {formatTime(state.endSeconds)}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          ({Math.round(state.endSeconds - state.startSeconds)}s)
        </span>
      </p>
      <p className="mb-3 text-xs text-muted-foreground">{state.reasoning}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1 px-3 text-xs"
          onClick={() => {
            onApply(state.startSeconds, state.endSeconds);
            setState({ kind: "idle" });
          }}
        >
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} />
          Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-3 text-xs"
          onClick={() => setState({ kind: "idle" })}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
