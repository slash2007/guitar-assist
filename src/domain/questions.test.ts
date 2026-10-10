import { describe, expect, it } from "vitest";
import { buildIdentifyQuestion, buildLocateQuestion } from "./questions";

describe("questions", () => {
  it("lists all twelve chromatic pitches as identify options", () => {
    const q = buildIdentifyQuestion(6, 3);
    expect(q.answer).toBe("G");
    expect(q.options).toEqual(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
  });

  it("lists every legal fret for a locate card", () => {
    const q = buildLocateQuestion(6, "E", 4);
    expect(q.answers).toEqual([0, 12]);
    expect(q.findOne).toBe(false);
    expect(buildLocateQuestion(6, "E", 1).findOne).toBe(true);
  });
});
