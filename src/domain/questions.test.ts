import { describe, expect, it } from "vitest";
import {
  applyLocateTap,
  buildIdentifyQuestion,
  buildLocateQuestion,
  buildMixLocateQuestion,
  isLocateHunt,
  locateCardUpdates,
} from "./questions";

describe("questions", () => {
  it("lists all twelve chromatic pitches as identify options", () => {
    const q = buildIdentifyQuestion(6, 3);
    expect(q.answer).toBe("G");
    expect(q.options).toEqual(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
  });

  it("keeps single-string stages on that string", () => {
    const all = buildLocateQuestion(6, "E", 4);
    expect(all.pool).toEqual([
      { string: 6, fret: 0 },
      { string: 6, fret: 12 },
    ]);
    expect(all.need).toBe(2);
    expect(all.strings).toEqual([6]);
    expect(isLocateHunt(all)).toBe(false);
    expect(buildLocateQuestion(6, "E", 1).need).toBe(1);
  });

  it("builds a mix hunt that is not locked to one string", () => {
    const q = buildMixLocateQuestion("loc:6:A", 3, new Map(), () => true, () => 0);
    expect(isLocateHunt(q)).toBe(true);
    expect(q.strings).toEqual([6, 5]);
    expect(q.need).toBe(2);
    expect(q.pool).toEqual([
      { string: 6, fret: 5 },
      { string: 5, fret: 0 },
      { string: 5, fret: 12 },
    ]);
    expect(q.targets).toHaveLength(2);
  });

  it("credits only hit locate cards on success", () => {
    const q = buildMixLocateQuestion("loc:6:A", 3, new Map(), () => true, () => 0);
    const updates = locateCardUpdates(q, [{ string: 5, fret: 0 }, { string: 6, fret: 5 }], true, 4, 900);
    expect(updates.map((item) => item.cardId).sort()).toEqual(["loc:5:A", "loc:6:A"]);
    expect(updates.every((item) => item.correct)).toBe(true);
  });

  it("lapses the intended targets on fail", () => {
    const q = buildMixLocateQuestion("loc:6:A", 3, new Map(), () => true, () => 0);
    const updates = locateCardUpdates(q, [{ string: 6, fret: 1 }], false, 1, 8000);
    expect(updates.map((item) => item.cardId)).toEqual(q.targets);
    expect(updates.every((item) => !item.correct)).toBe(true);
  });

  it("ignores a miss on multi-note locate and keeps the current hits", () => {
    const q = buildMixLocateQuestion("loc:6:A", 3, new Map(), () => true, () => 0);
    const hit = { string: 6 as const, fret: 5 as const };
    const kept = applyLocateTap(q, [hit], { string: 6, fret: 1 });
    expect(kept).toEqual({ selected: [hit], ignored: true, done: false });
    const next = applyLocateTap(q, [hit], { string: 5, fret: 0 });
    expect(next.ignored).toBe(false);
    expect(next.done).toBe(true);
    expect(next.selected).toEqual([hit, { string: 5, fret: 0 }]);
  });

  it("still submits the first tap on find-one", () => {
    const q = buildLocateQuestion(6, "E", 1);
    expect(applyLocateTap(q, [], { string: 6, fret: 3 })).toEqual({
      selected: [{ string: 6, fret: 3 }],
      ignored: false,
      done: true,
    });
  });
});
