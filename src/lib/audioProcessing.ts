/**
 * Client-side audio processing utilities.
 * Trims audio to a 30s preview and encodes as WAV for upload.
 * Original files are stored separately and never exposed on the frontend.
 */

const MAX_PREVIEW_SECONDS = 30;
const DEFAULT_START = 20;
const DEFAULT_END = 50;
const FADE_DURATION = 1; // seconds

export interface AudioProcessingResult {
  previewBlob: Blob;
  waveformData: number[];
  actualStart: number;
  actualEnd: number;
  duration: number;
}

/**
 * Generate normalized waveform data from an AudioBuffer.
 */
export function generateWaveformFromBuffer(buffer: AudioBuffer, barCount = 80): number[] {
  const raw = buffer.getChannelData(0);
  const step = Math.floor(raw.length / barCount);
  const peaks: number[] = [];
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += Math.abs(raw[i * step + j]);
    }
    peaks.push(sum / step);
  }
  const max = Math.max(...peaks, 0.01);
  return peaks.map((p) => p / max);
}

/**
 * Apply fade in/out to an AudioBuffer in-place.
 */
function applyFade(buffer: AudioBuffer, fadeInSec: number, fadeOutSec: number) {
  const sr = buffer.sampleRate;
  const fadeInSamples = Math.floor(fadeInSec * sr);
  const fadeOutSamples = Math.floor(fadeOutSec * sr);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    // Fade in
    for (let i = 0; i < fadeInSamples && i < data.length; i++) {
      data[i] *= i / fadeInSamples;
    }
    // Fade out
    for (let i = 0; i < fadeOutSamples && i < data.length; i++) {
      const idx = data.length - 1 - i;
      data[idx] *= i / fadeOutSamples;
    }
  }
}

/**
 * Normalize volume levels of an AudioBuffer.
 */
function normalizeVolume(buffer: AudioBuffer) {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }
  if (peak > 0 && peak < 0.95) {
    const gain = 0.95 / peak;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] *= gain;
      }
    }
  }
}

/**
 * Encode an AudioBuffer segment to WAV Blob.
 */
function encodeWAV(buffer: AudioBuffer, startSample: number, endSample: number): Blob {
  const numChannels = Math.min(buffer.numberOfChannels, 2); // stereo max
  const sampleRate = buffer.sampleRate;
  const length = endSample - startSample;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave and write samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[startSample + i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Process an audio file: decode, trim to 30s, normalize, fade, encode as WAV.
 * Returns the trimmed preview blob and waveform data.
 */
export async function processAudioPreview(
  file: File,
  manualStart?: number,
  manualEnd?: number
): Promise<AudioProcessingResult> {
  // Use webkit prefix fallback for older Safari.
  const AudioCtor: typeof AudioContext =
    (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  if (!AudioCtor) throw new Error("Web Audio API not supported in this browser");

  const ctx = new AudioCtor();
  const arrayBuffer = await file.arrayBuffer();

  let fullBuffer: AudioBuffer;
  try {
    // Promise wrapper (Safari historically required callback form).
    fullBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      const p = ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      if (p && typeof (p as Promise<AudioBuffer>).then === "function") {
        (p as Promise<AudioBuffer>).then(resolve, reject);
      }
    });
  } catch (err) {
    ctx.close();
    throw new Error(
      `Could not decode "${file.name}". Convert to MP3 or WAV and try again. (${(err as Error)?.message ?? "decode error"})`
    );
  }

  const duration = fullBuffer.duration;
  const sr = fullBuffer.sampleRate;
  if (!duration || duration < 1) {
    ctx.close();
    throw new Error("Audio file appears to be empty or too short.");
  }

  // Determine trim points, clamped to actual duration.
  let clipStart: number;
  let clipEnd: number;
  if (manualStart !== undefined && manualEnd !== undefined) {
    clipStart = Math.max(0, Math.min(manualStart, Math.max(0, duration - 1)));
    clipEnd = Math.max(clipStart + 1, Math.min(manualEnd, duration));
    if (clipEnd - clipStart > MAX_PREVIEW_SECONDS) clipEnd = clipStart + MAX_PREVIEW_SECONDS;
  } else {
    clipStart = duration > DEFAULT_END ? DEFAULT_START : 0;
    clipEnd = Math.min(clipStart + MAX_PREVIEW_SECONDS, duration);
  }

  const startSample = Math.floor(clipStart * sr);
  const endSample = Math.min(Math.floor(clipEnd * sr), fullBuffer.length);
  const clipLength = endSample - startSample;
  if (clipLength <= 0) {
    ctx.close();
    throw new Error("Selected preview range produced 0 samples. Please pick a different range.");
  }

  const trimmedBuffer = ctx.createBuffer(fullBuffer.numberOfChannels, clipLength, sr);
  for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
    const src = fullBuffer.getChannelData(ch);
    const dest = trimmedBuffer.getChannelData(ch);
    for (let i = 0; i < clipLength; i++) dest[i] = src[startSample + i];
  }

  normalizeVolume(trimmedBuffer);
  // Shorter fade for clips under 5s so the clip is mostly audible.
  const fade = Math.min(FADE_DURATION, (clipEnd - clipStart) / 6);
  applyFade(trimmedBuffer, fade, fade);

  const waveformData = generateWaveformFromBuffer(trimmedBuffer);
  const previewBlob = encodeWAV(trimmedBuffer, 0, trimmedBuffer.length);

  // Verify produced clip duration matches the requested range (±100ms).
  const producedDuration = trimmedBuffer.length / sr;
  const expected = clipEnd - clipStart;
  if (Math.abs(producedDuration - expected) > 0.1) {
    console.warn(
      `[audio] processed clip duration ${producedDuration.toFixed(2)}s differs from requested ${expected.toFixed(2)}s`
    );
  }

  ctx.close();

  return {
    previewBlob,
    waveformData,
    actualStart: clipStart,
    actualEnd: clipEnd,
    duration,
  };
}
