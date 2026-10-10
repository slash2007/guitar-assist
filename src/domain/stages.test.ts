import { describe, expect, it } from "vitest";
import { nextStage, unlockedStrings } from "./stages";

describe("stage path", () => {
  it("unlocks from the low E string", () => {
    expect(unlockedStrings(1)).toEqual([6]);
  });

  it("advances one stage at a time", () => {
    expect(nextStage(1)).toBe(2);
    expect(nextStage(2)).toBe(3);
    expect(nextStage(9)).toBe(10);
    expect(nextStage(10)).toBe(10);
  });
});
