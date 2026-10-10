import type { BoardSpot, Rating } from "./types";

export interface Timing {
  timeoutMs: number;
  identifyEasyMs: number;
  identifyGoodMs: number;
  locateEasyMs: number;
  locateGoodMs: number;
}

/** Screen-only (no guitar). Kept as named constants for tests. */
export const TIMEOUT_MS = 8_000;
export const IDENTIFY_EASY_MS = 2_000;
export const IDENTIFY_GOOD_MS = 4_000;
export const LOCATE_EASY_MS = 2_500;
export const LOCATE_GOOD_MS = 5_000;

const SCREEN: Timing = {
  timeoutMs: TIMEOUT_MS,
  identifyEasyMs: IDENTIFY_EASY_MS,
  identifyGoodMs: IDENTIFY_GOOD_MS,
  locateEasyMs: LOCATE_EASY_MS,
  locateGoodMs: LOCATE_GOOD_MS,
};

const GUITAR: Timing = {
  timeoutMs: 12_000,
  identifyEasyMs: 3_500,
  identifyGoodMs: 6_500,
  locateEasyMs: 4_500,
  locateGoodMs: 8_000,
};

export function timingFor(guitarInHand: boolean): Timing {
  return guitarInHand ? GUITAR : SCREEN;
}

export function rateIdentify(correct: boolean, latencyMs: number, guitarInHand = false): Rating {
  const timing = timingFor(guitarInHand);
  if (!correct || latencyMs >= timing.timeoutMs) return 1;
  if (latencyMs > timing.identifyGoodMs) return 2;
  if (latencyMs > timing.identifyEasyMs) return 3;
  return 4;
}

export function locateTimeoutMs(need: number, guitarInHand: boolean): number {
  const timing = timingFor(guitarInHand);
  return timing.timeoutMs + (Math.max(1, need) - 1) * timing.locateEasyMs;
}

export function locateAverageMs(elapsedMs: number, need: number): number {
  return Math.round(elapsedMs / Math.max(1, need));
}

export interface LocateGradeInput {
  selected: readonly BoardSpot[];
  pool: readonly BoardSpot[];
  need: number;
  elapsedMs: number;
  guitarInHand?: boolean;
  allowPartial?: boolean;
}

export interface LocateGrade {
  rating: Rating;
  correct: boolean;
  partial: boolean;
}

export function rateLocate(input: LocateGradeInput): LocateGrade {
  const timing = timingFor(Boolean(input.guitarInHand));
  const need = Math.max(1, input.need);
  const timeoutMs = locateTimeoutMs(need, Boolean(input.guitarInHand));
  const hits = input.selected.filter((spot) =>
    input.pool.some((item) => item.string === spot.string && item.fret === spot.fret),
  );
  const extra = input.selected.filter(
    (spot) => !input.pool.some((item) => item.string === spot.string && item.fret === spot.fret),
  );
  const uniqueHits = uniqueSpots(hits);

  if (input.elapsedMs >= timeoutMs) {
    if (input.allowPartial && extra.length === 0 && uniqueHits.length > 0 && uniqueHits.length < need) {
      return { rating: 2, correct: false, partial: true };
    }
    return { rating: 1, correct: false, partial: false };
  }
  if (extra.length > 0 || uniqueHits.length === 0) {
    return { rating: 1, correct: false, partial: false };
  }
  if (uniqueHits.length < need) {
    if (input.allowPartial) return { rating: 2, correct: false, partial: true };
    return { rating: 1, correct: false, partial: false };
  }
  return {
    rating: rateLocateTime(locateAverageMs(input.elapsedMs, need), timing),
    correct: true,
    partial: false,
  };
}

function rateLocateTime(latencyMs: number, timing: Timing): Rating {
  if (latencyMs > timing.locateGoodMs) return 2;
  if (latencyMs > timing.locateEasyMs) return 3;
  return 4;
}

export function speedBand(
  latencyMs: number,
  guitarInHand: boolean,
  kind: "identify" | "locate",
): "fast" | "ok" | "slow" {
  const timing = timingFor(guitarInHand);
  const easy = kind === "identify" ? timing.identifyEasyMs : timing.locateEasyMs;
  const good = kind === "identify" ? timing.identifyGoodMs : timing.locateGoodMs;
  if (latencyMs <= easy) return "fast";
  if (latencyMs <= good) return "ok";
  return "slow";
}

function uniqueSpots(spots: readonly BoardSpot[]): BoardSpot[] {
  const seen = new Set<string>();
  const unique: BoardSpot[] = [];
  for (const spot of spots) {
    const key = `${spot.string}:${spot.fret}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(spot);
  }
  return unique;
}
