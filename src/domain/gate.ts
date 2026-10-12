import { isIdentifyId } from "./cards";
import { isMixStage } from "./hunt";
import { timingFor } from "./rating";
import { cardsForStage } from "./stages";
import { accuracy, median, tenthsSec } from "./stats";
import type { Attempt, CardId } from "./types";

const MIN_ACCURACY = 0.9;
const RECENT_PER_CARD = 4;

export interface GateReport {
  passed: boolean;
  identifyMedianMs: number | null;
  locateMedianMs: number | null;
  accuracy: number | null;
  identifyGapMs: number | null;
  locateGapMs: number | null;
  seenCards: number;
  totalCards: number;
  attemptCount: number;
  identifyTargetMs: number;
  locateTargetMs: number;
  needsSeen: boolean;
  coverageOk: boolean;
  identifyOk: boolean;
  locateOk: boolean;
  accuracyOk: boolean;
}

export type GateBlocker = "coverage" | "identify" | "locate" | "accuracy" | "ready" | "open";

export function evaluateGate(
  stage: number,
  attempts: readonly Attempt[],
  guitarInHand = false,
): GateReport {
  const timing = timingFor(guitarInHand);
  const cards = cardsForStage(stage);
  const cardSet = new Set<CardId>(cards);
  const staged = attempts.filter((item) => cardSet.has(item.cardId));
  const recent = recentByCard(staged);
  const recentCorrect = recentByCard(staged.filter((item) => item.correct));

  const identify = recentCorrect.filter((item) => isIdentifyId(item.cardId));
  const locate = recentCorrect.filter((item) => !isIdentifyId(item.cardId));
  const identifyMedianMs = median(identify.map((item) => item.latencyMs));
  const locateMedianMs = median(locate.map((item) => item.latencyMs));
  const acc = accuracy(recent.map((item) => item.correct));

  const counts = new Map<CardId, number>();
  for (const item of recent) {
    counts.set(item.cardId, (counts.get(item.cardId) ?? 0) + 1);
  }
  const seenCards = cards.filter((id) => (counts.get(id) ?? 0) >= 1).length;
  const needsSeen = !isMixStage(stage);

  const identifyOk = speedOk(identifyMedianMs, timing.identifyEasyMs);
  const locateOk = speedOk(locateMedianMs, timing.locateEasyMs);
  const accuracyOk = (acc ?? 0) >= MIN_ACCURACY;
  const coverageOk = !needsSeen || seenCards === cards.length;

  return {
    passed: identifyOk && locateOk && accuracyOk && coverageOk,
    identifyMedianMs,
    locateMedianMs,
    accuracy: acc,
    identifyGapMs: speedGapMs(identifyMedianMs, timing.identifyEasyMs),
    locateGapMs: speedGapMs(locateMedianMs, timing.locateEasyMs),
    seenCards,
    totalCards: cards.length,
    attemptCount: recent.length,
    identifyTargetMs: timing.identifyEasyMs,
    locateTargetMs: timing.locateEasyMs,
    needsSeen,
    coverageOk,
    identifyOk,
    locateOk,
    accuracyOk,
  };
}

export function primaryBlocker(stage: number, gate: GateReport): GateBlocker {
  if (stage >= 10 && gate.passed) return "open";
  if (!gate.coverageOk) return "coverage";
  if (!gate.identifyOk) return "identify";
  if (!gate.locateOk) return "locate";
  if (!gate.accuracyOk) return "accuracy";
  if (stage >= 10) return "open";
  return "ready";
}

function speedOk(medianMs: number | null, targetMs: number): boolean {
  return medianMs !== null && tenthsSec(medianMs) <= tenthsSec(targetMs);
}

function speedGapMs(medianMs: number | null, targetMs: number): number | null {
  if (medianMs === null) return null;
  return Math.max(0, Math.round((tenthsSec(medianMs) - tenthsSec(targetMs)) * 1000));
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
