import { isIdentifyId } from "./cards";
import { isMixStage } from "./hunt";
import { timingFor } from "./rating";
import { cardsForStage } from "./stages";
import { tenthsSec } from "./stats";
import type { Attempt, CardId, SessionSummary } from "./types";

const MIN_ACCURACY = 0.9;

export interface GateRound {
  startedAt: string;
  endedAt: string;
}

export interface GateReport {
  passed: boolean;
  hasRound: boolean;
  accuracy: number | null;
  identifyAsked: boolean;
  locateAsked: boolean;
  identifyCorrect: number;
  locateCorrect: number;
  slowestIdentifyMs: number | null;
  slowestLocateMs: number | null;
  seenCards: number;
  totalCards: number;
  identifyTargetMs: number;
  locateTargetMs: number;
  needsSeen: boolean;
  coverageOk: boolean;
  identifyOk: boolean;
  locateOk: boolean;
  accuracyOk: boolean;
}

export type GateBlocker = "coverage" | "round" | "identify" | "locate" | "accuracy" | "ready" | "open";

export function latestStageRound(stage: number, summaries: readonly SessionSummary[]): GateRound | null {
  const found = summaries.find((item) => item.stage === stage && item.startedAt && item.answered > 0);
  if (!found?.startedAt) return null;
  return { startedAt: found.startedAt, endedAt: found.at };
}

export function evaluateGate(
  stage: number,
  attempts: readonly Attempt[],
  guitarInHand = false,
  round: GateRound | null = null,
): GateReport {
  const cards = cardsForStage(stage);
  const cardSet = new Set<CardId>(cards);
  const seenCards = cards.filter((id) => attempts.some((item) => item.cardId === id)).length;
  const needsSeen = !isMixStage(stage);
  const coverageOk = !needsSeen || seenCards === cards.length;

  const roundAttempts = round
    ? attempts.filter(
        (item) => cardSet.has(item.cardId) && item.at >= round.startedAt && item.at <= round.endedAt,
      )
    : [];
  const questions = groupQuestions(roundAttempts);
  const hasRound = questions.length > 0;
  const identify = questions.filter((item) => item.kind === "identify");
  const locate = questions.filter((item) => item.kind === "locate");
  const identifyCorrect = identify.filter((item) => item.correct);
  const locateCorrect = locate.filter((item) => item.correct);
  const identifyAsked = identify.length > 0;
  const locateAsked = locate.length > 0;
  const slowIdentify = identifyCorrect.filter((item) => !withinTarget(item, "identify"));
  const slowLocate = locateCorrect.filter((item) => !withinTarget(item, "locate"));
  const accuracy = hasRound ? questions.filter((item) => item.correct).length / questions.length : null;

  const identifyOk = hasRound && (!identifyAsked || (identifyCorrect.length > 0 && slowIdentify.length === 0));
  const locateOk = hasRound && (!locateAsked || (locateCorrect.length > 0 && slowLocate.length === 0));
  const accuracyOk = accuracy !== null && accuracy >= MIN_ACCURACY;

  const sample = questions[0];
  const timing = timingFor(sample ? sample.guitarInHand : guitarInHand);

  return {
    passed: coverageOk && identifyOk && locateOk && accuracyOk,
    hasRound,
    accuracy,
    identifyAsked,
    locateAsked,
    identifyCorrect: identifyCorrect.length,
    locateCorrect: locateCorrect.length,
    slowestIdentifyMs: slowest(slowIdentify),
    slowestLocateMs: slowest(slowLocate),
    seenCards,
    totalCards: cards.length,
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
  if (!gate.hasRound) return "round";
  if (!gate.identifyOk) return "identify";
  if (!gate.locateOk) return "locate";
  if (!gate.accuracyOk) return "accuracy";
  if (stage >= 10) return "open";
  return "ready";
}

interface RoundQuestion {
  kind: "identify" | "locate";
  correct: boolean;
  latencyMs: number;
  guitarInHand: boolean;
}

function groupQuestions(attempts: readonly Attempt[]): RoundQuestion[] {
  const grouped = new Map<string, Attempt[]>();
  for (const item of attempts) {
    const list = grouped.get(item.at) ?? [];
    list.push(item);
    grouped.set(item.at, list);
  }
  return [...grouped.values()].map((group) => ({
    kind: isIdentifyId(group[0]!.cardId) ? "identify" : "locate",
    correct: group.every((item) => item.correct),
    latencyMs: group[0]!.latencyMs,
    guitarInHand: group[0]!.guitarInHand,
  }));
}

function withinTarget(question: RoundQuestion, kind: "identify" | "locate"): boolean {
  const timing = timingFor(question.guitarInHand);
  const target = kind === "identify" ? timing.identifyEasyMs : timing.locateEasyMs;
  return tenthsSec(question.latencyMs) <= tenthsSec(target);
}

function slowest(questions: readonly RoundQuestion[]): number | null {
  if (questions.length === 0) return null;
  return Math.max(...questions.map((item) => item.latencyMs));
}
