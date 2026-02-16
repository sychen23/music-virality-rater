"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
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

  // Keep a stable ref to onPlayedOnce so event listeners don't get
  // re-attached on every render (which could cause missed events).
  const onPlayedOnceRef = useRef(onPlayedOnce);
  useEffect(() => {
    onPlayedOnceRef.current = onPlayedOnce;
  }, [onPlayedOnce]);

  const markPlayed = useCallback(() => {
    if (!hasPlayedOnceRef.current) {
      hasPlayedOnceRef.current = true;
      onPlayedOnceRef.current?.();
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Stop at snippet end (but only if it's before the natural end of the audio,
      // otherwise let the audio finish naturally and rely on `ended`)
      if (
        snippetEnd !== undefined &&
        audio.currentTime >= snippetEnd &&
        snippetEnd < audio.duration - 0.05
      ) {
        audio.pause();
        setIsPlaying(false);
        markPlayed();
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      markPlayed();
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [snippetEnd, markPlayed]);

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
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        // AbortError is expected when play() is interrupted by pause() or
        // element removal — safe to ignore. Other errors (e.g. NotAllowedError
        // from autoplay policy, NotSupportedError from codec issues) mean
        // playback genuinely failed.
        if (err.name !== "AbortError") {
          setIsPlaying(false);
          console.warn("Audio playback failed:", err);
        }
      });
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
