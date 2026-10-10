import { describe, expect, it } from "vitest";
import { identifyId } from "../domain/cards";
import { mulberry32 } from "../domain/rng";
import { applyRating, emptyFsrs } from "./fsrs";
import { buildReviewQueue, canPlace } from "./queue";

describe("fsrs wrapper", () => {
  it("schedules a later due date after an Easy review", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const next = applyRating(emptyFsrs(now), 4, now);
    expect(new Date(next.due).getTime()).toBeGreaterThan(now.getTime());
    expect(next.reps).toBe(1);
  });
});

describe("canPlace", () => {
  it("rejects the same fret within two cards", () => {
    expect(canPlace(identifyId(6, 3), [identifyId(5, 3), identifyId(6, 3)])).toBe(false);
    expect(canPlace(identifyId(6, 5), [identifyId(6, 3)])).toBe(true);
  });

  it("rejects adjacent frets on the same string", () => {
    expect(canPlace(identifyId(6, 4), [identifyId(6, 3)])).toBe(false);
  });
});

describe("buildReviewQueue", () => {
  it("introduces current-stage cards and keeps due first", () => {
    const now = new Date("2026-01-02T00:00:00.000Z");
    const dueId = identifyId(6, 0);
    const queue = buildReviewQueue({
      now,
      stage: 1,
      cards: new Map([
        [
          dueId,
          {
            id: dueId,
            fsrs: { ...emptyFsrs(new Date("2026-01-01T00:00:00.000Z")), reps: 2, due: "2026-01-01T00:00:00.000Z" },
          },
        ],
      ]),
      attempts: [],
      targetCount: 16,
      rng: mulberry32(3),
    });
    expect(queue.dueCount).toBe(1);
    expect(queue.questions[0]?.cardId).toBe(dueId);
    expect(queue.newCount).toBeGreaterThan(0);
    expect(queue.questions.length).toBeGreaterThan(8);
  });

  it("keeps a single-string stage on that string even if earlier strings are due", () => {
    const now = new Date("2026-01-02T00:00:00.000Z");
    const oldDue = identifyId(6, 0);
    const queue = buildReviewQueue({
      now,
      stage: 2,
      cards: new Map([
        [
          oldDue,
          {
            id: oldDue,
            fsrs: { ...emptyFsrs(new Date("2026-01-01T00:00:00.000Z")), reps: 4, due: "2026-01-01T00:00:00.000Z" },
          },
        ],
      ]),
      attempts: [],
      targetCount: 16,
      rng: mulberry32(3),
    });
    expect(queue.questions.every((item) => item.string === 5)).toBe(true);
    expect(queue.questions.some((item) => item.cardId === oldDue)).toBe(false);
  });

  it("brings earlier strings back once mix is unlocked", () => {
    const now = new Date("2026-01-02T00:00:00.000Z");
    const oldDue = identifyId(6, 0);
    const queue = buildReviewQueue({
      now,
      stage: 3,
      cards: new Map([
        [
          oldDue,
          {
            id: oldDue,
            fsrs: { ...emptyFsrs(new Date("2026-01-01T00:00:00.000Z")), reps: 4, due: "2026-01-01T00:00:00.000Z" },
          },
        ],
      ]),
      attempts: [],
      targetCount: 16,
      rng: mulberry32(3),
    });
    expect(queue.questions.some((item) => item.cardId === oldDue)).toBe(true);
    expect(new Set(queue.questions.map((item) => item.string))).toEqual(new Set([6, 5]));
    const hunts = queue.questions.filter((item) => item.kind === "locate");
    expect(hunts.length).toBeGreaterThan(0);
    expect(hunts.every((item) => item.strings.length === 2 && item.need >= 1 && item.need <= 3)).toBe(true);
  });

  it("skips cards already seen in this sitting", () => {
    const now = new Date("2026-01-02T00:00:00.000Z");
    const dueId = identifyId(6, 0);
    const queue = buildReviewQueue({
      now,
      stage: 1,
      cards: new Map([
        [
          dueId,
          {
            id: dueId,
            fsrs: { ...emptyFsrs(new Date("2026-01-01T00:00:00.000Z")), reps: 2, due: "2026-01-01T00:00:00.000Z" },
          },
        ],
      ]),
      attempts: [],
      targetCount: 16,
      rng: mulberry32(3),
      skip: new Set([dueId]),
    });
    expect(queue.dueCount).toBe(0);
    expect(queue.questions.some((item) => item.cardId === dueId)).toBe(false);
  });
});
