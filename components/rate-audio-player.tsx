"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, PauseIcon } from "@hugeicons/core-free-icons";

interface RateAudioPlayerProps {
  audioUrl: string;
  snippetStart?: number;
  snippetEnd?: number;
  onPlayedOnce?: () => void;
}

export function RateAudioPlayer({
  audioUrl,
  snippetStart,
  snippetEnd,
  onPlayedOnce,
}: RateAudioPlayerProps) {
  // useState drives re-renders when the element mounts/unmounts so effects re-run.
  // The ref mirrors it for imperative access without triggering lint warnings on
  // property assignments like `audio.currentTime = x`.
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasPlayedOnceRef = useRef(false);

  const effectiveStart = snippetStart ?? 0;
  const effectiveEnd = snippetEnd ?? duration;

  // Callback ref — fires immediately when the <audio> element mounts into the DOM.
  // Sets both the state (to trigger effects) and the ref (for imperative access).
  const audioRefCallback = useCallback((node: HTMLAudioElement | null) => {
    audioRef.current = node;
    setAudioEl(node);
  }, []);

  // Fire the onPlayedOnce callback exactly once per mount
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

  // Attach event listeners whenever audioEl changes (i.e. on mount)
  useEffect(() => {
    const audio = audioEl;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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

    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    // If metadata is already loaded (browser cached the file), dispatch the
    // event manually so the listener above picks it up on next microtask.
    if (audio.readyState >= 1) {
      audio.dispatchEvent(new Event("loadedmetadata"));
    }

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [audioEl, snippetEnd, markPlayed]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (snippetStart !== undefined && audio.currentTime < snippetStart) {
        audio.currentTime = snippetStart;
      }
      if (snippetEnd !== undefined && audio.currentTime >= snippetEnd) {
        audio.currentTime = effectiveStart;
      }
      audio.play().catch((err) => {
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
      const clamped = Math.max(effectiveStart, Math.min(time, effectiveEnd));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [effectiveStart, effectiveEnd],
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <audio ref={audioRefCallback} src={audioUrl} preload="metadata" />
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
