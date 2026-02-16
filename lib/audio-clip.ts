import {
  Input,
  ALL_FORMATS,
  BlobSource,
  Output,
  BufferTarget,
  Mp3OutputFormat,
  Conversion,
  canEncodeAudio,
} from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";

let mp3EncoderRegistered = false;

async function ensureMp3Encoder() {
  if (mp3EncoderRegistered) return;
  if (!(await canEncodeAudio("mp3"))) {
    registerMp3Encoder();
  }
  mp3EncoderRegistered = true;
}

/**
 * Clips an audio file to the specified time range and encodes it as a mono MP3.
 *
 * Uses mediabunny for trimming + MP3 encoding in a single pass.
 * Output sizes at 128kbps mono: ~480KB for 30s, ~240KB for 15s.
 */
export async function clipAudio(
  file: File,
  startTime: number,
  endTime: number,
): Promise<File> {
  await ensureMp3Encoder();

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  const output = new Output({
    format: new Mp3OutputFormat(),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: startTime, end: endTime },
    audio: {
      numberOfChannels: 1,
      sampleRate: 44100,
      bitrate: 128_000,
    },
    showWarnings: false,
  });

  if (conversion.isValid) {
    await conversion.execute();
    const buffer = output.target.buffer!;
    return new File([buffer], "clip.mp3", { type: "audio/mpeg" });
  }

  // Fallback for containers mediabunny can't handle (e.g. M4A with non-audio
  // tracks): decode with Web Audio API, trim, and produce a WAV file.
  return clipAudioFallback(file, startTime, endTime);
}

async function clipAudioFallback(
  file: File,
  startTime: number,
  endTime: number,
): Promise<File> {
  const audioCtx = new AudioContext({ sampleRate: 44100 });
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const startSample = Math.floor(startTime * decoded.sampleRate);
    const endSample = Math.floor(endTime * decoded.sampleRate);
    const length = endSample - startSample;

    // Mix down to mono
    const mono = new Float32Array(length);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const channelData = decoded.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i] += channelData[startSample + i];
      }
    }
    if (decoded.numberOfChannels > 1) {
      for (let i = 0; i < length; i++) {
        mono[i] /= decoded.numberOfChannels;
      }
    }

    // Encode as WAV (16-bit PCM)
    const wavBuffer = encodeWav(mono, decoded.sampleRate);
    return new File([wavBuffer], "clip.wav", { type: "audio/wav" });
  } finally {
    await audioCtx.close();
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}
