import { frequencyAt } from "../domain/tuning";
import type { Fret, StringNum } from "../domain/types";
import { fretboardSamples, sampleFor, sampleUrl } from "./samples";

const DEFAULT_SECONDS = 1.6;
const TARGET_PEAK = 0.92;
const PREFETCH_WORKERS = 2;

interface CachedSample {
  buffer: AudioBuffer;
  peak: number;
}

let ctx: AudioContext | null = null;
let playGen = 0;
let prefetchStarted = false;
const buffers = new Map<string, Promise<CachedSample | null>>();
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
  startPrefetch();
}

function startPrefetch(): void {
  if (prefetchStarted || !context()) return;
  prefetchStarted = true;
  const list = fretboardSamples();
  let index = 0;
  const worker = async () => {
    while (index < list.length) {
      const sample = list[index];
      index += 1;
      await loadBuffer(sample.file);
    }
  };
  void Promise.all(Array.from({ length: PREFETCH_WORKERS }, () => worker()));
}

function bufferPeak(buffer: AudioBuffer): number {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      const value = Math.abs(data[i]!);
      if (value > peak) peak = value;
    }
  }
  return peak;
}

async function loadBuffer(file: string): Promise<CachedSample | null> {
  const cached = buffers.get(file);
  if (cached) return cached;
  const pending = (async () => {
    const audio = context();
    if (!audio) return null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(sampleUrl(file, import.meta.env.BASE_URL));
        if (!response.ok) throw new Error("fetch");
        const bytes = await response.arrayBuffer();
        const buffer = await audio.decodeAudioData(bytes.slice(0));
        return { buffer, peak: bufferPeak(buffer) };
      } catch {
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
    }
    return null;
  })();
  buffers.set(file, pending);
  const result = await pending;
  if (!result) buffers.delete(file);
  return result;
}

function cutVoices(at: number): void {
  for (const voice of voices) {
    try {
      voice.gain.gain.cancelScheduledValues(at);
      const current = Math.max(voice.gain.gain.value, 0.0001);
      voice.gain.gain.setValueAtTime(current, at);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      voice.source.stop(at + 0.04);
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
  const fade = Math.max(0.28, seconds);
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  gain.gain.setValueAtTime(peak, now + Math.max(0.08, fade - 0.2));
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
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

function playbackGain(samplePeak: number, chord: boolean): number {
  const target = chord ? 0.78 : TARGET_PEAK;
  return Math.min(10, target / Math.max(samplePeak, 0.04));
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
  const gen = ++playGen;
  try {
    if (audio.state === "suspended") await audio.resume();
    if (audio.state !== "running" || gen !== playGen) return;
    cutVoices(audio.currentTime);
    const chord = notes.length > 1;
    const loaded = await Promise.all(
      notes.map(async (note) => {
        const sample = sampleFor(note.string, note.fret);
        const cached = sample ? await loadBuffer(sample.file) : null;
        return { note, cached };
      }),
    );
    if (gen !== playGen) return;
    for (const item of loaded) {
      if (item.cached) {
        startBuffer(item.cached.buffer, seconds, playbackGain(item.cached.peak, chord));
      } else {
        startOscillator(item.note.string, item.note.fret, Math.min(seconds, 0.55));
      }
    }
    startPrefetch();
  } catch {
    // Audio must never block answering.
  }
}
