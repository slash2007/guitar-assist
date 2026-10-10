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

describe("evaluateGate", () => {
  it("stays closed until coverage and speed are both there", () => {
    const closed = evaluateGate(1, [
      attempt(identifyId(6, 0), true, 1200, "2026-01-01T00:00:00.000Z"),
      attempt(locateId(6, "E"), true, 1400, "2026-01-01T00:00:01.000Z"),
    ]);
    expect(closed.passed).toBe(false);

    const cards = cardsForStage(1);
    const filled: Attempt[] = [];
    let i = 0;
    for (const id of cards) {
      filled.push(attempt(id, true, 1500, `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`));
      i += 1;
      filled.push(attempt(id, true, 1600, `2026-01-01T00:01:${String(i).padStart(2, "0")}.000Z`));
      i += 1;
    }
    const opened = evaluateGate(1, filled, false);
    expect(opened.passed).toBe(true);
    expect(primaryBlocker(1, opened)).toBe("ready");
  });

  it("uses a looser speed gate when practicing with a guitar", () => {
    const cards = cardsForStage(1);
    const filled: Attempt[] = [];
    let i = 0;
    for (const id of cards) {
      filled.push(attempt(id, true, 3000, `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`));
      i += 1;
      filled.push(attempt(id, true, 3200, `2026-01-01T00:01:${String(i).padStart(2, "0")}.000Z`));
      i += 1;
    }
    expect(evaluateGate(1, filled, false).passed).toBe(false);
    expect(evaluateGate(1, filled, true).passed).toBe(true);
  });

  it("treats one pass through every unit as coverage-repeat, not practiced-enough", () => {
    const cards = cardsForStage(1);
    const once: Attempt[] = cards.map((id, i) =>
      attempt(id, true, 1500, `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const gate = evaluateGate(1, once, false);
    expect(gate.seenCards).toBe(gate.totalCards);
    expect(gate.coveredCards).toBe(0);
    expect(primaryBlocker(1, gate)).toBe("coverage-repeat");
  });
});
