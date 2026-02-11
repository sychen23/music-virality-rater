"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getSharedAudioContext,
  getCachedWaveform,
  setCachedWaveform,
} from "@/lib/audio-context";

interface WaveformVisualizerProps {
  audioUrl: string;
  bars?: number;
  className?: string;
  currentTime?: number;
  duration?: number;
  snippetStart?: number;
  snippetEnd?: number;
  onSeek?: (time: number) => void;
}

export function WaveformVisualizer({
  audioUrl,
  bars = 80,
  className,
  currentTime = 0,
  duration = 0,
  snippetStart,
  snippetEnd,
  onSeek,
}: WaveformVisualizerProps) {
  // Decoded waveform data fetched asynchronously (only used when cache misses)
  const [fetchedData, setFetchedData] = useState<number[]>([]);

  // Synchronously read from cache — avoids extra renders when data is already decoded
  const cachedData = useMemo(
    () => getCachedWaveform(audioUrl, bars),
    [audioUrl, bars],
  );

  useEffect(() => {
    if (!audioUrl || cachedData) return;

    const abortController = new AbortController();

    fetch(audioUrl, { signal: abortController.signal })
      .then((res) => res.arrayBuffer())
      .then((buffer) => getSharedAudioContext().decodeAudioData(buffer))
      .then((audioBuffer) => {
        if (abortController.signal.aborted) return;

        const channelData = audioBuffer.getChannelData(0);
        const samplesPerBar = Math.floor(channelData.length / bars);
        const barData: number[] = [];

        for (let i = 0; i < bars; i++) {
          let sum = 0;
          const start = i * samplesPerBar;
          for (let j = start; j < start + samplesPerBar; j++) {
            sum += Math.abs(channelData[j] || 0);
          }
          barData.push(sum / samplesPerBar);
        }

        const max = Math.max(...barData, 0.01);
        const normalized = barData.map((v) => v / max);

        setCachedWaveform(audioUrl, bars, normalized);
        setFetchedData(normalized);
      })
      .catch((err) => {
        // Ignore abort errors — they're expected during cleanup
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Fallback: generate pseudo-random bars
        setFetchedData(
          Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8)
        );
      });

    return () => {
      abortController.abort();
    };
  }, [audioUrl, bars, cachedData]);

  const waveformData = cachedData ?? fetchedData;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSeek || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <svg
      viewBox={`0 0 ${bars * 4} 60`}
      className={cn("w-full", onSeek && "cursor-pointer", className)}
      onClick={handleClick}
      preserveAspectRatio="none"
    >
      {/* Snippet region highlight */}
      {snippetStart !== undefined &&
        snippetEnd !== undefined &&
        duration > 0 && (
          <rect
            x={(snippetStart / duration) * bars * 4}
            y={0}
            width={((snippetEnd - snippetStart) / duration) * bars * 4}
            height={60}
            className="fill-primary/10"
          />
        )}
      {waveformData.map((amplitude, i) => {
        const barHeight = Math.max(amplitude * 50, 2);
        const barProgress = i / bars;
        const isPlayed = barProgress <= progressRatio;
        return (
          <rect
            key={i}
            x={i * 4}
            y={30 - barHeight / 2}
            width={2.5}
            height={barHeight}
            rx={1}
            className={cn(
              "transition-colors",
              isPlayed ? "fill-primary" : "fill-muted-foreground/30"
            )}
          />
        );
      })}
    </svg>
  );
}
