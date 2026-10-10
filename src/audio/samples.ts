import { FRETS, STRING_NUMS, type Fret, type StringNum } from "../domain/types";
import { midiAt } from "../domain/tuning";

export const SAMPLE_BASE = "audio/guitar/stratocaster";

export const SAMPLE_FILES = [
  "string-1-A-as-A4.wav",
  "string-1-A-as-A5.wav",
  "string-1-Ax-as-Ax4.wav",
  "string-1-Ax-as-Ax5.wav",
  "string-1-B-as-B4.wav",
  "string-1-B-as-B5.wav",
  "string-1-C-as-C5.wav",
  "string-1-C-as-C6.wav",
  "string-1-Cx-as-Cx5.wav",
  "string-1-Cx-as-Cx6.wav",
  "string-1-D-as-D5.wav",
  "string-1-Dx-as-Dx5.wav",
  "string-1-E-as-E4.wav",
  "string-1-E-as-E5.wav",
  "string-1-F-as-F4.wav",
  "string-1-F-as-F5.wav",
  "string-1-Fx-as-Fx4.wav",
  "string-1-Fx-as-Fx5.wav",
  "string-1-G-as-G4.wav",
  "string-1-G-as-G5.wav",
  "string-1-Gx-as-Gx4.wav",
  "string-1-Gx-as-Gx5.wav",
  "string-2-B-as-B3.wav",
  "string-2-C-as-C4.wav",
  "string-2-Cx-as-Cx4.wav",
  "string-2-D-as-D4.wav",
  "string-2-Dx-as-Dx4.wav",
  "string-3-A-as-A3.wav",
  "string-3-Ax-as-Ax3.wav",
  "string-3-G-as-G3.wav",
  "string-3-Gx-as-Gx3.wav",
  "string-4-D-as-D3.wav",
  "string-4-Dx-as-Dx3.wav",
  "string-4-E-as-E3.wav",
  "string-4-F-as-F3.wav",
  "string-4-Fx-as-Fx3.wav",
  "string-5-A-as-A2.wav",
  "string-5-Ax-as-Ax2.wav",
  "string-5-B-as-B2.wav",
  "string-5-C-as-C3.wav",
  "string-5-Cx-as-Cx3.wav",
  "string-6-D-as-D2.wav",
  "string-6-Dx-as-Dx2.wav",
  "string-6-E-as-E2.wav",
  "string-6-F-as-F2.wav",
  "string-6-Fx-as-Fx2.wav",
  "string-6-G-as-G2.wav",
  "string-6-Gx-as-Gx2.wav",
] as const;

const NOTE_PC: Record<string, number> = {
  C: 0,
  Cx: 1,
  D: 2,
  Dx: 3,
  E: 4,
  F: 5,
  Fx: 6,
  G: 7,
  Gx: 8,
  A: 9,
  Ax: 10,
  B: 11,
};

const FILE_RE = /^string-([1-6])-[A-G]x?-as-([A-G]x?)(\d)\.wav$/;

export interface SampleRef {
  file: string;
  string: StringNum;
  midi: number;
}

export function midiFromToken(token: string): number | null {
  const match = token.match(/^([A-G]x?)(\d)$/);
  if (!match) return null;
  const pc = NOTE_PC[match[1]!];
  if (pc === undefined) return null;
  return (Number(match[2]) + 1) * 12 + pc;
}

export function parseSampleFile(file: string): SampleRef | null {
  const match = file.match(FILE_RE);
  if (!match) return null;
  const midi = midiFromToken(`${match[2]}${match[3]}`);
  if (midi === null) return null;
  return { file, string: Number(match[1]) as StringNum, midi };
}

const samplesByMidi = new Map<number, SampleRef[]>();
for (const file of SAMPLE_FILES) {
  const sample = parseSampleFile(file);
  if (!sample) continue;
  const list = samplesByMidi.get(sample.midi) ?? [];
  list.push(sample);
  samplesByMidi.set(sample.midi, list);
}

export function sampleFor(string: StringNum, fret: Fret): SampleRef | null {
  const list = samplesByMidi.get(midiAt(string, fret));
  if (!list?.length) return null;
  return list.find((sample) => sample.string === string) ?? [...list].sort((a, b) => a.string - b.string)[0]!;
}

export function sampleUrl(file: string, base = "/"): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${SAMPLE_BASE}/${file}`;
}

export function fretboardSamples(): SampleRef[] {
  const seen = new Set<string>();
  const needed: SampleRef[] = [];
  for (const string of STRING_NUMS) {
    for (const fret of FRETS) {
      const sample = sampleFor(string, fret);
      if (!sample || seen.has(sample.file)) continue;
      seen.add(sample.file);
      needed.push(sample);
    }
  }
  return needed;
}
