"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AudioPlayer } from "@/components/audio-player";
import { SnippetTrimmer } from "@/components/snippet-trimmer";
import { GenreTagSelector } from "@/components/genre-tag-selector";
import { createTrack } from "@/lib/actions/upload";
import { evictCachedWaveform } from "@/lib/audio-context";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, Delete02Icon } from "@hugeicons/core-free-icons";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetEnd, setSnippetEnd] = useState(30);
  const metadataAudioRef = useRef<HTMLAudioElement | null>(null);
  const [title, setTitle] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (f: File) => {
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

    // Upload the file
    setUploading(true);
    const formData = new FormData();
    formData.append("file", f);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadedFilename(data.filename);
      toast.success("File uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setFile(null);
      setAudioUrl((prev) => {
        if (prev) {
          evictCachedWaveform(prev);
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!uploadedFilename || !title.trim() || !tosAccepted) return;

    setSubmitting(true);
    try {
      const track = await createTrack({
        title: title.trim(),
        audioFilename: uploadedFilename,
        duration,
        genreTags,
        snippetStart,
        snippetEnd,
      });
      router.push(`/context?trackId=${track.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save track");
    } finally {
      setSubmitting(false);
    }
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
    setUploadedFilename(null);
    setMetadataLoaded(false);
    setDuration(0);
    setSnippetStart(0);
    setSnippetEnd(30);
    setTitle("");
    setGenreTags([]);
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
    uploadedFilename && title.trim() && tosAccepted && isSnippetValid && !uploading && metadataLoaded && duration > 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Upload Your Track</h1>

      {!file ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <HugeiconsIcon
              icon={CloudUploadIcon}
              size={40}
              className="text-muted-foreground"
              strokeWidth={1.5}
            />
            <div>
              <p className="font-medium">
                Drag & drop your track here
              </p>
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </>
      ) : (
        <div className="space-y-6">
          {/* File info + delete */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
                {uploading && " — Uploading..."}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
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
            <label className="mb-1.5 block text-sm font-medium">Track Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title"
              maxLength={200}
            />
          </div>

          {/* Genre tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Genre Tags</label>
            <GenreTagSelector selected={genreTags} onChange={setGenreTags} />
          </div>

          {/* ToS */}
          <div className="flex items-start gap-2">
            <Checkbox
              checked={tosAccepted}
              onCheckedChange={(v) => setTosAccepted(v === true)}
              id="tos"
            />
            <label htmlFor="tos" className="text-sm text-muted-foreground">
              I confirm I have the rights to this track and agree to the Terms of Service.
            </label>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Saving..." : "Choose Context →"}
          </Button>
        </div>
      )}
    </div>
  );
}
