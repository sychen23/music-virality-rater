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
 * Simple in-memory cache for decoded waveform bar data.
 * Keyed by `${audioUrl}:${barCount}` so two visualizers with
 * the same URL and bar count share the result instantly.
 */
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
  waveformCache.set(`${audioUrl}:${bars}`, data);
}
