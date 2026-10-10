import { isIdentifyId } from "./cards";
import { timingFor } from "./rating";
import { cardsForStage } from "./stages";
import { accuracy, median } from "./stats";
import type { Attempt, CardId } from "./types";

const MIN_ATTEMPTS_PER_CARD = 2;
const MIN_STAGE_ATTEMPTS = 24;
const MIN_ACCURACY = 0.9;
const RECENT_PER_CARD = 4;

export interface GateReport {
  passed: boolean;
  identifyMedianMs: number | null;
  locateMedianMs: number | null;
  accuracy: number | null;
  identifyGapMs: number | null;
  locateGapMs: number | null;
  coveredCards: number;
  seenCards: number;
  totalCards: number;
  attemptCount: number;
  identifyTargetMs: number;
  locateTargetMs: number;
  coverageOk: boolean;
  identifyOk: boolean;
  locateOk: boolean;
  accuracyOk: boolean;
  volumeOk: boolean;
}

export type GateBlocker =
  | "coverage-repeat"
  | "coverage"
  | "identify"
  | "locate"
  | "accuracy"
  | "volume"
  | "ready"
  | "open";

export function evaluateGate(
  stage: number,
  attempts: readonly Attempt[],
  guitarInHand = false,
): GateReport {
  const timing = timingFor(guitarInHand);
  const cards = cardsForStage(stage);
  const cardSet = new Set<CardId>(cards);
  const recent = recentByCard(attempts.filter((item) => cardSet.has(item.cardId)));

  const identify = recent.filter((item) => isIdentifyId(item.cardId));
  const locate = recent.filter((item) => !isIdentifyId(item.cardId));
  const identifyMedianMs = median(identify.map((item) => item.latencyMs));
  const locateMedianMs = median(locate.map((item) => item.latencyMs));
  const acc = accuracy(recent.map((item) => item.correct));

  const counts = new Map<CardId, number>();
  for (const item of recent) {
    counts.set(item.cardId, (counts.get(item.cardId) ?? 0) + 1);
  }
  const coveredCards = cards.filter((id) => (counts.get(id) ?? 0) >= MIN_ATTEMPTS_PER_CARD).length;
  const seenCards = cards.filter((id) => (counts.get(id) ?? 0) >= 1).length;

  const identifyOk = identifyMedianMs !== null && identifyMedianMs <= timing.identifyEasyMs;
  const locateOk = locateMedianMs !== null && locateMedianMs <= timing.locateEasyMs;
  const accuracyOk = (acc ?? 0) >= MIN_ACCURACY;
  const coverageOk = coveredCards === cards.length;
  const volumeOk = recent.length >= MIN_STAGE_ATTEMPTS;

  return {
    passed: identifyOk && locateOk && accuracyOk && coverageOk && volumeOk,
    identifyMedianMs,
    locateMedianMs,
    accuracy: acc,
    identifyGapMs: identifyMedianMs === null ? null : Math.max(0, identifyMedianMs - timing.identifyEasyMs),
    locateGapMs: locateMedianMs === null ? null : Math.max(0, locateMedianMs - timing.locateEasyMs),
    coveredCards,
    seenCards,
    totalCards: cards.length,
    attemptCount: recent.length,
    identifyTargetMs: timing.identifyEasyMs,
    locateTargetMs: timing.locateEasyMs,
    coverageOk,
    identifyOk,
    locateOk,
    accuracyOk,
    volumeOk,
  };
}

export function primaryBlocker(stage: number, gate: GateReport): GateBlocker {
  if (stage >= 10 && gate.passed) return "open";
  if (!gate.coverageOk) {
    if (gate.seenCards >= gate.totalCards && gate.coveredCards < gate.totalCards) return "coverage-repeat";
    return "coverage";
  }
  if (!gate.identifyOk) return "identify";
  if (!gate.locateOk) return "locate";
  if (!gate.accuracyOk) return "accuracy";
  if (!gate.volumeOk) return "volume";
  if (stage >= 10) return "open";
  return "ready";
}

function recentByCard(attempts: readonly Attempt[]): Attempt[] {
  const grouped = new Map<CardId, Attempt[]>();
  const ordered = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  for (const item of ordered) {
    const list = grouped.get(item.cardId) ?? [];
    list.push(item);
    grouped.set(item.cardId, list);
  }
  const windowed: Attempt[] = [];
  for (const list of grouped.values()) {
    windowed.push(...list.slice(-RECENT_PER_CARD));
  }
  return windowed;
}
