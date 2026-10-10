import { describe, expect, it } from "vitest";
import { huntNeed, huntPool, isMixStage, pickHuntTargets } from "./hunt";

describe("isMixStage", () => {
  it("marks only mix stages", () => {
    expect(isMixStage(1)).toBe(false);
    expect(isMixStage(2)).toBe(false);
    expect(isMixStage(3)).toBe(true);
    expect(isMixStage(4)).toBe(false);
    expect(isMixStage(5)).toBe(true);
    expect(isMixStage(9)).toBe(true);
    expect(isMixStage(10)).toBe(true);
  });
});

describe("huntNeed", () => {
  it("caps at three and at the pool size", () => {
    expect(huntNeed(0, 0)).toBe(1);
    expect(huntNeed(1, 4)).toBe(1);
    expect(huntNeed(8, 8)).toBe(3);
  });

  it("follows due-like cards when any exist", () => {
    expect(huntNeed(3, 1)).toBe(1);
    expect(huntNeed(3, 2)).toBe(2);
    expect(huntNeed(3, 9)).toBe(3);
  });

  it("biases toward more than one when nothing is due", () => {
    const picks = Array.from({ length: 40 }, (_, i) => huntNeed(3, 0, () => (i % 5) / 5));
    expect(picks.every((n) => n >= 1 && n <= 3)).toBe(true);
    expect(picks.some((n) => n > 1)).toBe(true);
  });
});

describe("huntPool", () => {
  it("collects the pitch across the given strings", () => {
    expect(huntPool("A", [6, 5])).toEqual([
      { string: 6, fret: 5 },
      { string: 5, fret: 0 },
      { string: 5, fret: 12 },
    ]);
  });
});

describe("pickHuntTargets", () => {
  it("takes the hottest locate cards first", () => {
    const rank = (id: string) => (id === "loc:5:A" ? 0 : 10);
    expect(pickHuntTargets("A", [6, 5], 1, rank)).toEqual(["loc:5:A"]);
  });
});
