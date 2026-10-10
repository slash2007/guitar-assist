import { describe, expect, it } from "vitest";
import { rateIdentify, rateLocate, TIMEOUT_MS } from "./rating";

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
    expect(rateLocate({ selected: [1], answers: [0, 12], findOne: false, latencyMs: 1000 })).toEqual({
      rating: 1,
      correct: false,
      partial: false,
    });
  });

  it("treats a partial set as Hard", () => {
    expect(rateLocate({ selected: [0], answers: [0, 12], findOne: false, latencyMs: 1000 })).toEqual({
      rating: 2,
      correct: false,
      partial: true,
    });
  });

  it("accepts one hit in find-one mode", () => {
    expect(rateLocate({ selected: [12], answers: [0, 12], findOne: true, latencyMs: 2000 })).toEqual({
      rating: 4,
      correct: true,
      partial: false,
    });
  });

  it("times out as Again", () => {
    expect(rateLocate({ selected: [0, 12], answers: [0, 12], findOne: false, latencyMs: TIMEOUT_MS }).rating).toBe(1);
  });
});
