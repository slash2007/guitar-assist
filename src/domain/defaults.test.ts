import { describe, expect, it } from "vitest";
import { normalizeProfile, normalizeSession } from "./defaults";
import type { ActiveSession } from "./types";

describe("normalizeProfile", () => {
  it("starts new users at stage 1", () => {
    expect(normalizeProfile({}).stage).toBe(1);
    expect(normalizeProfile({ stage: 0 } as never).stage).toBe(1);
  });

  it("keeps spoken prompts on unless explicitly off", () => {
    expect(normalizeProfile({}).speechEnabled).toBe(true);
    expect(normalizeProfile({ speechEnabled: false }).speechEnabled).toBe(false);
  });

  it("keeps answer tones on unless explicitly off", () => {
    expect(normalizeProfile({}).answerSound).toBe(true);
    expect(normalizeProfile({ answerSound: false }).answerSound).toBe(false);
  });

  it("shows fret numbers unless explicitly hidden", () => {
    expect(normalizeProfile({}).showFretNumbers).toBe(true);
    expect(normalizeProfile({ showFretNumbers: false }).showFretNumbers).toBe(false);
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
