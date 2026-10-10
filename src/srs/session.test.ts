import { describe, expect, it } from "vitest";
import { identifyId } from "../domain/cards";
import { CHROMATIC_PITCHES, type ActiveSession } from "../domain/types";
import {
  clipSessionToStage,
  remainingLabel,
  shouldCompleteDaily,
  shouldEndSession,
  sessionProgress,
  sessionTimeUp,
} from "./session";

function session(patch: Partial<ActiveSession> = {}): ActiveSession {
  return {
    kind: "practice",
    startedAt: "2026-01-01T00:00:00.000Z",
    questionShownAt: "2026-01-01T00:00:00.000Z",
    durationMs: 6 * 60_000,
    questions: [
      {
        kind: "identify",
        cardId: identifyId(6, 0),
        string: 6,
        fret: 0,
        answer: "E",
        options: [...CHROMATIC_PITCHES],
      },
    ],
    index: 0,
    answered: 0,
    dueCount: 0,
    newIntroduced: 0,
    ...patch,
  };
}

describe("clipSessionToStage", () => {
  it("drops unanswered cards that are not in the current stage", () => {
    const mixed = session({
      questions: [
        {
          kind: "identify",
          cardId: identifyId(6, 0),
          string: 6,
          fret: 0,
          answer: "E",
          options: [...CHROMATIC_PITCHES],
        },
        {
          kind: "identify",
          cardId: identifyId(5, 0),
          string: 5,
          fret: 0,
          answer: "A",
          options: [...CHROMATIC_PITCHES],
        },
      ],
      index: 0,
    });
    const next = clipSessionToStage(mixed, 2);
    expect(next?.questions).toHaveLength(1);
    expect(next?.questions[0]?.string).toBe(5);
    expect(next?.questionShownAt).not.toBe(mixed.questionShownAt);
  });
});

describe("shouldEndSession", () => {
  it("ends only when the queue is exhausted and at least one item was answered", () => {
    expect(shouldEndSession(session({ index: 1, answered: 1 }))).toBe(true);
    expect(shouldEndSession(session({ index: 0, answered: 1 }))).toBe(false);
    expect(shouldEndSession(session({ index: 1, answered: 0 }))).toBe(false);
  });

  it("does not end when suggested time is up", () => {
    const current = session({
      startedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 60_000,
      index: 0,
      answered: 4,
    });
    const later = new Date("2026-01-01T00:10:00.000Z");
    expect(sessionTimeUp(current, later)).toBe(true);
    expect(sessionProgress(current, later)).toBe(1);
    expect(shouldEndSession(current)).toBe(false);
  });
});

describe("shouldCompleteDaily", () => {
  it("marks the day after any answers, without locking later sittings", () => {
    expect(shouldCompleteDaily(session({ answered: 3 }))).toBe(true);
    expect(shouldCompleteDaily(session({ answered: 0 }))).toBe(false);
  });
});

describe("remainingLabel", () => {
  it("shows answered count only", () => {
    expect(remainingLabel(session({ answered: 7 }), "zh")).toBe("已答 7 题");
    expect(remainingLabel(session({ answered: 7 }), "en")).toBe("7 done");
  });
});
