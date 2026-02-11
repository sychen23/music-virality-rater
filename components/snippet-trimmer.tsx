"use client";

import { useCallback, useRef, useState } from "react";
import { WaveformVisualizer } from "./waveform-visualizer";
import { cn } from "@/lib/utils";

interface SnippetTrimmerProps {
  audioUrl: string;
  duration: number;
  snippetStart: number;
  snippetEnd: number;
  onRangeChange: (start: number, end: number) => void;
  minDuration?: number;
  maxDuration?: number;
}

export function SnippetTrimmer({
  audioUrl,
  duration,
  snippetStart,
  snippetEnd,
  onRangeChange,
  minDuration = 15,
  maxDuration = 30,
}: SnippetTrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const getTimeFromX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handlePointerDown = (handle: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const time = getTimeFromX(e.clientX);

      if (dragging === "start") {
        const newStart = Math.max(0, Math.min(time, snippetEnd - minDuration));
        const clampedStart =
          snippetEnd - newStart > maxDuration
            ? snippetEnd - maxDuration
            : newStart;
        onRangeChange(Math.max(0, clampedStart), snippetEnd);
      } else {
        const newEnd = Math.min(duration, Math.max(time, snippetStart + minDuration));
        const clampedEnd =
          newEnd - snippetStart > maxDuration
            ? snippetStart + maxDuration
            : newEnd;
        onRangeChange(snippetStart, Math.min(duration, clampedEnd));
      }
    },
    [dragging, getTimeFromX, snippetStart, snippetEnd, minDuration, maxDuration, duration, onRangeChange]
  );

  const handlePointerUp = () => setDragging(null);

  const startPct = (snippetStart / duration) * 100;
  const endPct = (snippetEnd / duration) * 100;
  const snippetDuration = snippetEnd - snippetStart;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Snippet: {formatTime(snippetStart)} – {formatTime(snippetEnd)}</span>
        <span
          className={cn(
            "font-medium",
            snippetDuration < minDuration || snippetDuration > maxDuration
              ? "text-destructive"
              : "text-primary"
          )}
        >
          {snippetDuration.toFixed(1)}s ({minDuration}-{maxDuration}s)
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative h-16"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Waveform background */}
        <WaveformVisualizer audioUrl={audioUrl} duration={duration} className="h-full opacity-30" />

        {/* Selected region overlay */}
        <div
          className="absolute top-0 h-full"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        >
          <WaveformVisualizer
            audioUrl={audioUrl}
            duration={duration}
            snippetStart={snippetStart}
            snippetEnd={snippetEnd}
            className="h-full"
          />
        </div>

        {/* Left handle */}
        <div
          className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none"
          style={{ left: `${startPct}%` }}
          onPointerDown={handlePointerDown("start")}
        >
          <div className="mx-auto h-full w-1 rounded-full bg-primary" />
        </div>

        {/* Right handle */}
        <div
          className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none"
          style={{ left: `${endPct}%` }}
          onPointerDown={handlePointerDown("end")}
        >
          <div className="mx-auto h-full w-1 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
