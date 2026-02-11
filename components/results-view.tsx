"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

const emptySubscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/score-bar";
import { InsightCard } from "@/components/insight-card";
import { formatPercentile } from "@/lib/utils";
import type { Dimension } from "@/lib/constants/contexts";

interface ResultsViewProps {
  track: {
    id: string;
    title: string;
    status: string;
    votesReceived: number;
    votesRequested: number;
    overallScore: number | null;
    percentile: number | null;
    shareToken: string;
  };
  dimensions: Dimension[];
  dimensionAverages: number[];
  insights: { title: string; description: string; variant: "success" | "warning" | "default" }[];
  isOwner?: boolean;
  onDelete?: () => void;
}

export function ResultsView({
  track,
  dimensions,
  dimensionAverages,
  insights,
  isOwner,
  onDelete,
}: ResultsViewProps) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(emptySubscribe, getOrigin, getServerOrigin);

  const shareUrl = `${origin}/r/${track.shareToken}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isComplete = track.status === "complete";
  const score = track.overallScore ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{track.title}</h1>
          <Badge variant={isComplete ? "default" : "secondary"} className="mt-1">
            {isComplete
              ? "Complete"
              : `Collecting — ${track.votesReceived}/${track.votesRequested} votes`}
          </Badge>
        </div>
        {isOwner && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
            Delete
          </Button>
        )}
      </div>

      {/* Overall Score */}
      {isComplete && (
        <div className="mb-6 rounded-2xl bg-primary/5 p-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Overall Virality Score
          </p>
          <p className="mt-1 text-5xl font-bold text-primary">{score.toFixed(1)}</p>
          {track.percentile !== null ? (
            <p className="mt-2 text-sm font-medium">
              {formatPercentile(track.percentile)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Percentile ranking available after more tracks are tested
            </p>
          )}
        </div>
      )}

      {/* Dimension Breakdown */}
      {dimensionAverages.some((a) => a > 0) && (
        <div className="mb-6">
          <h2 className="mb-3 font-semibold">Dimension Breakdown</h2>
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <ScoreBar
                key={dim.key}
                label={dim.name}
                emoji={dim.emoji}
                score={dimensionAverages[i]}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {isComplete && insights.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 font-semibold">Insights</h2>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <InsightCard
                key={i}
                title={insight.title}
                description={insight.description}
                variant={insight.variant}
              />
            ))}
          </div>
        </div>
      )}

      {/* Share */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold">Share Results</h3>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
          />
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" asChild>
            <a
              href={`https://twitter.com/intent/tweet?text=Check out my SoundCheck results!&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Post
            </a>
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" asChild>
            <a
              href={`sms:?body=Check out my SoundCheck results: ${shareUrl}`}
            >
              Message
            </a>
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" asChild>
            <a
              href={`mailto:?subject=My SoundCheck Results&body=Check out my SoundCheck results: ${shareUrl}`}
            >
              Email
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
