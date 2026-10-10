import {
  CHROMATIC_PITCHES,
  FRETS,
  PITCH_CLASSES,
  STRING_NUMS,
  type ChromaticPitch,
  type Fret,
  type PitchClass,
  type StringNum,
} from "./types";

/** Standard tuning open-string MIDI numbers. String 1 is high E. */
export const OPEN_MIDI: Record<StringNum, number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
};

export function midiAt(string: StringNum, fret: Fret): number {
  return OPEN_MIDI[string] + fret;
}

export function frequencyAt(string: StringNum, fret: Fret): number {
  return 440 * 2 ** ((midiAt(string, fret) - 69) / 12);
}

export function chromaticNameAt(string: StringNum, fret: Fret): ChromaticPitch {
  return CHROMATIC_PITCHES[midiAt(string, fret) % 12]!;
}

export function pitchClassAt(string: StringNum, fret: Fret): PitchClass | null {
  const name = chromaticNameAt(string, fret);
  return (PITCH_CLASSES as readonly string[]).includes(name) ? (name as PitchClass) : null;
}

export function isNatural(string: StringNum, fret: Fret): boolean {
  return pitchClassAt(string, fret) !== null;
}

export function fretsForPitch(string: StringNum, pitch: PitchClass): Fret[] {
  return FRETS.filter((fret) => pitchClassAt(string, fret) === pitch);
}

export function naturalPositionsOn(string: StringNum): Array<{ fret: Fret; pitch: PitchClass }> {
  const found: Array<{ fret: Fret; pitch: PitchClass }> = [];
  for (const fret of FRETS) {
    const pitch = pitchClassAt(string, fret);
    if (pitch) found.push({ fret, pitch });
  }
  return found;
}

export function allNaturalPositions(): Array<{ string: StringNum; fret: Fret; pitch: PitchClass }> {
  const found: Array<{ string: StringNum; fret: Fret; pitch: PitchClass }> = [];
  for (const string of STRING_NUMS) {
    for (const pos of naturalPositionsOn(string)) {
      found.push({ string, ...pos });
    }
  }
  return found;
}

export function neighborString(string: StringNum, delta: -1 | 1): StringNum | null {
  const next = string + delta;
  return next >= 1 && next <= 6 ? (next as StringNum) : null;
}

export function neighborFret(fret: Fret, delta: number): Fret | null {
  const next = fret + delta;
  return next >= 0 && next <= 12 ? (next as Fret) : null;
}
