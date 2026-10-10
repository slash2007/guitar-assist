import { frequencyAt } from "../domain/tuning";
import type { Fret, StringNum } from "../domain/types";
import { fretboardSamples, sampleFor, sampleUrl } from "./samples";

const DEFAULT_SECONDS = 1.35;

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const voices: Array<{ source: AudioBufferSourceNode; gain: GainNode }> = [];

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export async function unlockAudio(): Promise<void> {
  const audio = context();
  if (!audio) return;
  try {
    if (audio.state === "suspended") await audio.resume();
  } catch {
    return;
  }
  void prefetchFretboardSamples();
}

export function prefetchFretboardSamples(): void {
  if (!context()) return;
  for (const sample of fretboardSamples()) void loadBuffer(sample.file);
}

async function loadBuffer(file: string): Promise<AudioBuffer | null> {
  const audio = context();
  if (!audio) return null;
  const cached = buffers.get(file);
  if (cached) return cached;
  const pending = (async () => {
    try {
      const response = await fetch(sampleUrl(file, import.meta.env.BASE_URL));
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      return await audio.decodeAudioData(bytes.slice(0));
    } catch {
      return null;
    }
  })();
  buffers.set(file, pending);
  return pending;
}

function cutVoices(at: number): void {
  for (const voice of voices) {
    try {
      voice.gain.gain.cancelScheduledValues(at);
      const current = Math.max(voice.gain.gain.value, 0.0001);
      voice.gain.gain.setValueAtTime(current, at);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
      voice.source.stop(at + 0.05);
    } catch {
      /* already stopped */
    }
  }
  voices.length = 0;
}

function startBuffer(buffer: AudioBuffer, seconds: number, peak: number): void {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  const fade = Math.max(0.18, seconds);
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.setValueAtTime(peak, now + Math.max(0.05, fade - 0.16));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
  source.connect(gain);
  gain.connect(audio.destination);
  source.start(now);
  source.stop(now + fade + 0.03);
  voices.push({ source, gain });
}

function startOscillator(string: StringNum, fret: Fret, seconds: number): void {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = frequencyAt(string, fret);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

export async function playPitch(string: StringNum, fret: Fret, seconds = DEFAULT_SECONDS): Promise<void> {
  await playPitches([{ string, fret }], seconds);
}

export async function playPitches(
  notes: Array<{ string: StringNum; fret: Fret }>,
  seconds = DEFAULT_SECONDS,
): Promise<void> {
  const audio = context();
  if (!audio || notes.length === 0) return;
  try {
    if (audio.state === "suspended") await audio.resume();
    cutVoices(audio.currentTime);
    const peak = notes.length > 1 ? 0.42 : 0.7;
    await Promise.all(
      notes.map(async (note) => {
        const sample = sampleFor(note.string, note.fret);
        const buffer = sample ? await loadBuffer(sample.file) : null;
        if (buffer) startBuffer(buffer, seconds, peak);
        else startOscillator(note.string, note.fret, Math.min(seconds, 0.38));
      }),
    );
  } catch {
    // Audio must never block answering.
  }
}
