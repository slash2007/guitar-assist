import { describe, expect, it } from "vitest";
import { identifyId, locateId } from "./cards";
import { evaluateGate, primaryBlocker, type GateRound } from "./gate";
import { cardsForStage } from "./stages";
import type { Attempt, CardId } from "./types";

const ROUND: GateRound = { startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:10:00.000Z" };

function attempt(
  cardId: CardId,
  correct: boolean,
  latencyMs: number,
  at: string,
  guitarInHand = false,
): Attempt {
  return {
    id: `${cardId}-${at}`,
    cardId,
    at,
    correct,
    latencyMs,
    rating: correct ? 4 : 1,
    guitarInHand,
  };
}

function fillStage(stage: number, latencyMs: number, guitarInHand = false): Attempt[] {
  return cardsForStage(stage).map((id, i) =>
    attempt(id, true, latencyMs, `2026-01-01T00:0${Math.floor(i / 60)}:${String(i % 60).padStart(2, "0")}.000Z`, guitarInHand),
  );
}

describe("evaluateGate", () => {
  it("keeps a single-string stage closed until every card has been seen", () => {
    const closed = evaluateGate(
      1,
      [
        attempt(identifyId(6, 0), true, 1200, "2026-01-01T00:00:01.000Z"),
        attempt(locateId(6, "E"), true, 1400, "2026-01-01T00:00:02.000Z"),
      ],
      false,
      ROUND,
    );
    expect(closed.needsSeen).toBe(true);
    expect(closed.passed).toBe(false);
    expect(primaryBlocker(1, closed)).toBe("coverage");

    const opened = evaluateGate(1, fillStage(1, 1500), false, ROUND);
    expect(opened.passed).toBe(true);
    expect(opened.seenCards).toBe(opened.totalCards);
    expect(primaryBlocker(1, opened)).toBe("ready");
  });

  it("uses the round's guitar timing, not a later setting", () => {
    const filled = fillStage(1, 3000, true);
    expect(evaluateGate(1, filled, false, ROUND).passed).toBe(true);
    expect(evaluateGate(1, fillStage(1, 3000, false), true, ROUND).passed).toBe(false);
  });

  it("treats a 2.0s display time as on target", () => {
    expect(evaluateGate(1, fillStage(1, 2049), false, ROUND).passed).toBe(true);
    const justOutside = evaluateGate(1, fillStage(1, 2050), false, ROUND);
    expect(justOutside.identifyOk).toBe(false);
    expect(justOutside.slowestIdentifyMs).toBe(2050);
    expect(primaryBlocker(1, justOutside)).toBe("identify");
  });

  it("fails the round when any correct answer is over the target", () => {
    const fast = fillStage(1, 1200);
    const slow = attempt(identifyId(6, 0), true, 4000, "2026-01-01T00:00:00.500Z");
    const gate = evaluateGate(1, [...fast.filter((item) => item.cardId !== slow.cardId), slow], false, ROUND);
    expect(gate.accuracyOk).toBe(true);
    expect(gate.identifyOk).toBe(false);
    expect(gate.passed).toBe(false);
  });

  it("scores only the latest finished round", () => {
    const first = cardsForStage(1).map((id, i) =>
      attempt(id, false, 7000, `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const second = cardsForStage(1).map((id, i) =>
      attempt(id, true, 1100, `2026-01-02T00:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const gate = evaluateGate(1, [...first, ...second], false, {
      startedAt: "2026-01-02T00:00:00.000Z",
      endedAt: "2026-01-02T00:10:00.000Z",
    });
    expect(gate.accuracy).toBe(1);
    expect(gate.passed).toBe(true);
  });

  it("does not let one fast correct stand in for a missed question type", () => {
    const named = cardsForStage(1)
      .filter((id) => id.startsWith("id:"))
      .map((id, i) => attempt(id, true, 1000, `2026-01-01T00:01:${String(i).padStart(2, "0")}.000Z`));
    const extra = attempt(identifyId(6, 0), true, 1000, "2026-01-01T00:01:30.000Z");
    const missed = attempt(locateId(6, "E"), false, 200, "2026-01-01T00:02:00.000Z");
    const seen = cardsForStage(1).map((id, i) =>
      attempt(id, false, 100, `2025-12-01T00:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const gate = evaluateGate(1, [...seen, ...named, extra, missed], false, ROUND);
    expect(gate.accuracyOk).toBe(true);
    expect(gate.locateOk).toBe(false);
    expect(primaryBlocker(1, gate)).toBe("locate");
  });

  it("counts a multi-card locate as one question", () => {
    const named = cardsForStage(1)
      .filter((id) => id.startsWith("id:"))
      .map((id, i) => attempt(id, true, 1000, `2026-01-01T00:01:${String(i).padStart(2, "0")}.000Z`));
    const extra = attempt(identifyId(6, 0), true, 1000, "2026-01-01T00:01:30.000Z");
    const missed = [
      attempt(locateId(6, "E"), false, 200, "2026-01-01T00:02:00.000Z"),
      attempt(locateId(6, "A"), false, 200, "2026-01-01T00:02:00.000Z"),
    ];
    const gate = evaluateGate(1, [...named, extra, ...missed], false, ROUND);
    expect(gate.accuracy).toBe(0.9);
    expect(gate.locateCorrect).toBe(0);
  });

  it("does not require every mix-stage card to have been seen", () => {
    const mix = evaluateGate(
      3,
      [
        attempt(identifyId(6, 0), true, 1200, "2026-01-01T00:00:01.000Z"),
        attempt(locateId(6, "E"), true, 1400, "2026-01-01T00:00:02.000Z"),
      ],
      false,
      ROUND,
    );
    expect(mix.needsSeen).toBe(false);
    expect(mix.coverageOk).toBe(true);
    expect(mix.passed).toBe(true);
  });

  it("waits for a finished round before scoring speed", () => {
    const gate = evaluateGate(3, fillStage(3, 1000), false, null);
    expect(gate.hasRound).toBe(false);
    expect(gate.passed).toBe(false);
    expect(primaryBlocker(3, gate)).toBe("round");
  });
});
