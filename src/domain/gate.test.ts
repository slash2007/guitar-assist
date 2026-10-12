import { describe, expect, it } from "vitest";
import { identifyId, locateId } from "./cards";
import { evaluateGate, primaryBlocker } from "./gate";
import { cardsForStage } from "./stages";
import type { Attempt } from "./types";

function attempt(cardId: Attempt["cardId"], correct: boolean, latencyMs: number, at: string): Attempt {
  return {
    id: `${cardId}-${at}`,
    cardId,
    at,
    correct,
    latencyMs,
    rating: correct ? 4 : 1,
    guitarInHand: true,
  };
}

function fillStage(stage: number, latencyMs: number): Attempt[] {
  return cardsForStage(stage).map((id, i) =>
    attempt(id, true, latencyMs, `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`),
  );
}

describe("evaluateGate", () => {
  it("keeps a single-string stage closed until every card has been seen", () => {
    const closed = evaluateGate(1, [
      attempt(identifyId(6, 0), true, 1200, "2026-01-01T00:00:00.000Z"),
      attempt(locateId(6, "E"), true, 1400, "2026-01-01T00:00:01.000Z"),
    ]);
    expect(closed.needsSeen).toBe(true);
    expect(closed.passed).toBe(false);
    expect(primaryBlocker(1, closed)).toBe("coverage");

    const opened = evaluateGate(1, fillStage(1, 1500), false);
    expect(opened.passed).toBe(true);
    expect(opened.seenCards).toBe(opened.totalCards);
    expect(primaryBlocker(1, opened)).toBe("ready");
  });

  it("uses a looser speed gate when practicing with a guitar", () => {
    const filled = fillStage(1, 3000);
    expect(evaluateGate(1, filled, false).passed).toBe(false);
    expect(evaluateGate(1, filled, true).passed).toBe(true);
  });

  it("does not require every mix-stage card to have been seen", () => {
    const mix = evaluateGate(
      3,
      [
        attempt(identifyId(6, 0), true, 1200, "2026-01-01T00:00:00.000Z"),
        attempt(locateId(6, "E"), true, 1400, "2026-01-01T00:00:01.000Z"),
      ],
      false,
    );
    expect(mix.needsSeen).toBe(false);
    expect(mix.coverageOk).toBe(true);
    expect(mix.passed).toBe(true);
    expect(primaryBlocker(3, mix)).toBe("ready");
  });
});
