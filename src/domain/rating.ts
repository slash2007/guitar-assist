import type { Fret, Rating } from "./types";

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

export interface LocateGradeInput {
  selected: readonly Fret[];
  answers: readonly Fret[];
  findOne: boolean;
  latencyMs: number;
  guitarInHand?: boolean;
}

export interface LocateGrade {
  rating: Rating;
  correct: boolean;
  partial: boolean;
}

export function rateLocate(input: LocateGradeInput): LocateGrade {
  const timing = timingFor(Boolean(input.guitarInHand));
  const selected = uniqueSorted(input.selected);
  const answers = uniqueSorted(input.answers);
  const answerSet = new Set(answers);
  const extra = selected.filter((fret) => !answerSet.has(fret));
  const hits = selected.filter((fret) => answerSet.has(fret));

  if (input.latencyMs >= timing.timeoutMs) {
    return { rating: 1, correct: false, partial: false };
  }
  if (extra.length > 0 || hits.length === 0) {
    return { rating: 1, correct: false, partial: false };
  }
  if (input.findOne) {
    return { rating: rateLocateTime(input.latencyMs, timing), correct: true, partial: false };
  }
  if (hits.length < answers.length) {
    return { rating: 2, correct: false, partial: true };
  }
  return { rating: rateLocateTime(input.latencyMs, timing), correct: true, partial: false };
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

function uniqueSorted(frets: readonly Fret[]): Fret[] {
  return [...new Set(frets)].sort((a, b) => a - b);
}
