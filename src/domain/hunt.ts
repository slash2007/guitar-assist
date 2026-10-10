import { locateId } from "./cards";
import type { Rng } from "./rng";
import { locateFindOne, stageDef } from "./stages";
import { fretsForPitch } from "./tuning";
import type { BoardSpot, CardId, LocateId, PitchClass, StringNum } from "./types";

export const HUNT_CAP = 3;

export function isMixStage(stage: number): boolean {
  return Boolean(stageDef(stage)?.mix);
}

export function huntPool(pitch: PitchClass, strings: readonly StringNum[]): BoardSpot[] {
  const pool: BoardSpot[] = [];
  for (const string of strings) {
    for (const fret of fretsForPitch(string, pitch)) pool.push({ string, fret });
  }
  return pool;
}

export function huntNeed(n: number, dueLike: number, rng?: Rng): number {
  const cap = Math.min(Math.max(0, n), HUNT_CAP);
  if (cap <= 1) return 1;
  if (dueLike > 0) return Math.min(cap, Math.max(1, dueLike));
  if (!rng) return Math.min(2, cap);
  const bag: number[] = [];
  for (let x = 1; x <= cap; x += 1) {
    const weight = x === 1 ? 1 : 2;
    for (let i = 0; i < weight; i += 1) bag.push(x);
  }
  return bag[Math.floor(rng() * bag.length)] ?? 1;
}

export function sameSpot(a: BoardSpot, b: BoardSpot): boolean {
  return a.string === b.string && a.fret === b.fret;
}

export function inPool(spot: BoardSpot, pool: readonly BoardSpot[]): boolean {
  return pool.some((item) => sameSpot(item, spot));
}

export function locateCardAt(spot: BoardSpot, pitch: PitchClass): LocateId {
  return locateId(spot.string, pitch);
}

export function dueLikeLocateCount(
  pitch: PitchClass,
  strings: readonly StringNum[],
  dueLike: (id: CardId) => boolean,
): number {
  return strings
    .filter((string) => fretsForPitch(string, pitch).length > 0)
    .map((string) => locateId(string, pitch))
    .filter((id) => dueLike(id)).length;
}

export function pickHuntTargets(
  pitch: PitchClass,
  strings: readonly StringNum[],
  need: number,
  rank: (id: LocateId) => number,
): LocateId[] {
  return strings
    .filter((string) => fretsForPitch(string, pitch).length > 0)
    .map((string) => locateId(string, pitch))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, Math.max(1, need));
}

export function singleLocateNeed(string: StringNum, pitch: PitchClass, stage: number): number {
  const pool = huntPool(pitch, [string]);
  if (locateFindOne(stage)) return 1;
  return pool.length;
}
