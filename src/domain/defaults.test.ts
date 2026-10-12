import { describe, expect, it } from "vitest";
import { detectLocale } from "../i18n/locale";
import { normalizeProfile, normalizeSession } from "./defaults";
import type { ActiveSession } from "./types";

describe("normalizeProfile", () => {
  it("starts new users at stage 1", () => {
    expect(normalizeProfile({}).stage).toBe(1);
    expect(normalizeProfile({ stage: 0 } as never).stage).toBe(1);
  });

  it("defaults all setting toggles off", () => {
    const next = normalizeProfile({});
    expect(next.guitarInHand).toBe(false);
    expect(next.speechEnabled).toBe(false);
    expect(next.answerSound).toBe(false);
    expect(next.lefty).toBe(false);
    expect(next.showFretNumbers).toBe(false);
    expect(next.introSeen).toBe(false);
  });

  it("follows the browser locale when none is saved", () => {
    expect(normalizeProfile(null).locale).toBe(detectLocale());
    expect(normalizeProfile({}).locale).toBe(detectLocale());
    expect(normalizeProfile({ locale: "zh" }).locale).toBe("zh");
    expect(normalizeProfile({ locale: "en" }).locale).toBe("en");
  });

  it("keeps a toggle on only when it was saved on", () => {
    expect(normalizeProfile({ speechEnabled: true }).speechEnabled).toBe(true);
    expect(normalizeProfile({ answerSound: true }).answerSound).toBe(true);
    expect(normalizeProfile({ showFretNumbers: true }).showFretNumbers).toBe(true);
  });
});

describe("normalizeSession", () => {
  const base = {
    startedAt: new Date().toISOString(),
    questionShownAt: new Date().toISOString(),
    durationMs: 360000,
    questions: [{ kind: "identify", cardId: "id:6:0", string: 6, fret: 0, answer: "E", options: [] }],
    index: 0,
    answered: 0,
    dueCount: 0,
    newIntroduced: 0,
  } as unknown as ActiveSession;

  it("drops leftover placement sessions", () => {
    expect(normalizeSession({ ...base, kind: "placement" as never })).toBeNull();
  });

  it("treats old review sessions as practice", () => {
    const next = normalizeSession({ ...base, kind: "review" as never });
    expect(next?.kind).toBe("practice");
  });

  it("migrates old single-string locate questions", () => {
    const next = normalizeSession({
      ...base,
      questions: [
        {
          kind: "locate",
          cardId: "loc:6:E",
          string: 6,
          pitch: "E",
          answers: [0, 12],
          findOne: false,
        } as never,
      ],
    });
    expect(next?.questions[0]).toMatchObject({
      kind: "locate",
      need: 2,
      strings: [6],
      pool: [
        { string: 6, fret: 0 },
        { string: 6, fret: 12 },
      ],
    });
  });
});
