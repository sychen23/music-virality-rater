/**
 * Shared AudioContext singleton for decoding audio data.
 *
 * Browsers limit the number of AudioContexts per page (~6 in Chrome).
 * Instead of creating one per WaveformVisualizer mount, every consumer
 * shares this single instance. The context is lazily created on first
 * use and automatically resumed if it was suspended (e.g. due to
 * autoplay policy).
 */

let sharedContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContext();
  }

  // Browsers may suspend an AudioContext created before user interaction.
  // Calling resume() on an already-running context is a harmless no-op.
  if (sharedContext.state === "suspended") {
    sharedContext.resume();
  }

  return sharedContext;
}

/**
 * In-memory cache for decoded waveform bar data.
 * Keyed by `${audioUrl}:${barCount}` so two visualizers with
 * the same URL and bar count share the result instantly.
 *
 * Capped at MAX_ENTRIES to prevent unbounded growth during long
 * sessions. Eviction is oldest-first (Map iteration order).
 */
const MAX_ENTRIES = 64;
const waveformCache = new Map<string, number[]>();

export function getCachedWaveform(
  audioUrl: string,
  bars: number,
): number[] | undefined {
  return waveformCache.get(`${audioUrl}:${bars}`);
}

export function setCachedWaveform(
  audioUrl: string,
  bars: number,
  data: number[],
): void {
  const key = `${audioUrl}:${bars}`;
  // Delete first so the re-inserted key moves to the end (newest)
  waveformCache.delete(key);
  waveformCache.set(key, data);

  // Evict oldest entries when over capacity
  while (waveformCache.size > MAX_ENTRIES) {
    const oldest = waveformCache.keys().next().value;
    if (oldest !== undefined) waveformCache.delete(oldest);
  }
}

/**
 * Remove all cached entries for a given audio URL (any bar count).
 * Call this when a blob URL is revoked to avoid retaining dead references.
 */
export function evictCachedWaveform(audioUrl: string): void {
  for (const key of waveformCache.keys()) {
    if (key.startsWith(`${audioUrl}:`)) {
      waveformCache.delete(key);
    }
  }
}
