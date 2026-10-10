import { describe, expect, it } from "vitest";
import { locateAverageMs, locateTimeoutMs, rateIdentify, rateLocate, TIMEOUT_MS } from "./rating";

const eOpen = { string: 6 as const, fret: 0 as const };
const e12 = { string: 6 as const, fret: 12 as const };
const eWrong = { string: 6 as const, fret: 1 as const };
const a5 = { string: 6 as const, fret: 5 as const };
const aOpen = { string: 5 as const, fret: 0 as const };

describe("rateIdentify", () => {
  it("maps correctness and speed to FSRS grades on screen", () => {
    expect(rateIdentify(false, 800)).toBe(1);
    expect(rateIdentify(true, TIMEOUT_MS)).toBe(1);
    expect(rateIdentify(true, 4500)).toBe(2);
    expect(rateIdentify(true, 2500)).toBe(3);
    expect(rateIdentify(true, 1600)).toBe(4);
  });

  it("gives guitar-in-hand more time before counting as slow", () => {
    expect(rateIdentify(true, 3000, true)).toBe(4);
    expect(rateIdentify(true, 3000, false)).toBe(3);
    expect(rateIdentify(true, 5000, true)).toBe(3);
    expect(rateIdentify(true, 9000, true)).toBe(2);
  });
});

describe("rateLocate", () => {
  it("requires every selected fret to be correct", () => {
    expect(
      rateLocate({ selected: [eWrong], pool: [eOpen, e12], need: 2, elapsedMs: 1000 }),
    ).toEqual({
      rating: 1,
      correct: false,
      partial: false,
    });
  });

  it("treats a partial find-all set as Hard", () => {
    expect(
      rateLocate({
        selected: [eOpen],
        pool: [eOpen, e12],
        need: 2,
        elapsedMs: 1000,
        allowPartial: true,
      }),
    ).toEqual({
      rating: 2,
      correct: false,
      partial: true,
    });
  });

  it("accepts one hit when only one is needed", () => {
    expect(
      rateLocate({ selected: [e12], pool: [eOpen, e12], need: 1, elapsedMs: 2000 }),
    ).toEqual({
      rating: 4,
      correct: true,
      partial: false,
    });
  });

  it("times out as Again unless a find-all is partly done", () => {
    expect(
      rateLocate({
        selected: [eOpen, e12],
        pool: [eOpen, e12],
        need: 2,
        elapsedMs: locateTimeoutMs(2, false),
      }).rating,
    ).toBe(1);
    expect(
      rateLocate({
        selected: [eOpen],
        pool: [eOpen, e12],
        need: 2,
        elapsedMs: locateTimeoutMs(2, false),
        allowPartial: true,
      }),
    ).toEqual({
      rating: 2,
      correct: false,
      partial: true,
    });
  });

  it("rates a hunt on average time and allows the extra timeout", () => {
    expect(locateAverageMs(4000, 2)).toBe(2000);
    expect(
      rateLocate({ selected: [a5, aOpen], pool: [a5, aOpen], need: 2, elapsedMs: 4000 }),
    ).toEqual({
      rating: 4,
      correct: true,
      partial: false,
    });
    expect(locateTimeoutMs(2, false)).toBeGreaterThan(TIMEOUT_MS);
    expect(
      rateLocate({ selected: [a5, aOpen], pool: [a5, aOpen], need: 2, elapsedMs: TIMEOUT_MS + 100 }),
    ).toEqual({
      rating: 3,
      correct: true,
      partial: false,
    });
  });
});
