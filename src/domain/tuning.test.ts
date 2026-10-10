import { describe, expect, it } from "vitest";
import { allSkillCards, identifyCardsOn, locateCardsOn, naturalCount } from "./cards";
import { fretsForPitch, pitchClassAt } from "./tuning";

describe("tuning", () => {
  it("maps open strings to standard pitch classes", () => {
    expect(pitchClassAt(6, 0)).toBe("E");
    expect(pitchClassAt(5, 0)).toBe("A");
    expect(pitchClassAt(4, 0)).toBe("D");
    expect(pitchClassAt(3, 0)).toBe("G");
    expect(pitchClassAt(2, 0)).toBe("B");
    expect(pitchClassAt(1, 0)).toBe("E");
  });

  it("treats accidentals as out of scope", () => {
    expect(pitchClassAt(6, 1)).toBe("F");
    expect(pitchClassAt(6, 2)).toBeNull();
    expect(pitchClassAt(6, 3)).toBe("G");
  });

  it("finds both octaves of E on the low E string", () => {
    expect(fretsForPitch(6, "E")).toEqual([0, 12]);
    expect(fretsForPitch(6, "G")).toEqual([3]);
  });

  it("counts first-phase natural skill units", () => {
    const counts = naturalCount();
    expect(identifyCardsOn(6)).toHaveLength(8);
    expect(counts.identify).toBe(48);
    expect(counts.locate).toBe(42);
    expect(allSkillCards()).toHaveLength(counts.identify + counts.locate);
    expect(locateCardsOn(6)).toHaveLength(7);
  });
});
