"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WaveformVisualizer } from "./waveform-visualizer";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  PauseIcon,
} from "@hugeicons/core-free-icons";

interface AudioPlayerProps {
  audioUrl: string;
  snippetStart?: number;
  snippetEnd?: number;
  onPlayedOnce?: () => void;
}

export function AudioPlayer({
  audioUrl,
  snippetStart,
  snippetEnd,
  onPlayedOnce,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const hasPlayedOnceRef = useRef(false);

  const effectiveStart = snippetStart ?? 0;
  const effectiveEnd = snippetEnd ?? duration;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Stop at snippet end
      if (snippetEnd !== undefined && audio.currentTime >= snippetEnd) {
        audio.pause();
        setIsPlaying(false);
        if (!hasPlayedOnceRef.current) {
          hasPlayedOnceRef.current = true;
          onPlayedOnce?.();
        }
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (!hasPlayedOnceRef.current) {
        hasPlayedOnceRef.current = true;
        onPlayedOnce?.();
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [snippetEnd, onPlayedOnce]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (snippetStart !== undefined && audio.currentTime < snippetStart) {
        audio.currentTime = snippetStart;
      }
      if (snippetEnd !== undefined && audio.currentTime >= snippetEnd) {
        audio.currentTime = effectiveStart;
      }
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, snippetStart, snippetEnd, effectiveStart]);

  const handleSeek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const clampedTime = Math.max(effectiveStart, Math.min(time, effectiveEnd));
      audio.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [effectiveStart, effectiveEnd]
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={togglePlay}
        >
          <HugeiconsIcon
            icon={isPlaying ? PauseIcon : PlayIcon}
            size={18}
            strokeWidth={2}
          />
        </Button>
        <div className="flex-1">
          <WaveformVisualizer
            audioUrl={audioUrl}
            currentTime={currentTime}
            duration={duration}
            snippetStart={snippetStart}
            snippetEnd={snippetEnd}
            onSeek={handleSeek}
            className="h-10"
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(effectiveEnd)}
        </span>
      </div>
    </div>
  );
}
