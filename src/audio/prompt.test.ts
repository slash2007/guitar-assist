import { describe, expect, it } from "vitest";
import { spokenFret, spokenPrompt, spokenString } from "./prompt";
import type { IdentifyQuestion, LocateQuestion } from "../domain/types";

const identify = (fret: IdentifyQuestion["fret"] = 3): IdentifyQuestion => ({
  kind: "identify",
  cardId: `id:6:${fret}`,
  string: 6,
  fret,
  answer: "G",
  options: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
});

const locate = (findOne: boolean): LocateQuestion => ({
  kind: "locate",
  cardId: "loc:6:G",
  string: 6,
  pitch: "G",
  answers: [3],
  findOne,
});

describe("spokenPrompt", () => {
  it("names string and fret in Chinese without the answer", () => {
    expect(spokenString(6, "zh")).toBe("六弦");
    expect(spokenFret(0, "zh")).toBe("空弦");
    expect(spokenFret(12, "zh")).toBe("十二品");
    expect(spokenPrompt(identify(3), "zh")).toBe("六弦，三品");
    expect(spokenPrompt(identify(0), "zh")).toBe("六弦，空弦");
  });

  it("asks to find the note in Chinese", () => {
    expect(spokenPrompt(locate(true), "zh")).toBe("六弦，找一个 G");
    expect(spokenPrompt(locate(false), "zh")).toBe("六弦，找齐 G");
  });

  it("uses short English prompts", () => {
    expect(spokenPrompt(identify(3), "en")).toBe("string 6, fret 3");
    expect(spokenPrompt(identify(0), "en")).toBe("string 6, open");
    expect(spokenPrompt(locate(true), "en")).toBe("string 6, find one G");
    expect(spokenPrompt(locate(false), "en")).toBe("string 6, find every G");
  });
});
