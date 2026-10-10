import { allNaturalPositions, fretsForPitch, naturalPositionsOn, pitchClassAt } from "./tuning";
import {
  PITCH_CLASSES,
  STRING_NUMS,
  type CardId,
  type Fret,
  type IdentifyId,
  type LocateId,
  type PitchClass,
  type StringNum,
} from "./types";

export function identifyId(string: StringNum, fret: Fret): IdentifyId {
  return `id:${string}:${fret}`;
}

export function locateId(string: StringNum, pitch: PitchClass): LocateId {
  return `loc:${string}:${pitch}`;
}

export function isIdentifyId(id: CardId): id is IdentifyId {
  return id.startsWith("id:");
}

export function isLocateId(id: CardId): id is LocateId {
  return id.startsWith("loc:");
}

export function parseIdentifyId(id: IdentifyId): { string: StringNum; fret: Fret } {
  const [, stringRaw, fretRaw] = id.split(":");
  return { string: Number(stringRaw) as StringNum, fret: Number(fretRaw) as Fret };
}

export function parseLocateId(id: LocateId): { string: StringNum; pitch: PitchClass } {
  const [, stringRaw, pitch] = id.split(":");
  return { string: Number(stringRaw) as StringNum, pitch: pitch as PitchClass };
}

export function stringOfCard(id: CardId): StringNum {
  return Number(id.split(":")[1]) as StringNum;
}

export function identifyCardsOn(string: StringNum): IdentifyId[] {
  return naturalPositionsOn(string).map((pos) => identifyId(string, pos.fret));
}

export function locateCardsOn(string: StringNum): LocateId[] {
  return PITCH_CLASSES.filter((pitch) => fretsForPitch(string, pitch).length > 0).map((pitch) =>
    locateId(string, pitch),
  );
}

export function cardsOnStrings(strings: readonly StringNum[]): CardId[] {
  return strings.flatMap((string) => [...identifyCardsOn(string), ...locateCardsOn(string)]);
}

export function allSkillCards(): CardId[] {
  return cardsOnStrings(STRING_NUMS);
}

export function positionsOf(id: CardId): Array<{ string: StringNum; fret: Fret }> {
  if (isIdentifyId(id)) {
    const parsed = parseIdentifyId(id);
    return [{ string: parsed.string, fret: parsed.fret }];
  }
  const parsed = parseLocateId(id);
  return fretsForPitch(parsed.string, parsed.pitch).map((fret) => ({
    string: parsed.string,
    fret,
  }));
}

export function assertNaturalIdentify(string: StringNum, fret: Fret): PitchClass {
  const pitch = pitchClassAt(string, fret);
  if (!pitch) {
    throw new Error(`Not a natural note: string ${string} fret ${fret}`);
  }
  return pitch;
}

export function naturalCount(): { identify: number; locate: number } {
  return {
    identify: allNaturalPositions().length,
    locate: STRING_NUMS.reduce((sum, string) => sum + locateCardsOn(string).length, 0),
  };
}
